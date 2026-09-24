/**
 * Discovery orchestrator (server-side): filters → grounded Gemini search →
 * structured output → deterministic validation → deterministic dedup vs existing
 * Conferences → candidates. No scoring or DB writes happen here; scoring is the
 * client's existing engine and persistence only happens on human Approve.
 */
import type { DiscoveryFilters } from './discovery/businessContext.js';
import { runGeminiDiscovery, MAX_CANDIDATES, GeminiConfigError, GeminiError } from './discovery/gemini.js';
import { validateCandidates } from './discovery/validate.js';
import { filterDuplicates, type DedupRecord } from './discovery/dedup.js';
import { getServiceClient, ServiceConfigError } from './supabaseService.js';

export interface HandlerResult {
  status: number;
  body: unknown;
}

const ALLOWED_REGIONS = new Set([
  'North America',
  'Europe',
  'Middle East',
  'Asia-Pacific',
  'Latin America',
  'Africa',
]);
const ALLOWED_VERTICALS = new Set([
  'Payments',
  'Fintech',
  'Treasury & Finance',
  'Travel',
  'E-commerce & Marketplaces',
  'Technology & SaaS',
]);

function str(v: unknown, max = 120): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

/** Sanitize the optional filters from the request body. */
function parseFilters(raw: unknown): DiscoveryFilters {
  const b = (typeof raw === 'object' && raw ? raw : {}) as Record<string, unknown>;
  const region = str(b.region);
  const vertical = str(b.vertical);
  const iso = (v: unknown) => {
    const s = str(v, 10);
    return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  };
  return {
    region: region && ALLOWED_REGIONS.has(region) ? region : null,
    vertical: vertical && ALLOWED_VERTICALS.has(vertical) ? vertical : null,
    dateFrom: iso(b.dateFrom),
    dateTo: iso(b.dateTo),
    keywords: str(b.keywords, 200),
  };
}

async function fetchExisting(): Promise<DedupRecord[]> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('conferences')
      .select('name, start_date, city, country, url, sources');
    if (error || !data) return [];
    return data.map((r) => ({
      name: r.name as string,
      startDate: r.start_date as string,
      city: (r.city as string) ?? undefined,
      country: (r.country as string) ?? undefined,
      url: (r.url as string) ?? null,
      sources: Array.isArray(r.sources) ? (r.sources as string[]) : [],
    }));
  } catch {
    // Dedup is best-effort; if we can't read existing rows, still return candidates.
    return [];
  }
}

export async function handleDiscover(rawBody: unknown): Promise<HandlerResult> {
  const filters = parseFilters(rawBody);

  // Fetch what we already track FIRST, so we can (a) tell the model to skip these
  // in Pass 1 (fewer wasted slots on events we already have) and (b) still dedup
  // against them afterwards as a safety layer — the prompt is guidance, not a guarantee.
  const existing = await fetchExisting();

  let raw;
  try {
    ({ candidates: raw } = await runGeminiDiscovery(filters, existing.map((e) => e.name)));
  } catch (err) {
    if (err instanceof GeminiConfigError || err instanceof ServiceConfigError) {
      return { status: 503, body: { error: err.message } };
    }
    if (err instanceof GeminiError) {
      console.error('[discover] gemini error:', err.message);
      return { status: 502, body: { error: 'Discovery failed. Please try again.' } };
    }
    console.error('[discover] unexpected error:', err);
    return { status: 500, body: { error: 'Unexpected error during discovery.' } };
  }

  const validated = validateCandidates(raw);
  const candidates = filterDuplicates(validated, existing);

  // Lightweight funnel logging so a normal run can be evaluated without any extra
  // paid Gemini calls: requested → found → validated → deduped → displayed.
  console.log(
    `[discover] funnel: requested=${MAX_CANDIDATES} found=${raw.length} ` +
      `validated=${validated.length} deduped=${candidates.length} displayed=${candidates.length}`,
  );

  return { status: 200, body: { candidates } };
}
