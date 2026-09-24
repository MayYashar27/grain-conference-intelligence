import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ATTENDANCE_ORDER, ATTENDANCE_VISUAL } from '../../lib/attendanceVisual';

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export interface MonthSummary {
  count: number;
  /** One hex per conference (attendance-colored), for a compact distribution strip. */
  dots: string[];
}

export function YearTimeline({
  year,
  years,
  onYearChange,
  months,
  selectedMonth,
  onSelectMonth,
}: {
  year: number;
  years: number[];
  onYearChange: (year: number) => void;
  months: MonthSummary[];
  selectedMonth: number;
  onSelectMonth: (month: number) => void;
}) {
  const idx = years.indexOf(year);
  const total = months.reduce((s, m) => s + m.count, 0);

  return (
    <section className="rounded-xl border border-ink-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-ink-900">Year at a glance</h2>
          <p className="text-xs text-ink-500">
            {total} conference{total === 1 ? '' : 's'} in {year} · select a month to plan
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous year"
            disabled={idx <= 0}
            onClick={() => idx > 0 && onYearChange(years[idx - 1])}
            className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[3.5rem] text-center text-base font-bold tabular-nums text-ink-900">
            {year}
          </span>
          <button
            type="button"
            aria-label="Next year"
            disabled={idx >= years.length - 1}
            onClick={() => idx < years.length - 1 && onYearChange(years[idx + 1])}
            className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Attendance legend — the dots below share the month calendar's colours. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {ATTENDANCE_ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ATTENDANCE_VISUAL[s].hex }} />
            {ATTENDANCE_VISUAL[s].label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {months.map((m, i) => {
          const selected = i === selectedMonth;
          const empty = m.count === 0;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectMonth(i)}
              aria-pressed={selected}
              className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-all ${
                selected
                  ? 'border-brand-300 bg-brand-50 ring-1 ring-brand-200'
                  : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50'
              }`}
            >
              <div className="flex w-full items-baseline justify-between">
                <span
                  className={`text-xs font-semibold ${
                    selected ? 'text-brand-700' : empty ? 'text-ink-400' : 'text-ink-700'
                  }`}
                >
                  {MONTHS_SHORT[i]}
                </span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    empty ? 'text-ink-300' : 'text-ink-900'
                  }`}
                >
                  {m.count || ''}
                </span>
              </div>
              <div className="mt-2 flex min-h-[8px] flex-wrap gap-1">
                {m.dots.slice(0, 8).map((hex, di) => (
                  <span
                    key={di}
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
