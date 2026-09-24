/**
 * Conference enrichment (server-side). Researches ONE existing conference with
 * the same public-web/Gemini pipeline used by discovery, then persists ONLY
 * grounded evidence: dimensions, sources, evidence confidence, and any metadata
 * (region/vertical/audience/description) that was still unknown. Fit Score/Tier
 * are NOT stored — they stay deterministic, computed from the dimensions.
 *
 * Identity fields (name, dates, city, country, url) are user-owned and never
 * overwritten by enrichment. Unsupported fields remain null (evidence-first).
 */
import { getServiceClient, ServiceConfigError } from './supabaseService.js';
import {
  runGeminiEnrichment,
  GeminiConfigError,
  GeminiError,
  type EnrichTarget,
} from './discovery/gemini.js';
import { toDimension, deriveConfidence, isValidUrl } from './discovery/validate.js';
import type { RawCandidate } from './discovery/schema.js';
import type { DimensionAssessment, DimensionKey } from '../src/types/conference.js';

export interface HandlerResult {
  status: number;
  body: unknown;
}

const REGIONS = ['North America', 'Europe', 'Middle East', 'Asia-Pacific', 'Latin America', 'Africa'];
const VERTICALS = ['Payments', 'Fintech', 'Treasury & Finance', 'Travel', 'E-commerce & Marketplaces', 'Technology & SaaS'];

function str(v: unknown, max = 80): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/** Build the DB patch (research fields only) from a raw enrichment candidate. */
function buildPatch(c: RawCandidate, existing: Record<string, unknown>): Record<string, unknown> {
  const dimensions: Record<DimensionKey, DimensionAssessment> = {
    companyFit: toDimension(c.dimensions?.company_fit),
    buyerFit: toDimension(c.dimensions?.buyer_fit),
    agendaRelevance: toDimension(c.dimensions?.agenda_relevance),
    networking: toDimension(c.dimensions?.networking_opportunity),
  };

  const officialUrl = isValidUrl(c.official_url) ? c.official_url : null;
  const existingUrl = typeof existing.url === 'string' ? existing.url : null;
  const rawSources = Array.isArray(c.sources) ? c.sources : [];
  const sources = [...new Set([existingUrl, officialUrl, ...rawSources].filter(isValidUrl))].slice(0, 8);

  const patch: Record<string, unknown> = {
    dimensions,
    sources,
    evidence_confidence: deriveConfidence(dimensions, sources.length),
    source: 'Public web research',
  };

  // Fill metadata only where the user left it unknown, and only with grounded values.
  if (!existing.region) {
    const r = str(c.location?.region, 40);
    if (REGIONS.includes(r)) patch.region = r;
  }
  if (!existing.vertical) {
    const v = str(c.vertical, 40);
    if (VERTICALS.includes(v)) patch.vertical = v;
  }
  if (existing.audience_size == null) {
    const audEvidence = c.audience_size?.evidence;
    if (typeof audEvidence === 'string' && audEvidence.trim()) {
      const a = Number(c.audience_size?.value);
      if (Number.isFinite(a) && a > 0 && a < 10_000_000) patch.audience_size = Math.round(a);
    }
  }
  return patch;
}

export async function handleEnrichConference(rawBody: unknown): Promise<HandlerResult> {
  const b = (typeof rawBody === 'object' && rawBody ? rawBody : {}) as Record<string, unknown>;
  const id = str(b.id ?? b.conferenceId, 120);
  if (!id) return { status: 400, body: { error: 'Conference id is required.' } };

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    if (e instanceof ServiceConfigError) return { status: 503, body: { error: e.message } };
    throw e;
  }

  const cur = await client.from('conferences').select('*').eq('id', id).maybeSingle();
  if (cur.error) {
    console.error('[enrich] load failed:', cur.error);
    return { status: 500, body: { error: 'Could not load the conference.' } };
  }
  if (!cur.data) return { status: 404, body: { error: 'Conference not found.' } };
  const existing = cur.data as Record<string, unknown>;

  const target: EnrichTarget = {
    name: String(existing.name ?? ''),
    startDate: String(existing.start_date ?? ''),
    endDate: String(existing.end_date ?? ''),
    city: String(existing.city ?? ''),
    country: String(existing.country ?? ''),
    url: (existing.url as string | null) ?? null,
  };

  let candidate: RawCandidate | null;
  try {
    ({ candidate } = await runGeminiEnrichment(target));
  } catch (err) {
    if (err instanceof GeminiConfigError) return { status: 503, body: { error: err.message } };
    if (err instanceof GeminiError) {
      console.error('[enrich] gemini error:', err.message);
      return { status: 502, body: { error: 'Enrichment failed. Please try again.' } };
    }
    console.error('[enrich] unexpected error:', err);
    return { status: 500, body: { error: 'Unexpected error during enrichment.' } };
  }

  if (!candidate) {
    return { status: 502, body: { error: 'Enrichment returned no usable evidence.' } };
  }

  const patch = buildPatch(candidate, existing);
  const upd = await client.from('conferences').update(patch).eq('id', id).select('*').single();
  if (upd.error) {
    console.error('[enrich] update failed:', upd.error);
    return { status: 500, body: { error: 'Could not save enrichment.' } };
  }
  return { status: 200, body: upd.data };
}
