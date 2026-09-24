/**
 * Lead research orchestrator (server-only). Pipeline:
 *   contact + internal interaction history
 *     → deterministic relationship (stage/momentum)   [internal, no AI]
 *     → Gemini grounded public research (person + company)
 *     → deterministic validation (evidence-first)
 *     → persist (lead_research) and return.
 * Scoring/relationship interpretation stays deterministic; Gemini only researches
 * public facts. GEMINI_API_KEY and the service-role key stay server-side.
 */
import { getServiceClient, ServiceConfigError } from './supabaseService.js';
import { analyzeRelationship, type RelInteraction } from '../src/lib/relationship.js';
import { runLeadResearch, GeminiConfigError, GeminiError } from './research/gemini.js';
import { validatePublicResearch } from './research/validate.js';

export interface HandlerResult {
  status: number;
  body: unknown;
}

interface InteractionRow {
  conference_id: string | null;
  company_name_at_time: string;
  note: string | null;
  occurred_at: string;
}

function fmtDay(iso: string): string {
  return typeof iso === 'string' ? iso.slice(0, 10) : '';
}

export async function handleResearchLead(rawBody: unknown): Promise<HandlerResult> {
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

  // ── Load contact + interactions (internal) ──────────────────────────────────
  const contactRes = await client.from('contacts').select('*').eq('id', contactId).maybeSingle();
  if (contactRes.error) return { status: 500, body: { error: 'Could not load the contact.' } };
  if (!contactRes.data) return { status: 404, body: { error: 'Contact not found.' } };
  const contact = contactRes.data as { full_name: string; company: string; email: string | null };

  const intRes = await client
    .from('interactions')
    .select('conference_id, company_name_at_time, note, occurred_at')
    .eq('contact_id', contactId)
    .order('occurred_at', { ascending: false });
  const interactions = (intRes.data as InteractionRow[]) ?? [];

  // Conference names for readable internal context.
  const confIds = [...new Set(interactions.map((i) => i.conference_id).filter((x): x is string => !!x))];
  const confNames = new Map<string, string>();
  if (confIds.length) {
    const cRes = await client.from('conferences').select('id, name').in('id', confIds);
    for (const c of (cRes.data as { id: string; name: string }[]) ?? []) confNames.set(c.id, c.name);
  }

  // ── Deterministic relationship (internal history only) ──────────────────────
  const relInteractions: RelInteraction[] = interactions.map((i) => ({
    occurredAt: i.occurred_at,
    note: i.note,
  }));
  const relationship = analyzeRelationship(relInteractions, new Date().toISOString());

  const internalSummary = [
    `Relationship (computed from internal history): stage=${relationship.stage}, momentum=${relationship.momentum}.`,
    interactions.length ? 'Interactions (most recent first):' : 'No prior interactions recorded.',
    ...interactions.map(
      (i) =>
        `- ${fmtDay(i.occurred_at)} · ${i.conference_id ? confNames.get(i.conference_id) ?? 'Conference' : 'Direct / non-conference'} · ${i.company_name_at_time} — ${
          i.note ? `"${i.note}"` : 'no note'
        }`,
    ),
  ].join('\n');

  // ── Gemini public research ──────────────────────────────────────────────────
  let raw;
  try {
    ({ raw } = await runLeadResearch({
      fullName: contact.full_name,
      company: contact.company,
      email: contact.email,
      internalSummary,
    }));
  } catch (err) {
    if (err instanceof GeminiConfigError) return { status: 503, body: { error: err.message } };
    if (err instanceof GeminiError) {
      console.error('[research] gemini error:', err.message);
      return { status: 502, body: { error: 'Research failed. Please try again.' } };
    }
    console.error('[research] unexpected error:', err);
    return { status: 500, body: { error: 'Unexpected error during research.' } };
  }

  // ── Validate + assemble ─────────────────────────────────────────────────────
  const publicResearch = validatePublicResearch(raw);
  const research = {
    researchedAt: new Date().toISOString(),
    ...publicResearch,
    relationship,
  };

  // ── Persist (one row per contact; refresh replaces it) ──────────────────────
  const upsert = await client
    .from('lead_research')
    .upsert(
      {
        contact_id: contactId,
        research,
        researched_at: research.researchedAt,
        updated_at: research.researchedAt,
      },
      { onConflict: 'contact_id' },
    )
    .select('*')
    .single();
  if (upsert.error) {
    console.error('[research] persist failed:', upsert.error);
    return { status: 500, body: { error: 'Research completed but could not be saved.' } };
  }

  return { status: 200, body: upsert.data };
}
