import { Check, CircleHelp, Ban, type LucideIcon } from 'lucide-react';
import type { AttendanceStatus } from '../../types/conference';
import {
  ATTENDANCE_VISUAL,
  ATTENDANCE_ORDER,
  ATTENDANCE_CONTROL_LABEL,
} from '../../lib/attendanceVisual';

/** Icons live here (React); all colours come from the shared visual mapping. */
export const ATTENDANCE_ICON: Record<AttendanceStatus, LucideIcon> = {
  attending: Check,
  undecided: CircleHelp,
  not_attending: Ban,
};

const ORDER = ATTENDANCE_ORDER;

/** Compact status badge for display in lists/calendars. */
export function AttendanceBadge({
  status,
  size = 'md',
}: {
  status: AttendanceStatus;
  size?: 'sm' | 'md';
}) {
  const meta = ATTENDANCE_VISUAL[status];
  const Icon = ATTENDANCE_ICON[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium ${meta.badgeBg} ${meta.badgeBorder} ${meta.badgeText} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
      }`}
    >
      <Icon size={size === 'sm' ? 11 : 12} />
      {meta.label}
    </span>
  );
}

/** Segmented control to change attendance. */
export function AttendanceControl({
  status,
  onChange,
  disabled,
}: {
  status: AttendanceStatus;
  onChange: (next: AttendanceStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Attendance"
      className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5"
    >
      {ORDER.map((s) => {
        const meta = ATTENDANCE_VISUAL[s];
        const Icon = ATTENDANCE_ICON[s];
        const active = status === s;
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(s)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
              active
                ? `${meta.activeBg} ${meta.activeText}`
                : `text-ink-500 hover:bg-ink-100 hover:text-ink-800`
            }`}
          >
            <Icon size={13} />
            {ATTENDANCE_CONTROL_LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}
