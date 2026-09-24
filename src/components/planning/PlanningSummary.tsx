import { Route, Lightbulb } from 'lucide-react';
import type { PlanningSummary } from '../../lib/planningSummary';
import { ATTENDANCE_VISUAL } from '../../lib/attendanceVisual';

/**
 * Compact planning summary: attendance counts + a few genuinely-useful attention
 * items. Answers "are we attending enough / where's the gap / what can become a
 * trip?" without becoming an analytics dashboard.
 */
/** Scroll to a specific suggested trip card, or the Trip opportunities section. */
function scrollToTrip(tripIndex?: number) {
  const target =
    (tripIndex != null && document.getElementById(`trip-${tripIndex}`)) ||
    document.getElementById('trip-opportunities');
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function PlanningSummary({ summary }: { summary: PlanningSummary }) {
  const { counts, items } = summary;

  const chips = [
    { label: 'Attending', value: counts.attending, hex: ATTENDANCE_VISUAL.attending.hex },
    { label: 'Undecided', value: counts.undecided, hex: ATTENDANCE_VISUAL.undecided.hex },
    { label: 'Not attending', value: counts.notAttending, hex: ATTENDANCE_VISUAL.not_attending.hex },
  ];

  return (
    <section className="rounded-xl border border-ink-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <span
            key={c.label}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50/70 px-3 py-1.5"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
            <span className="text-xs font-medium text-ink-500">{c.label}</span>
            <span className="tnum text-sm font-bold text-ink-900">{c.value}</span>
          </span>
        ))}
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-ink-100 pt-3">
          {items.map((it) => (
            <li key={it.id} className="flex items-start gap-2 text-sm text-ink-700">
              <Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <span>
                {it.text}
                {it.hasTrip && (
                  <button
                    type="button"
                    onClick={() => scrollToTrip(it.tripIndex)}
                    className="ml-1.5 inline-flex items-center gap-1 align-middle text-xs font-semibold text-violet-700 underline-offset-2 hover:underline"
                  >
                    <Route size={11} />
                    See trips
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
