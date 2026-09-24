import type { Conference } from '../types/conference';

/**
 * Client-side discovery service. Talks only to the server endpoint (/api/discover);
 * the Gemini key lives server-side. Candidates come back already validated,
 * deduped and app-shaped (status "discovered") — the UI scores them with the
 * existing engine and never persists them until a human approves.
 */

export interface DiscoveryFilters {
  region?: string;
  vertical?: string;
  dateFrom?: string;
  dateTo?: string;
  keywords?: string;
}

/** A discovery candidate is a Conference with status "discovered" (not persisted). */
export type DiscoveredConference = Conference;

/** Run a discovery pass. Returns a curated shortlist of candidates. */
export async function runDiscovery(
  filters: DiscoveryFilters,
): Promise<DiscoveredConference[]> {
  let res: Response;
  try {
    res = await fetch('/api/discover', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(filters),
    });
  } catch {
    throw new Error('Network error — could not reach discovery.');
  }

  const json = (await res.json().catch(() => null)) as
    | { candidates?: unknown; error?: string }
    | null;

  if (!res.ok) {
    throw new Error(json?.error || 'Discovery failed. Please try again.');
  }

  const rawCandidates = Array.isArray(json?.candidates) ? json.candidates : [];
  // The server returns app-shaped (camelCase) candidates; guard the shape.
  return rawCandidates.filter(
    (c): c is Conference => !!c && typeof c === 'object' && 'name' in c,
  );
}
