/**
 * Deterministic "conference context for today" logic (pure, testable).
 * A conference counts as today's context only when it is marked Attending AND
 * today falls within its date range. Not-attending / undecided never count.
 */

export interface ContextConference {
  id: string;
  attendanceStatus: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

function isISO(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Local today as YYYY-MM-DD. */
export function localToday(): string {
  const n = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}

/**
 * Conferences that form today's capture context: Attending, with today within
 * [startDate, endDate]. Returns them in start-date order.
 */
export function conferencesToday<T extends ContextConference>(
  conferences: T[],
  todayISO: string,
): T[] {
  return conferences
    .filter(
      (c) =>
        c.attendanceStatus === 'attending' &&
        isISO(c.startDate) &&
        isISO(c.endDate) &&
        c.startDate <= todayISO &&
        c.endDate >= todayISO,
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}
