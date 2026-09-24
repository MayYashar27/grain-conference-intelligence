/**
 * Deterministic validation of raw Gemini candidates. Structured output guarantees
 * shape, not truth — this enforces types, ranges, sane dates, real URLs, drops
 * placeholders, and keeps genuinely-unknown values null. Output is app-shaped
 * (Conference, status "discovered"); scores/tier are computed later by the
 * existing engine. Evidence confidence is DERIVED here from evidence completeness
 * (a transparent rule) rather than trusting the model's self-assessment.
 */
import type {
  Conference,
  DimensionAssessment,
  DimensionKey,
  EvidenceConfidence,
  Region,
  Vertical,
} from '../../src/types/conference.js';
import type { RawCandidate, RawDimension } from './schema.js';

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
const RAW_TO_KEY: Record<string, DimensionKey> = {
  company_fit: 'companyFit',
  buyer_fit: 'buyerFit',
  agenda_relevance: 'agendaRelevance',
  networking_opportunity: 'networking',
};
const PLACEHOLDER = /\b(example|placeholder|lorem|tbd|test conference|unknown)\b/i;

export function isValidUrl(u: unknown): u is string {
  // Reject reserved example domains (RFC 2606) as fabricated placeholders.
  return (
    typeof u === 'string' &&
    /^https?:\/\/.+\..+/i.test(u) &&
    !/(^|\.)example\.(com|org|net)(\/|$|:)/i.test(u)
  );
}

function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime());
}

/** Local current date as YYYY-MM-DD, for string comparison against ISO dates. */
function todayISO(): string {
  const n = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}

/** Snap a numeric score to the nearest rubric anchor; anything else → null. */
function normalizeScore(v: unknown): DimensionAssessment['score'] {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const snapped = Math.max(0, Math.min(100, Math.round(n / 25) * 25));
  return snapped as DimensionAssessment['score'];
}

function cleanSignals(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((s) => s.slice(0, 60));
}

export function toDimension(raw: RawDimension | undefined): DimensionAssessment {
  const score = normalizeScore(raw?.score);
  return {
    score,
    signals: score === null ? [] : cleanSignals(raw?.signals),
    evidence: typeof raw?.evidence === 'string' ? raw.evidence.trim().slice(0, 600) : '',
  };
}

/** Transparent confidence rule: completeness of evidence, not model "feeling". */
export function deriveConfidence(
  dims: Record<DimensionKey, DimensionAssessment>,
  sourceCount: number,
): EvidenceConfidence {
  const assessed = (Object.values(dims) as DimensionAssessment[]).filter(
    (d) => d.score !== null,
  ).length;
  if (assessed >= 3 && sourceCount >= 1) return 'high';
  if (assessed >= 2) return 'medium';
  return 'low';
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

/**
 * Validate + normalize raw candidates into discovery-ready Conference objects.
 * A candidate's credibility rests on ITS OWN sources (official URL + model-cited
 * URLs) — run-level grounding URLs are not attributed to individual candidates.
 */
export function validateCandidates(raw: RawCandidate[]): Conference[] {
  const out: Conference[] = [];

  for (const c of raw) {
    if (!c || typeof c !== 'object') continue;

    const name = typeof c.name === 'string' ? c.name.trim() : '';
    if (name.length < 4 || PLACEHOLDER.test(name)) continue;

    // A candidate must be date-anchored to be useful for sales triage.
    if (!isIsoDate(c.start_date)) continue;
    const startDate = c.start_date as string;
    const endDate = isIsoDate(c.end_date) && (c.end_date as string) >= startDate
      ? (c.end_date as string)
      : startDate;

    // Future-event backstop: discovery is for upcoming conferences, so drop any
    // whose end date is already in the past. Events currently in progress
    // (end date today or later) are kept. This is deterministic, not the LLM.
    if (endDate < todayISO()) continue;

    // Reject implausible far-future years (hallucinations).
    const year = Number(startDate.slice(0, 4));
    const nowYear = new Date().getFullYear();
    if (year > nowYear + 5) continue;

    const dimensions = {
      companyFit: toDimension(c.dimensions?.company_fit),
      buyerFit: toDimension(c.dimensions?.buyer_fit),
      agendaRelevance: toDimension(c.dimensions?.agenda_relevance),
      networking: toDimension(c.dimensions?.networking_opportunity),
    } as Record<DimensionKey, DimensionAssessment>;

    const officialUrl = isValidUrl(c.official_url) ? c.official_url : null;

    // Sources must include at least one credible URL of this candidate's own.
    const rawSources = Array.isArray(c.sources) ? c.sources : [];
    const sources = [...new Set([officialUrl, ...rawSources].filter(isValidUrl))].slice(0, 8);
    if (sources.length === 0) continue;

    const region =
      typeof c.location?.region === 'string' && REGIONS.includes(c.location.region.trim())
        ? (c.location.region.trim() as Region)
        : null;
    const vertical =
      typeof c.vertical === 'string' && VERTICALS.includes(c.vertical.trim())
        ? (c.vertical.trim() as Vertical)
        : null;

    // Audience size is kept ONLY when the model tied it to explicit source
    // evidence. An unsourced/estimated number is treated as unknown (null).
    // Audience size is informational and never feeds the Fit Score.
    let audienceSize: number | null = null;
    const audEvidence = c.audience_size?.evidence;
    if (typeof audEvidence === 'string' && audEvidence.trim().length > 0) {
      const a = Number(c.audience_size?.value);
      if (Number.isFinite(a) && a > 0 && a < 10_000_000) audienceSize = Math.round(a);
    }

    out.push({
      id: `disc-${slugify(name)}-${Math.random().toString(16).slice(2, 8)}`,
      name: name.slice(0, 160),
      startDate,
      endDate,
      city: typeof c.location?.city === 'string' ? c.location.city.trim().slice(0, 80) : '',
      country:
        typeof c.location?.country === 'string' ? c.location.country.trim().slice(0, 80) : '',
      region,
      vertical,
      audienceSize,
      url: officialUrl,
      description: '',
      status: 'discovered',
      attendanceStatus: 'undecided',
      source: null,
      sources,
      evidenceConfidence: deriveConfidence(dimensions, sources.length),
      dimensions,
      isSeed: false,
      addedManually: false,
    });

    if (out.length >= 8) break;
  }

  return out;
}
