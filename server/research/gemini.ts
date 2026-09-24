/**
 * Gemini lead research — grounded person + company research. Server-only
 * (GEMINI_API_KEY never reaches the client). Same two-pass pattern as discovery:
 *   1. Google Search grounding gathers public evidence + source URLs.
 *   2. Structured output converts it to strict JSON (responseSchema).
 * Evidence-first: the prompts forbid fabrication and make "insufficient evidence"
 * a valid answer. Relationship stage/momentum are computed elsewhere (internal).
 */
import { GoogleGenAI } from '@google/genai';
import { GRAIN_CONTEXT } from '../discovery/businessContext.js';
import { RESEARCH_RESPONSE_SCHEMA, type RawResearch } from './schema.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

export class GeminiConfigError extends Error {}
export class GeminiError extends Error {}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError('Research is not configured on the server (missing GEMINI_API_KEY).');
  }
  return new GoogleGenAI({ apiKey });
}

export interface ResearchInput {
  fullName: string;
  company: string;
  email: string | null;
  /** Formatted internal interaction history + computed stage/momentum. */
  internalSummary: string;
}

function searchPrompt(input: ResearchInput): string {
  return `You are a research assistant for Grain's sales team.

${GRAIN_CONTEXT}

RESEARCH TARGET
Person: ${input.fullName}
Company: ${input.company}
${input.email ? `Email: ${input.email}` : ''}

TASK: Using web search, research this PERSON and their COMPANY from public sources.
Work at the company level even if the person cannot be confidently identified.

Gather, with sources (prefer the company's own site, then vendor/partner
announcements, then reputable business sources):
1. Person: current job title and any confidently-identifying professional context.
   Only propose a LinkedIn profile if public evidence (name + current company +
   consistent context) makes you confident it is THIS person. If unsure, say so —
   do not guess a LinkedIn URL.
2. Company: official website, what it does, business category/model, markets.
3. Grain-relevant signals: cross-border activity, multi-currency, payment
   processing, PSP/payment infrastructure, marketplaces/platforms, travel payments,
   treasury, FX exposure, international payouts.
4. Financial-technology maturity: evidence of how the company approaches financial/
   payment technology (payment/treasury platforms, fintech partnerships, finance
   automation, reconciliation, fraud/risk, payment APIs, cross-border/multi-currency
   tech). Do NOT treat modern as good or legacy as bad. Only call something
   manual/legacy if there is ACTUAL evidence; absence of evidence is "insufficient".
5. Existing/adjacent solutions: named vendors/platforms/partnerships, what each is
   used for, and whether it overlaps with Grain (cross-currency/FX/cross-border) or
   is merely adjacent/general fintech. Do NOT call every fintech vendor a competitor.
6. Buying/business signals: only defensible, evidence-backed changes (market
   expansion, new payment infrastructure, fintech partnerships, treasury change,
   relevant hiring/launches).

HARD RULES:
- Evidence first. No evidence => say it is unknown/insufficient. Never invent
  vendors, titles, LinkedIn URLs, FX exposure, customers, or buying intent.
- "Could not find evidence" is NOT "the company does not use it."
- Cite real source URLs.

Return a concise, source-referenced briefing. We will structure it afterwards.`;
}

function structurePrompt(analysis: string, input: ResearchInput): string {
  return `Convert the research below into JSON matching the schema.

STRICT RULES:
- Use ONLY facts supported by the research. Do not add new facts. Prefer null and
  "insufficient_evidence" over guessing.
- linkedin_url: null unless the research strongly identifies THIS person
  (name + company). Set linkedin_status accordingly.
- financial_tech_maturity.level: use "manual_legacy" ONLY with explicit evidence;
  otherwise "insufficient_evidence". Never infer legacy from missing evidence.
- existing_stack.relation: classify honestly (competitor_overlapping only when the
  vendor clearly overlaps Grain's cross-currency/FX/cross-border space).
- icp_fit: relevance of company + person to Grain (NOT likelihood to buy). Use
  insufficient_evidence when the public evidence is thin.
- sales_motion: the most appropriate TYPE of conversation given the evidence, not a
  prediction of purchase. Use insufficient_evidence rather than forcing one.
- suggested_next_step: ONE concise, specific step that references the strongest
  evidence AND the internal relationship context below. If evidence is insufficient
  for a specific step, return null (do NOT write generic advice like "reach out").
- SOURCES ARE REQUIRED for public claims: every grain_signals item, every
  existing_stack vendor, and every buying_signals item MUST include a real source
  URL that supports it. If you cannot cite a source for an item, OMIT that item
  entirely rather than stating it unsourced. Named vendors especially must be
  source-backed — do not list a vendor you cannot cite.
- sources: real URLs actually supporting the claims.

INTERNAL RELATIONSHIP CONTEXT (from Grain's own interaction history — use it to
shape suggested_next_step, but do not treat it as public web evidence):
${input.internalSummary}

PUBLIC RESEARCH:
${analysis}`;
}

export async function runLeadResearch(
  input: ResearchInput,
): Promise<{ raw: RawResearch; groundingUrls: string[] }> {
  const ai = getClient();

  let analysis: string;
  let groundingUrls: string[] = [];
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: searchPrompt(input),
      config: { tools: [{ googleSearch: {} }, { urlContext: {} }], temperature: 0.3 },
    });
    analysis = res.text ?? '';
    const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    groundingUrls = chunks
      .map((c) => c?.web?.uri)
      .filter((u): u is string => typeof u === 'string');
  } catch (err) {
    throw new GeminiError(`Grounded research failed: ${errText(err)}`);
  }

  if (!analysis.trim()) throw new GeminiError('Research returned no usable content.');

  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: structurePrompt(analysis, input),
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESEARCH_RESPONSE_SCHEMA,
        temperature: 0,
      },
    });
    const parsed = JSON.parse(res.text ?? '{}') as RawResearch;
    return { raw: parsed, groundingUrls };
  } catch (err) {
    throw new GeminiError(`Structuring failed: ${errText(err)}`);
  }
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
