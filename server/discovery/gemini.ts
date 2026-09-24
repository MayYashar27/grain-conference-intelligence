/**
 * Gemini discovery — the only place GEMINI_API_KEY is read. Runs entirely
 * server-side (Vercel function / dev middleware); the key never reaches the
 * browser.
 *
 * Two passes, matching the retrieval → analysis → structured-output pipeline:
 *   1. Grounded search (Google Search + URL context) gathers real public
 *      evidence and source URLs.
 *   2. Structured output converts that evidence into strict JSON (responseSchema).
 * Search grounding and strict responseSchema can't be combined in one call, so
 * separating them is both necessary and cleaner.
 */
import { GoogleGenAI } from '@google/genai';
import {
  GRAIN_CONTEXT,
  DIMENSION_GUIDE,
  describeFilters,
  type DiscoveryFilters,
} from './businessContext';
import { DISCOVERY_RESPONSE_SCHEMA, type RawCandidate } from './schema';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
// Pass 2 (structuring) does NO grounding — it only reformats pass-1's already-
// grounded text into JSON. It can therefore safely run on a faster model without
// touching evidence quality. Defaults to MODEL, so behavior is unchanged unless a
// faster structuring model is explicitly configured.
const STRUCTURE_MODEL = process.env.GEMINI_STRUCTURE_MODEL || MODEL;
// Ask for a slightly larger set (6) than we aim to display (~4–5): the small
// buffer absorbs candidates lost to validation and to dedup against events we
// already have — without reverting to the slower 8-candidate search. The Pass-1
// prompt also excludes known conferences so more of these are net-new.
// Overridable via GEMINI_MAX_CANDIDATES if broader coverage is worth the latency.
export const MAX_CANDIDATES = Number(process.env.GEMINI_MAX_CANDIDATES) || 6;

/** Missing configuration (no API key) — surfaced as a clean 503 to the client. */
export class GeminiConfigError extends Error {}
/** The model call failed or returned unusable output. */
export class GeminiError extends Error {}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError(
      'Discovery is not configured on the server (missing GEMINI_API_KEY).',
    );
  }
  return new GoogleGenAI({ apiKey });
}

function searchPrompt(filters: DiscoveryFilters, existingNames: string[]): string {
  const excludeBlock = existingNames.length
    ? `

ALREADY IN OUR LIST — do NOT return any of these, and do NOT return a different
edition (e.g. another year) of the same event. Find DIFFERENT, net-new upcoming
conferences instead:
${existingNames.map((n) => `- ${n}`).join('\n')}`
    : '';
  return `You are a research assistant for Grain's sales team.

${GRAIN_CONTEXT}

TASK: Using web search, find up to ${MAX_CANDIDATES} REAL, upcoming (future-dated)
conferences that best match Grain's needs and that are NOT already in our existing
conference list below. Optional constraints from the user:
${describeFilters(filters)}${excludeBlock}

For each conference, research and note, citing the official conference website
wherever possible:
- exact name, start and end dates, city, country
- who attends (company types) and which senior roles attend
- agenda themes (especially payments, cross-border, FX, treasury, money movement)
- any structured networking (matchmaking, hosted meetings, 1:1 meeting tools)
- audience size if officially stated
- the official URL and any other supporting source URLs

${DIMENSION_GUIDE}

Rules:
- Do NOT return any conference in the "ALREADY IN OUR LIST" section above, nor
  another edition of one. Prioritize genuinely new events we do not already track.
- Only include conferences you can support with real public sources. Do not invent
  events, dates, attendees, agendas or networking features.
- Prefer official conference pages over aggregators.
- Only state audience size, dates and location if a source supports them. If
  audience size is not stated by a source, say it is unknown — do not estimate.
- For each of the four dimensions, gather the concrete evidence (who attends, which
  roles, agenda topics, networking format) needed to classify it against the rubric.`;
}

function structurePrompt(analysis: string): string {
  return `Convert the research below into JSON matching the provided schema.

${DIMENSION_GUIDE}

STRICT RULES:
- Use ONLY information supported by the research. Do not add new facts.
- CLASSIFY each dimension: if the research contains evidence for a dimension, assign
  a rubric score (100/75/50/25/0) reflecting how strongly that evidence supports fit.
  Use null for a dimension ONLY when the research has essentially no evidence for it.
  Do NOT return null just because the research lacked a number — you assign the number.
- For factual metadata (dates, city, country, official_url): use null when the
  research does not explicitly support it.
- For audience_size, set value only if a source explicitly states the figure and
  record that source statement in audience_size.evidence; otherwise value = null
  and evidence = null. Never estimate audience size.
- region must be one of: North America, Europe, Middle East, Asia-Pacific,
  Latin America, Africa (or null). vertical must be one of: Payments, Fintech,
  Treasury & Finance, Travel, E-commerce & Marketplaces, Technology & SaaS (or null).
- Include real source URLs in "sources"; prefer the official site.
- Return at most ${MAX_CANDIDATES} candidates.

RESEARCH:
${analysis}`;
}

/** Run the two-pass discovery and return raw (unvalidated) candidates.
 * `existingNames` are the conferences we already track — they are injected into
 * the Pass-1 prompt so the model targets net-new events (dedup still runs after). */
export async function runGeminiDiscovery(
  filters: DiscoveryFilters,
  existingNames: string[] = [],
): Promise<{
  candidates: RawCandidate[];
  groundingUrls: string[];
}> {
  const ai = getClient();

  // Pass 1 — grounded search. (Timing is logged to compare the two passes.)
  let analysis: string;
  let groundingUrls: string[] = [];
  const t0 = Date.now();
  try {
    const searchRes = await ai.models.generateContent({
      model: MODEL,
      contents: searchPrompt(filters, existingNames),
      config: {
        tools: [{ googleSearch: {} }, { urlContext: {} }],
        temperature: 0.3,
      },
    });
    analysis = searchRes.text ?? '';
    const chunks = searchRes.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    groundingUrls = chunks
      .map((c) => c?.web?.uri)
      .filter((u): u is string => typeof u === 'string');
  } catch (err) {
    throw new GeminiError(`Grounded search failed: ${errText(err)}`);
  }
  const t1 = Date.now();

  if (!analysis.trim()) {
    throw new GeminiError('The discovery search returned no usable content.');
  }

  // Pass 2 — structured output.
  try {
    const structRes = await ai.models.generateContent({
      model: STRUCTURE_MODEL,
      contents: structurePrompt(analysis),
      config: {
        responseMimeType: 'application/json',
        responseSchema: DISCOVERY_RESPONSE_SCHEMA,
        temperature: 0,
      },
    });
    const text = structRes.text ?? '';
    const parsed = JSON.parse(text) as { candidates?: RawCandidate[] };
    const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    const t2 = Date.now();
    console.log(
      `[discover] timing: grounded-search=${t1 - t0}ms structured-output=${t2 - t1}ms total=${t2 - t0}ms`,
    );
    return { candidates: candidates.slice(0, MAX_CANDIDATES), groundingUrls };
  } catch (err) {
    throw new GeminiError(`Structuring failed: ${errText(err)}`);
  }
}

export interface EnrichTarget {
  name: string;
  startDate: string;
  endDate: string;
  city: string;
  country: string;
  url: string | null;
}

function enrichSearchPrompt(t: EnrichTarget): string {
  return `You are a research assistant for Grain's sales team.

${GRAIN_CONTEXT}

TASK: Using web search, research THIS ONE specific, real conference and gather
public evidence about it:
- Name: ${t.name}
- Dates: ${t.startDate} to ${t.endDate}
- Location: ${t.city}, ${t.country}
${t.url ? `- Official URL: ${t.url}` : '- Official URL: (find it)'}

Research and note, citing the official conference website wherever possible:
- who attends (company types) and which senior roles attend
- agenda themes (especially payments, cross-border, FX, treasury, money movement)
- any structured networking (matchmaking, hosted meetings, 1:1 meeting tools)
- audience size if officially stated
- the official URL and any other supporting source URLs

${DIMENSION_GUIDE}

Rules:
- Research the SPECIFIC conference named above. Do not substitute a different event.
- Only state facts you can support with real public sources. Do not invent
  attendees, agendas, networking features or audience size. If something is not
  supported by a source, say it is unknown.
- For each of the four dimensions, gather the concrete evidence needed to classify
  it against the rubric.`;
}

function enrichStructurePrompt(analysis: string): string {
  return `Convert the research below into JSON matching the provided schema, as a
"candidates" array containing EXACTLY ONE object (the conference that was researched).

${DIMENSION_GUIDE}

STRICT RULES:
- Use ONLY information supported by the research. Do not add new facts.
- CLASSIFY each dimension: if the research contains evidence for a dimension, assign
  a rubric score (100/75/50/25/0). Use null for a dimension ONLY when the research
  has essentially no evidence for it. Do NOT return null just because the research
  lacked a number.
- For audience_size, set value only if a source explicitly states the figure and
  record that statement in audience_size.evidence; otherwise value = null and
  evidence = null. Never estimate.
- Include real source URLs in "sources"; prefer the official site.

RESEARCH:
${analysis}`;
}

/** Research ONE known conference; returns a single raw candidate (or null). */
export async function runGeminiEnrichment(target: EnrichTarget): Promise<{
  candidate: RawCandidate | null;
  groundingUrls: string[];
}> {
  const ai = getClient();

  let analysis: string;
  let groundingUrls: string[] = [];
  const t0 = Date.now();
  try {
    const searchRes = await ai.models.generateContent({
      model: MODEL,
      contents: enrichSearchPrompt(target),
      config: { tools: [{ googleSearch: {} }, { urlContext: {} }], temperature: 0.3 },
    });
    analysis = searchRes.text ?? '';
    const chunks = searchRes.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    groundingUrls = chunks.map((c) => c?.web?.uri).filter((u): u is string => typeof u === 'string');
  } catch (err) {
    throw new GeminiError(`Enrichment search failed: ${errText(err)}`);
  }
  const t1 = Date.now();

  if (!analysis.trim()) {
    throw new GeminiError('The enrichment search returned no usable content.');
  }

  try {
    const structRes = await ai.models.generateContent({
      model: STRUCTURE_MODEL,
      contents: enrichStructurePrompt(analysis),
      config: {
        responseMimeType: 'application/json',
        responseSchema: DISCOVERY_RESPONSE_SCHEMA,
        temperature: 0,
      },
    });
    const text = structRes.text ?? '';
    const parsed = JSON.parse(text) as { candidates?: RawCandidate[] };
    const candidate = Array.isArray(parsed.candidates) && parsed.candidates.length > 0
      ? parsed.candidates[0]
      : null;
    const t2 = Date.now();
    console.log(
      `[enrich] timing: grounded-search=${t1 - t0}ms structured-output=${t2 - t1}ms total=${t2 - t0}ms`,
    );
    return { candidate, groundingUrls };
  } catch (err) {
    throw new GeminiError(`Enrichment structuring failed: ${errText(err)}`);
  }
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
