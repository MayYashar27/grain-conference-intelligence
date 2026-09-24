/**
 * SINGLE source of truth for how attendance status is shown, everywhere.
 * Used by the year overview dots, the month calendar bars, and the attendance
 * badges/controls so status always reads with the same colour family.
 *
 *   Attending     → green / mint (brand)
 *   Undecided     → blue (sky)
 *   Not attending → orange
 *
 * Pure data only (no React / lucide import) so it stays node-testable.
 * Attendance colours are deliberately NOT the Tier colours — Tier measures fit,
 * not the decision to attend.
 */
import type { AttendanceStatus } from '../types/conference';

export interface AttendanceVisual {
  label: string;
  /** Solid colour for dots / bar accents (year overview + calendar). */
  hex: string;
  /** Tinted bar background (month calendar event bar). */
  barBg: string;
  /** Bar icon colour. */
  barIcon: string;
  /** Bar title colour. */
  barName: string;
  /** Badge (compact status pill) colours. */
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  /** Active segmented-control button colours. */
  activeBg: string;
  activeText: string;
}

export const ATTENDANCE_VISUAL: Record<AttendanceStatus, AttendanceVisual> = {
  attending: {
    label: 'Attending',
    hex: '#0d9488', // teal-600 (green/teal)
    barBg: 'bg-teal-50',
    barIcon: 'text-teal-700',
    barName: 'text-ink-800',
    badgeBg: 'bg-teal-50',
    badgeBorder: 'border-teal-200',
    badgeText: 'text-teal-700',
    activeBg: 'bg-teal-600',
    activeText: 'text-white',
  },
  undecided: {
    label: 'Undecided',
    hex: '#7c3aed', // violet-600 (purple)
    barBg: 'bg-violet-50',
    barIcon: 'text-violet-700',
    barName: 'text-ink-800',
    badgeBg: 'bg-violet-50',
    badgeBorder: 'border-violet-200',
    badgeText: 'text-violet-700',
    activeBg: 'bg-violet-600',
    activeText: 'text-white',
  },
  not_attending: {
    label: 'Not attending',
    hex: '#dc2626', // red-600 (red)
    barBg: 'bg-red-50',
    barIcon: 'text-red-700',
    barName: 'text-ink-600',
    badgeBg: 'bg-red-50',
    badgeBorder: 'border-red-200',
    badgeText: 'text-red-700',
    activeBg: 'bg-red-600',
    activeText: 'text-white',
  },
};

export const ATTENDANCE_ORDER: AttendanceStatus[] = ['attending', 'undecided', 'not_attending'];

/** The control uses a shorter verb for "Attend"; everything else uses `label`. */
export const ATTENDANCE_CONTROL_LABEL: Record<AttendanceStatus, string> = {
  attending: 'Attend',
  undecided: 'Undecided',
  not_attending: 'Not attending',
};
