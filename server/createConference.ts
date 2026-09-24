/**
 * Server-side conference creation.
 *
 * This module runs ONLY on the server — the Vercel function (api/conferences.ts)
 * in production, and the Vite dev middleware locally. It is the single place the
 * Supabase service-role key is used; that key bypasses Row Level Security to
 * perform the insert the public anon key is not permitted to do.
 *
 * The service key is read from process.env and never reaches the browser bundle.
 * This same server boundary is where future secret API calls (AI discovery,
 * enrichment, HubSpot) will live.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface HandlerResult {
  status: number;
  body: unknown;
}

const REGIONS = [
  'North America',
  'Europe',
  'Middle East',
  'Asia-Pacific',
  'Latin America',
  'Africa',
];
const VERTICALS = [
  'Payments',
  'Fintech',
  'Treasury & Finance',
  'Travel',
  'E-commerce & Marketplaces',
  'Technology & SaaS',
];
const CONFIDENCE = ['high', 'medium', 'low'];
const DIMENSION_KEYS = ['companyFit', 'buyerFit', 'agendaRelevance', 'networking'];
const SCORE_VALUES = [0, 25, 50, 75, 100];

let cachedClient: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ConfigError(
      'Server is not configured for writes (missing SUPABASE_SERVICE_ROLE_KEY).',
    );
  }
  if (!cachedClient) {
    cachedClient = createClient(url, key, { auth: { persistSession: false } });
  }
  return cachedClient;
}

class ConfigError extends Error {}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'conference'
  );
}

function randomSuffix(): string {
  return Math.random().toString(16).slice(2, 8);
}

/** Validate a raw request body and normalize it into a database row. */
function buildRow(raw: unknown): { row?: Record<string, unknown>; error?: string } {
  if (typeof raw !== 'object' || raw === null) return { error: 'Invalid request body.' };
  const b = raw as Record<string, unknown>;

  const name = str(b.name);
  if (!name) return { error: 'Name is required.' };
  if (name.length > 160) return { error: 'Name is too long.' };

  const startDate = str(b.startDate);
  const endDate = str(b.endDate);
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(startDate)) return { error: 'A valid start date is required.' };
  if (!dateRe.test(endDate)) return { error: 'A valid end date is required.' };
  if (endDate < startDate) return { error: 'End date cannot be before the start date.' };

  const city = str(b.city);
  const country = str(b.country);
  if (!city) return { error: 'City is required.' };
  if (!country) return { error: 'Country is required.' };
  if (city.length > 80 || country.length > 80) return { error: 'City/country is too long.' };

  // Region and vertical are optional; empty => not specified (null).
  const region = str(b.region);
  if (region && !REGIONS.includes(region)) return { error: 'Invalid region.' };
  const vertical = str(b.vertical);
  if (vertical && !VERTICALS.includes(vertical)) return { error: 'Invalid vertical.' };

  // Evidence confidence is optional; a manually added conference is unscored
  // until enriched, so it defaults to null rather than an invented value.
  const confidenceRaw = str(b.evidenceConfidence);
  if (confidenceRaw && !CONFIDENCE.includes(confidenceRaw)) {
    return { error: 'Invalid evidence confidence.' };
  }
  const confidence = confidenceRaw || null;

  let audienceSize: number | null = null;
  if (b.audienceSize !== null && b.audienceSize !== undefined && b.audienceSize !== '') {
    const n = Number(b.audienceSize);
    if (!Number.isFinite(n) || n < 0 || n > 10_000_000) {
      return { error: 'Audience size is invalid.' };
    }
    audienceSize = Math.round(n);
  }

  const url = str(b.url);
  if (url && !/^https?:\/\//i.test(url)) return { error: 'URL must start with http(s)://.' };
  if (url.length > 300) return { error: 'URL is too long.' };

  const description = str(b.description).slice(0, 2000);
  const source = str(b.source).slice(0, 200) || null;

  // Optional source URLs (from AI discovery grounding). Keep only valid http(s).
  const sources = Array.isArray(b.sources)
    ? b.sources
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim())
        .filter((s) => /^https?:\/\//i.test(s) && s.length <= 500)
        .slice(0, 12)
    : [];

  // Origin: manual add (default) vs an approved AI discovery.
  const addedManually = b.addedManually === false ? false : true;

  // Dimensions: each key must be present with a valid (or null) score and clean signals.
  const rawDims =
    typeof b.dimensions === 'object' && b.dimensions !== null
      ? (b.dimensions as Record<string, unknown>)
      : {};
  const dimensions: Record<string, { score: number | null; signals: string[]; evidence: string }> =
    {};
  for (const key of DIMENSION_KEYS) {
    const d = (rawDims[key] ?? {}) as Record<string, unknown>;
    let score: number | null = null;
    if (d.score !== null && d.score !== undefined) {
      const n = Number(d.score);
      if (!SCORE_VALUES.includes(n)) return { error: `Invalid score for ${key}.` };
      score = n;
    }
    const signals = Array.isArray(d.signals)
      ? d.signals
          .filter((s): s is string => typeof s === 'string')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 8)
          .map((s) => s.slice(0, 60))
      : [];
    const evidence = str(d.evidence).slice(0, 600);
    dimensions[key] = { score, signals, evidence };
  }

  const row = {
    id: `${slugify(name)}-${randomSuffix()}`,
    name,
    start_date: startDate,
    end_date: endDate,
    city,
    country,
    region: region || null,
    vertical: vertical || null,
    audience_size: audienceSize,
    url: url || null,
    description,
    status: 'approved',
    source,
    sources,
    evidence_confidence: confidence,
    dimensions,
    is_seed: false,
    added_manually: addedManually,
  };

  return { row };
}

export async function handleCreateConference(rawBody: unknown): Promise<HandlerResult> {
  const { row, error } = buildRow(rawBody);
  if (error || !row) return { status: 400, body: { error: error ?? 'Invalid request.' } };

  let client: SupabaseClient;
  try {
    client = getServiceClient();
  } catch (e) {
    if (e instanceof ConfigError) return { status: 503, body: { error: e.message } };
    throw e;
  }

  const { data, error: dbError } = await client
    .from('conferences')
    .insert(row)
    .select('*')
    .single();

  if (dbError) {
    console.error('[conferences] insert failed:', dbError);
    return { status: 500, body: { error: 'Could not save the conference.' } };
  }

  return { status: 201, body: data };
}
