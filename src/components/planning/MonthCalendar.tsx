import { useMemo, useState } from 'react';
import { X, MapPin, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AttendanceStatus, Conference } from '../../types/conference';
import { parseISO, formatDateRange } from '../../lib/format';
import { scoreConference } from '../../lib/scoring';
import { ScoreDial } from '../ui/ScoreDial';
import { TierBadge } from '../ui/TierBadge';
import { AttendanceControl, AttendanceBadge, ATTENDANCE_ICON } from './AttendanceControl';
import { ATTENDANCE_VISUAL, ATTENDANCE_ORDER } from '../../lib/attendanceVisual';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BAR_H = 22;
const BAR_GAP = 3;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const r = startOfDay(d);
  r.setDate(r.getDate() + n);
  return r;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
/** Days from Monday (0) to Sunday (6). */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

interface Bar {
  conf: Conference;
  lane: number;
  startCol: number;
  span: number;
  continuesLeft: boolean;
  continuesRight: boolean;
}
interface Week {
  days: Date[];
  bars: Bar[];
  lanes: number;
}

/**
 * Event-bar styling comes from the shared attendance mapping (ATTENDANCE_VISUAL),
 * so the calendar bars match the year-overview dots exactly. Subtle 50-level
 * backgrounds with a stronger accent border keep text dark and readable.
 */
const LEGEND_ORDER = ATTENDANCE_ORDER;

function buildWeeks(year: number, month: number, conferences: Conference[]): Week[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const gridStart = addDays(first, -mondayIndex(first));
  const weeks: Week[] = [];

  for (let ws = gridStart; ws <= last; ws = addDays(ws, 7)) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const weekStart = days[0];
    const weekEnd = days[6];

    // Conferences overlapping this week, sorted by start then longest first.
    const overlapping = conferences
      .filter((c) => {
        const s = parseISO(c.startDate);
        const e = parseISO(c.endDate);
        return e >= weekStart && s <= weekEnd;
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || b.endDate.localeCompare(a.endDate));

    const laneEnds: number[] = []; // last occupied column per lane
    const bars: Bar[] = [];
    for (const conf of overlapping) {
      const s = parseISO(conf.startDate);
      const e = parseISO(conf.endDate);
      const segStart = s < weekStart ? weekStart : s;
      const segEnd = e > weekEnd ? weekEnd : e;
      const startCol = mondayIndex(segStart);
      const endCol = mondayIndex(segEnd);
      const span = Math.max(1, endCol - startCol + 1);

      let lane = laneEnds.findIndex((end) => end < startCol);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(startCol + span - 1);
      } else {
        laneEnds[lane] = startCol + span - 1;
      }

      bars.push({
        conf,
        lane,
        startCol,
        span,
        continuesLeft: s < weekStart,
        continuesRight: e > weekEnd,
      });
    }

    weeks.push({ days, bars, lanes: Math.max(1, laneEnds.length) });
  }

  return weeks;
}

export function MonthCalendar({
  year,
  month,
  conferences,
  onSetAttendance,
}: {
  year: number;
  month: number;
  conferences: Conference[];
  onSetAttendance: (id: string, status: AttendanceStatus) => void;
}) {
  const today = startOfDay(new Date());
  const weeks = useMemo(() => buildWeeks(year, month, conferences), [year, month, conferences]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = conferences.find((c) => c.id === selectedId) ?? null;

  return (
    <section className="rounded-xl border border-ink-200 bg-white">
      {/* Attendance legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-ink-100 px-3 py-2.5">
        {LEGEND_ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: ATTENDANCE_VISUAL[s].hex }}
            />
            {ATTENDANCE_VISUAL[s].label}
          </span>
        ))}
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-ink-100">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            {d}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => {
        const barsHeight = week.lanes * (BAR_H + BAR_GAP) + 6;
        return (
          <div key={wi} className="border-b border-ink-100 last:border-b-0">
            {/* Day numbers */}
            <div className="grid grid-cols-7">
              {week.days.map((day, di) => {
                const inMonth = day.getMonth() === month;
                const isToday = sameDay(day, today);
                return (
                  <div key={di} className={`px-2 pt-1.5 ${di < 6 ? 'border-r border-ink-50' : ''}`}>
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium tabular-nums ${
                        isToday
                          ? 'bg-brand-600 text-white'
                          : inMonth
                            ? 'text-ink-600'
                            : 'text-ink-300'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Conference bars */}
            <div className="relative mx-1" style={{ height: barsHeight }}>
              {/* Column guides */}
              <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className={i < 6 ? 'border-r border-ink-50' : ''} />
                ))}
              </div>

              {week.bars.map((bar, bi) => {
                const status = bar.conf.attendanceStatus;
                const style = ATTENDANCE_VISUAL[status];
                const Icon = ATTENDANCE_ICON[status];
                const fitScore = scoreConference(bar.conf).score;
                return (
                  <button
                    key={bi}
                    type="button"
                    onClick={() => setSelectedId(bar.conf.id)}
                    title={bar.conf.name}
                    className={`absolute flex items-center gap-1 overflow-hidden border-l-[3px] px-1.5 text-left text-[11px] font-medium shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-opacity hover:opacity-90 ${
                      style.barBg
                    } ${bar.continuesLeft ? 'rounded-r-md' : 'rounded-md'} ${
                      bar.continuesRight ? '!rounded-r-none' : ''
                    } ${status === 'not_attending' ? 'opacity-90' : ''}`}
                    style={{
                      left: `calc(${(bar.startCol / 7) * 100}% + 2px)`,
                      width: `calc(${(bar.span / 7) * 100}% - 4px)`,
                      top: bar.lane * (BAR_H + BAR_GAP) + 3,
                      height: BAR_H,
                      borderLeftColor: style.hex,
                    }}
                  >
                    <Icon size={11} className={`shrink-0 ${style.barIcon}`} />
                    <span className={`truncate ${style.barName}`}>{bar.conf.name}</span>
                    {fitScore !== null && (
                      <span className={`ml-auto shrink-0 tnum font-bold ${style.barName}`}>{fitScore}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {selected && (
        <ConferencePopover
          conference={selected}
          onClose={() => setSelectedId(null)}
          onSetAttendance={onSetAttendance}
        />
      )}
    </section>
  );
}

function ConferencePopover({
  conference,
  onClose,
  onSetAttendance,
}: {
  conference: Conference;
  onClose: () => void;
  onSetAttendance: (id: string, status: AttendanceStatus) => void;
}) {
  const result = scoreConference(conference);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ScoreDial score={result.score} tier={result.tier} size="sm" />
            <div>
              <h3 className="text-sm font-semibold text-ink-900">{conference.name}</h3>
              <p className="text-xs text-ink-500">
                {formatDateRange(conference.startDate, conference.endDate)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TierBadge tier={result.tier} size="sm" />
          <AttendanceBadge status={conference.attendanceStatus} size="sm" />
          <span className="inline-flex items-center gap-1 text-xs text-ink-500">
            <MapPin size={12} className="text-ink-400" />
            {[conference.city, conference.country].filter(Boolean).join(', ') || '—'}
          </span>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-xs font-medium text-ink-500">Attendance</div>
          <AttendanceControl
            status={conference.attendanceStatus}
            onChange={(s) => onSetAttendance(conference.id, s)}
          />
        </div>

        <div className="mt-4 border-t border-ink-100 pt-3">
          <Link
            to={`/conference/${conference.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            View full details
            <ExternalLink size={12} className="text-brand-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
