/**
 * Deterministic Planning summary — replaces the old geography-focused "coverage
 * opportunities". Pure logic (no LLM), answers three planning questions:
 *   • Are we attending enough?  (the counts)
 *   • Are there important periods with no coverage?  (month, relevant but none attending)
 *   • Which undecided conferences can efficiently become one trip?  (undecided + trip)
 * Only genuinely useful attention items are surfaced — no alert per month/region.
 */
import type { AttendanceStatus } from '../types/conference';

export interface SummaryInput {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  attendance: AttendanceStatus;
  /** Strong or Good Fit (tier A/B). */
  relevant: boolean;
}

export interface AttentionItem {
  id: string;
  text: string;
  /** A suggested trip is available for this item (link it in the UI). */
  hasTrip: boolean;
  /** Index of the specific suggested trip this item points to (for "See trips"). */
  tripIndex?: number;
}

export interface PlanningSummary {
  counts: { attending: number; undecided: number; notAttending: number };
  items: AttentionItem[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Quiet thresholds so we only flag meaningful gaps.
const MIN_UNDECIDED_TOTAL = 3;
const MIN_MONTH_RELEVANT = 2; // for a "period with no attending coverage"
const MIN_MONTH_UNDECIDED = 3; // for a "lots still undecided this month"

function validISO(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * @param tripUndecidedCounts number of Undecided stops in each suggested trip
 *        (used to say "N of them can be combined into one suggested trip").
 */
export function buildPlanningSummary(
  items: SummaryInput[],
  nowISO: string,
  tripUndecidedCounts: number[] = [],
): PlanningSummary {
  const today = nowISO.slice(0, 10);
  const upcoming = items.filter((i) => validISO(i.startDate) && validISO(i.endDate) && i.endDate >= today);

  const counts = {
    attending: upcoming.filter((i) => i.attendance === 'attending').length,
    undecided: upcoming.filter((i) => i.attendance === 'undecided').length,
    notAttending: upcoming.filter((i) => i.attendance === 'not_attending').length,
  };

  const items_: AttentionItem[] = [];

  // 1) Undecided backlog, and whether a suggested trip can absorb some of them.
  //    Point "See trips" at the trip that groups the most undecided conferences.
  let maxTripUndecided = 0;
  let bestTripIndex = -1;
  tripUndecidedCounts.forEach((n, i) => {
    if (n > maxTripUndecided) {
      maxTripUndecided = n;
      bestTripIndex = i;
    }
  });
  if (counts.undecided >= MIN_UNDECIDED_TOTAL) {
    let text = `${counts.undecided} conferences are still undecided.`;
    let hasTrip = false;
    let tripIndex: number | undefined;
    if (maxTripUndecided >= 2) {
      text += ` ${maxTripUndecided} of them can be combined into one suggested trip.`;
      hasTrip = true;
      tripIndex = bestTripIndex >= 0 ? bestTripIndex : undefined;
    }
    items_.push({ id: 'undecided', text, hasTrip, tripIndex });
  }

  // 2) & 3) Month-level gaps among RELEVANT (Strong/Good Fit) upcoming conferences.
  const relevantPool = upcoming.filter((i) => i.relevant && i.attendance !== 'not_attending');
  const byMonth = new Map<string, SummaryInput[]>();
  for (const i of relevantPool) {
    const key = i.startDate.slice(0, 7);
    (byMonth.get(key) ?? byMonth.set(key, []).get(key)!).push(i);
  }

  const monthItems: (AttentionItem & { severity: number })[] = [];
  for (const [ym, list] of byMonth) {
    const attending = list.filter((i) => i.attendance === 'attending').length;
    const undecided = list.filter((i) => i.attendance === 'undecided').length;
    const [year, mm] = ym.split('-');
    const label = `${MONTHS[Number(mm) - 1] ?? ym} ${year}`;
    if (list.length >= MIN_MONTH_RELEVANT && attending === 0) {
      // A period with real relevance but no committed coverage — the strongest signal.
      monthItems.push({
        id: `m-${ym}`,
        text: `${label} has ${list.length} Strong/Good Fit conferences, but none are currently marked Attending.`,
        hasTrip: false,
        severity: 1000 + list.length,
      });
    } else if (undecided >= MIN_MONTH_UNDECIDED) {
      monthItems.push({
        id: `m-${ym}`,
        text: `${label} has ${undecided} relevant conferences still undecided.`,
        hasTrip: false,
        severity: undecided,
      });
    }
  }
  monthItems.sort((a, b) => b.severity - a.severity);
  for (const m of monthItems.slice(0, 3)) items_.push({ id: m.id, text: m.text, hasTrip: m.hasTrip });

  return { counts, items: items_.slice(0, 4) };
}
