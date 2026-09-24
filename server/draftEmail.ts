/**
 * Draft a follow-up email for a lead (server-side; the only Gemini call here).
 * Runs ONLY when the salesperson clicks "Draft follow-up email" — never on load.
 * The email is grounded strictly in known context (contact, enriched role/company
 * research, conference context, interaction notes, relationship state). The model
 * is explicitly forbidden from inventing conversations, pain points, commitments
 * or buying intent. The salesperson reviews/edits the draft; nothing is sent.
 */
import { GoogleGenAI, Type } from '@google/genai';
import { getServiceClient, ServiceConfigError } from './supabaseService.js';
import { analyzeRelationship } from '../src/lib/relationship.js';
import { buildDraftContext, type DraftInteraction } from '../src/lib/emailDraft.js';
import type { LeadResearch } from '../src/types/research.js';

export interface HandlerResult {
  status: number;
  body: unknown;
}

// Lightweight drafting — no web research needed. Prefer a fast model if one is
// configured; otherwise fall back to the structuring model, then the base model.
const MODEL =
  process.env.GEMINI_DRAFT_MODEL || process.env.GEMINI_STRUCTURE_MODEL || process.env.GEMINI_MODEL || 'gemini-3.6-flash';

class DraftConfigError extends Error {}

function getAI(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new DraftConfigError('Email drafting is not configured on the server (missing GEMINI_API_KEY).');
  }
  return new GoogleGenAI({ apiKey: key });
}

const EMAIL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING, description: 'A short, specific subject line.' },
    body: { type: Type.STRING, description: 'A short email body, 3–5 sentences, plain text.' },
  },
  required: ['subject', 'body'],
};

export async function handleDraftEmail(rawBody: unknown): Promise<HandlerResult> {
  const b = (typeof rawBody === 'object' && rawBody ? rawBody : {}) as Record<string, unknown>;
  const contactId = typeof b.contactId === 'string' ? b.contactId.trim() : '';
  if (!contactId) return { status: 400, body: { error: 'Contact id is required.' } };

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    if (e instanceof ServiceConfigError) return { status: 503, body: { error: e.message } };
    throw e;
  }

  const [contactRes, interRes, researchRes] = await Promise.all([
    client.from('contacts').select('*').eq('id', contactId).maybeSingle(),
    client.from('interactions').select('*').eq('contact_id', contactId),
    client.from('lead_research').select('research').eq('contact_id', contactId).maybeSingle(),
  ]);
  if (contactRes.error || !contactRes.data) {
    return { status: 404, body: { error: 'Contact not found.' } };
  }
  const contact = contactRes.data as { full_name: string; company: string };
  const interactionRows = (interRes.data as { note: string | null; conference_id: string | null; occurred_at: string }[]) ?? [];
  const research = (researchRes.data?.research as LeadResearch | undefined) ?? null;

  // Conference names for context (best-effort).
  const confIds = [...new Set(interactionRows.map((i) => i.conference_id).filter((x): x is string => !!x))];
  const confNames = new Map<string, string>();
  if (confIds.length) {
    const cf = await client.from('conferences').select('id, name').in('id', confIds);
    for (const row of (cf.data as { id: string; name: string }[]) ?? []) confNames.set(row.id, row.name);
  }

  const relationship = analyzeRelationship(
    interactionRows.map((i) => ({ occurredAt: i.occurred_at, note: i.note })),
    new Date().toISOString(),
  );
  const interactions: DraftInteraction[] = interactionRows.map((i) => ({
    note: i.note,
    conferenceName: i.conference_id ? confNames.get(i.conference_id) ?? null : null,
    occurredAt: i.occurred_at,
  }));

  const { facts } = buildDraftContext({
    fullName: contact.full_name,
    company: contact.company,
    research,
    relationship,
    interactions,
  });

  const prompt = `Write a SHORT sales follow-up email from a Grain salesperson.
Grain provides FX and cross-border payment infrastructure for businesses.

CONTEXT — the only things you know (use what's useful, ignore the rest):
${facts.map((f) => `- ${f}`).join('\n')}

RULES:
- 3–5 short sentences. This is a quick personal follow-up, NOT a marketing email.
- Lead with the recipient's first name and, if a conference is in the context, that you met there.
- Use the most recent note if it's useful; do NOT dump research or list their tech stack.
- Do NOT explain Grain at length or make invented claims (no fabricated meetings, pain points,
  commitments or buying intent). If context is thin, keep it a simple friendly check-in.
- No placeholder text like "[Name]". End with "Best,\\nThe Grain team".
Return JSON: { "subject": ..., "body": ... }`;

  let ai: GoogleGenAI;
  try {
    ai = getAI();
  } catch (e) {
    if (e instanceof DraftConfigError) return { status: 503, body: { error: e.message } };
    throw e;
  }

  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: EMAIL_SCHEMA,
        temperature: 0.4,
        // Generous ceiling so the JSON is never truncated (thinking tokens count
        // toward this too). Brevity is enforced by the prompt, not this cap.
        maxOutputTokens: 2048,
      },
    });
    const parsed = JSON.parse(res.text ?? '{}') as { subject?: string; body?: string };
    const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : '';
    const bodyText = typeof parsed.body === 'string' ? parsed.body.trim() : '';
    if (!subject && !bodyText) {
      return { status: 502, body: { error: 'Draft came back empty. Please try again.' } };
    }
    return { status: 200, body: { subject, body: bodyText } };
  } catch (err) {
    console.error('[draft-email] gemini error:', err);
    return { status: 502, body: { error: 'Could not draft the email. Please try again.' } };
  }
}
