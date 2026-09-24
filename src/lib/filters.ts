import type { Conference, Region, Tier, Vertical } from '../types/conference';
import { parseISO } from './format';
import { scoreConference, type ScoreResult } from './scoring';

export interface ScoredConference extends Conference {
  result: ScoreResult;
}

export interface FilterState {
  query: string;
  vertical: Vertical | 'all';
  region: Region | 'all';
  month: number | 'all';
  tiers: Tier[];
}

export type SortKey = 'fit' | 'date' | 'name';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'fit', label: 'Fit score (high → low)' },
  { key: 'date', label: 'Date (soonest first)' },
  { key: 'name', label: 'Name (A → Z)' },
];

export const EMPTY_FILTERS: FilterState = {
  query: '',
  vertical: 'all',
  region: 'all',
  month: 'all',
  tiers: [],
};

export function scoreAll(conferences: Conference[]): ScoredConference[] {
  return conferences.map((c) => ({ ...c, result: scoreConference(c) }));
}

export function isFilterActive(f: FilterState): boolean {
  return (
    f.query.trim() !== '' ||
    f.vertical !== 'all' ||
    f.region !== 'all' ||
    f.month !== 'all' ||
    f.tiers.length > 0
  );
}

export function applyFilters(
  scored: ScoredConference[],
  filters: FilterState,
  sort: SortKey,
): ScoredConference[] {
  const q = filters.query.trim().toLowerCase();

  const filtered = scored.filter((c) => {
    if (q) {
      const haystack = `${c.name} ${c.city} ${c.country} ${c.vertical}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.vertical !== 'all' && c.vertical !== filters.vertical) return false;
    if (filters.region !== 'all' && c.region !== filters.region) return false;
    if (filters.month !== 'all' && parseISO(c.startDate).getMonth() !== filters.month) {
      return false;
    }
    if (filters.tiers.length > 0) {
      if (!c.result.tier || !filters.tiers.includes(c.result.tier)) return false;
    }
    return true;
  });

  return sortConferences(filtered, sort);
}

function sortConferences(list: ScoredConference[], sort: SortKey): ScoredConference[] {
  const copy = [...list];
  switch (sort) {
    case 'fit':
      // Highest fit first; unscored conferences sink to the bottom.
      copy.sort((a, b) => {
        const av = a.result.score ?? -1;
        const bv = b.result.score ?? -1;
        if (bv !== av) return bv - av;
        return a.startDate.localeCompare(b.startDate);
      });
      break;
    case 'date':
      copy.sort((a, b) => a.startDate.localeCompare(b.startDate));
      break;
    case 'name':
      copy.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }
  return copy;
}
