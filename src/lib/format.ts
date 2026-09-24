import type { Conference, EvidenceConfidence } from '../types/conference';

/** Parse an ISO date (YYYY-MM-DD) as a local date, avoiding UTC off-by-one. */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "14–16 Oct 2026" or "29 Sep – 1 Oct 2026" across month/year boundaries. */
export function formatDateRange(startISO: string, endISO: string): string {
  const start = parseISO(startISO);
  const end = parseISO(endISO);

  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS_SHORT[start.getMonth()]} ${start.getFullYear()}`;
  }
  if (sameYear) {
    return `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`;
}

export function monthLabelLong(monthIndex: number): string {
  return MONTHS_LONG[monthIndex] ?? '';
}

export function conferenceMonth(conference: Conference): number {
  return parseISO(conference.startDate).getMonth();
}

export function conferenceYear(conference: Conference): number {
  return parseISO(conference.startDate).getFullYear();
}

/** Compact audience size, e.g. 11500 -> "11,500", null -> "—". */
export function formatAudience(size: number | null): string {
  if (size === null) return '—';
  return size.toLocaleString('en-US');
}

/** "Approx. 8,000 attendees" / "Audience size unknown". */
export function formatAudienceLong(size: number | null): string {
  if (size === null) return 'Audience size unknown';
  return `Approx. ${size.toLocaleString('en-US')} attendees`;
}

export const CONFIDENCE_LABEL: Record<EvidenceConfidence, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Days from today to the conference start; negative if it has begun/passed. */
export function daysUntil(startISO: string): number {
  const start = parseISO(startISO);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((start.getTime() - today.getTime()) / 86_400_000);
}
