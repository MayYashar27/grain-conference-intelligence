/**
 * Deterministic trip clustering. Pure logic over lightweight inputs (dates,
 * travel region, attendance) — no maps, APIs, LLM, or heavy imports, so it is
 * directly unit-testable.
 *
 * Rules (see product spec):
 *  - exclude Not-attending conferences entirely (they cannot bridge a trip)
 *  - only cluster within the same Travel Region
 *  - gap = previous END date → next START date; clusters allow gaps ≤ 7 days,
 *    measured against the running latest end date so overlaps/back-to-back work
 *  - a Trip needs ≥ 2 conferences. It may be all-Undecided (a SUGGESTED trip) or
 *    contain Attending anchors (add nearby undecided ones to an existing plan) —
 *    `attendingCount` lets the UI distinguish the two.
 */
import type { AttendanceStatus } from '../types/conference';

export const MAX_GAP_DAYS = 7;

export interface TripInput {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  travelRegion: string | null;
  attendance: AttendanceStatus;
}

export interface TripStopRef {
  id: string;
  /** Whole days from the previous stop's END to this stop's START; null for the first. */
  gapDays: number | null;
}

export interface TripCluster {
  travelRegion: string;
  startDate: string;
  endDate: string;
  stops: TripStopRef[];
  attendingCount: number;
  /** How many stops are still undecided — the "could be added" conferences.
   * The display copy is built name-aware in the UI (TripCard). */
  undecidedCount: number;
}

function isValidISO(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  return Number.isFinite(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

/** Whole days from a → b (b minus a). Negative when b precedes a (overlap). */
export function gapDaysBetween(aEnd: string, bStart: string): number {
  return Math.round((toUTC(bStart) - toUTC(aEnd)) / 86_400_000);
}

function makeCluster(travelRegion: string, group: TripInput[]): TripCluster | null {
  if (group.length < 2) return null;
  // No Attending anchor is required: a group of 2+ nearby undecided conferences
  // is itself a useful SUGGESTED trip. Not-attending is already excluded upstream.
  const attendingCount = group.filter((g) => g.attendance === 'attending').length;

  const undecidedCount = group.filter((g) => g.attendance === 'undecided').length;
  const stops: TripStopRef[] = group.map((g, i) => ({
    id: g.id,
    gapDays: i === 0 ? null : gapDaysBetween(group[i - 1].endDate, g.startDate),
  }));
  const startDate = group[0].startDate;
  const endDate = group.reduce((max, g) => (g.endDate > max ? g.endDate : max), group[0].endDate);

  return {
    travelRegion,
    startDate,
    endDate,
    stops,
    attendingCount,
    undecidedCount,
  };
}

/** Build all trip clusters from the given inputs. */
export function buildTripClusters(items: TripInput[]): TripCluster[] {
  const eligible = items.filter(
    (i) =>
      i.attendance !== 'not_attending' &&
      i.travelRegion !== null &&
      isValidISO(i.startDate) &&
      isValidISO(i.endDate) &&
      i.endDate >= i.startDate,
  );

  // Group by travel region.
  const byRegion = new Map<string, TripInput[]>();
  for (const item of eligible) {
    const key = item.travelRegion as string;
    const arr = byRegion.get(key);
    if (arr) arr.push(item);
    else byRegion.set(key, [item]);
  }

  const clusters: TripCluster[] = [];
  for (const [region, list] of byRegion) {
    const sorted = [...list].sort(
      (a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate),
    );

    let group: TripInput[] = [];
    let runningEnd = '';
    const flush = () => {
      const cluster = makeCluster(region, group);
      if (cluster) clusters.push(cluster);
      group = [];
      runningEnd = '';
    };

    for (const conf of sorted) {
      if (group.length === 0) {
        group = [conf];
        runningEnd = conf.endDate;
        continue;
      }
      // Gap measured against the running latest end so overlaps/back-to-back join.
      const gap = gapDaysBetween(runningEnd, conf.startDate);
      if (gap <= MAX_GAP_DAYS) {
        group.push(conf);
        if (conf.endDate > runningEnd) runningEnd = conf.endDate;
      } else {
        flush();
        group = [conf];
        runningEnd = conf.endDate;
      }
    }
    flush();
  }

  clusters.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return clusters;
}
