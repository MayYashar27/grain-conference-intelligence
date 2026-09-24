/**
 * Deterministic duplicate detection (no LLM). Combines several conservative
 * signals so name-variant near-duplicates (e.g. "AFP Annual Conference" vs
 * "AFP 2026 Finance & Treasury Conference") are caught, while genuinely
 * different conferences are preserved.
 *
 * Hard gate: same event YEAR. Different years are different editions, never dupes.
 * Then a match on ANY of: shared distinctive acronym · strong multi-token name
 * overlap · shared official domain + same city · same city+country + near dates.
 */
import type { Conference } from '../../src/types/conference.js';

/** Uppercase tokens that are geographic/generic, not event-identifying acronyms. */
const GENERIC_ACRONYMS = new Set([
  'USA', 'US', 'UK', 'EU', 'EMEA', 'APAC', 'MENA', 'UAE', 'LATAM', 'AI', 'B2B', 'ID', 'IT',
]);

/** Tokens dropped before name comparison (edition/format noise). */
const STOP_TOKENS = new Set([
  'the', 'a', 'an', 'and', 'of', 'for', 'conference', 'summit', 'forum', 'expo',
  'show', 'event', 'annual', 'world', 'global', 'international', 'congress',
  'meeting', 'week', 'days', 'day', 'edition',
]);

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, ' ') // drop explicit years
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function contentTokens(name: string): string[] {
  return normalizeName(name)
    .split(' ')
    .filter((t) => t && !STOP_TOKENS.has(t));
}

function acronyms(originalName: string): Set<string> {
  const set = new Set<string>();
  for (const tok of originalName.split(/[^A-Za-z0-9]+/)) {
    if (/^[A-Z]{2,6}$/.test(tok) && !GENERIC_ACRONYMS.has(tok)) set.add(tok);
  }
  return set;
}

/** Overlap (containment) coefficient: |A∩B| / min(|A|,|B|). */
function overlapCoefficient(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const inter = a.filter((t) => setB.has(t)).length;
  return inter / Math.min(a.length, b.length);
}

function registrableDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const parts = host.split('.');
    return parts.length >= 2 ? parts.slice(-2).join('.') : host;
  } catch {
    return null;
  }
}

function domainsOf(c: DedupRecord): Set<string> {
  const set = new Set<string>();
  const primary = registrableDomain(c.url);
  if (primary) set.add(primary);
  for (const s of c.sources ?? []) {
    const d = registrableDomain(s);
    if (d) set.add(d);
  }
  return set;
}

function year(iso: string): number {
  return Number((iso || '').slice(0, 4));
}

function daysBetween(a: string, b: string): number {
  const ms = Math.abs(
    new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime(),
  );
  return Number.isFinite(ms) ? ms / 86_400_000 : Infinity;
}

function eq(a?: string | null, b?: string | null): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Minimal shape needed to compare two conferences. Extra fields sharpen matching. */
export interface DedupRecord {
  name: string;
  startDate: string;
  url?: string | null;
  sources?: string[];
  city?: string;
  country?: string;
}

export function isDuplicate(a: DedupRecord, b: DedupRecord): boolean {
  // Hard gate: only same-year events can be duplicates.
  const ya = year(a.startDate);
  if (!ya || ya !== year(b.startDate)) return false;

  // 1. Shared distinctive acronym (AFP, MPE, …) in the same year.
  const aAcr = acronyms(a.name);
  for (const x of acronyms(b.name)) if (aAcr.has(x)) return true;

  // 2. Strong multi-token name overlap in the same year.
  const at = contentTokens(a.name);
  const bt = contentTokens(b.name);
  if (overlapCoefficient(at, bt) >= 0.7 && Math.min(at.length, bt.length) >= 2) return true;

  // 3. Shared official domain AND same city (guards brand multi-events, e.g. USA vs Europe).
  const ad = domainsOf(a);
  const bd = domainsOf(b);
  let sharedDomain = false;
  for (const d of ad) if (bd.has(d)) { sharedDomain = true; break; }
  if (sharedDomain && eq(a.city, b.city)) return true;

  // 4. Same city + country + near-identical dates.
  if (eq(a.city, b.city) && eq(a.country, b.country) && daysBetween(a.startDate, b.startDate) <= 10) {
    return true;
  }

  return false;
}

/** Remove candidates duplicating an existing conference or an earlier candidate. */
export function filterDuplicates(candidates: Conference[], existing: DedupRecord[]): Conference[] {
  const kept: Conference[] = [];
  for (const c of candidates) {
    const record: DedupRecord = {
      name: c.name,
      startDate: c.startDate,
      url: c.url,
      sources: c.sources,
      city: c.city,
      country: c.country,
    };
    if (existing.some((e) => isDuplicate(record, e))) continue; // exists in DB
    if (kept.some((k) => isDuplicate(record, { name: k.name, startDate: k.startDate, url: k.url, sources: k.sources, city: k.city, country: k.country }))) {
      continue; // duplicate within this batch
    }
    kept.push(c);
  }
  return kept;
}
