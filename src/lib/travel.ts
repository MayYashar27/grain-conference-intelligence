import type { Region } from '../types/conference';

/**
 * Travel Region — a broad, deterministic grouping used for trip clustering.
 * Intentionally coarse: no maps, coordinates, or distance APIs. North and
 * Latin America share one "Americas" group. Change the mapping here only.
 */
export type TravelRegion = 'Europe' | 'Americas' | 'Asia-Pacific' | 'Middle East' | 'Africa';

const REGION_TO_TRAVEL: Record<Region, TravelRegion> = {
  'North America': 'Americas',
  'Latin America': 'Americas',
  Europe: 'Europe',
  'Asia-Pacific': 'Asia-Pacific',
  'Middle East': 'Middle East',
  Africa: 'Africa',
};

/**
 * Map a conference region to a Travel Region. Returns null when the region is
 * unknown/unmappable — such conferences are never forced into a trip cluster.
 */
export function travelRegionFor(region: Region | null): TravelRegion | null {
  if (!region) return null;
  return REGION_TO_TRAVEL[region] ?? null;
}
