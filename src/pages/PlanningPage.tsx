import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Route, Eye, EyeOff } from 'lucide-react';
import type { AttendanceStatus, Conference } from '../types/conference';
import { useConferences } from '../store/conferences';
import { parseISO, monthLabelLong } from '../lib/format';
import { scoreConference } from '../lib/scoring';
import { ATTENDANCE_VISUAL } from '../lib/attendanceVisual';
import { travelRegionFor } from '../lib/travel';
import { buildTripClusters, type TripInput } from '../lib/trips';
import { buildPlanningSummary } from '../lib/planningSummary';
import { AppShell } from '../components/AppShell';
import { YearTimeline, type MonthSummary } from '../components/planning/YearTimeline';
import { MonthCalendar } from '../components/planning/MonthCalendar';
import { TripCard, type UITrip } from '../components/planning/TripCard';
import { PlanningSummary } from '../components/planning/PlanningSummary';
import { Button } from '../components/ui/Button';

function todayISO(): string {
  const n = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}
function validDates(c: Conference): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(c.startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(c.endDate) &&
    c.endDate >= c.startDate
  );
}
export function PlanningPage() {
  const { conferences, loading, error, reload, setAttendance } = useConferences();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [showNotAttending, setShowNotAttending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const initialized = useRef(false);
  const iso = todayISO();

  const dated = useMemo(() => conferences.filter(validDates), [conferences]);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const c of dated) set.add(parseISO(c.startDate).getFullYear());
    return [...set].sort((a, b) => a - b);
  }, [dated]);

  const defaultYear = useMemo(() => {
    const nowY = new Date().getFullYear();
    const upcoming = dated.filter((c) => c.endDate >= iso).map((c) => parseISO(c.startDate).getFullYear());
    if (upcoming.length) return Math.min(...upcoming);
    if (years.includes(nowY)) return nowY;
    return years[years.length - 1] ?? nowY;
  }, [dated, years, iso]);

  const firstMonthWithConfs = useMemo(
    () => (y: number) => {
      const nowY = new Date().getFullYear();
      for (let m = 0; m < 12; m++) {
        if (dated.some((c) => { const d = parseISO(c.startDate); return d.getFullYear() === y && d.getMonth() === m; })) {
          return m;
        }
      }
      return y === nowY ? new Date().getMonth() : 0;
    },
    [dated],
  );

  useEffect(() => {
    if (!initialized.current && years.length) {
      initialized.current = true;
      setSelectedYear(defaultYear);
      setSelectedMonth(firstMonthWithConfs(defaultYear));
    }
  }, [years, defaultYear, firstMonthWithConfs]);

  const year = selectedYear ?? defaultYear;

  function changeYear(y: number) {
    setSelectedYear(y);
    setSelectedMonth(firstMonthWithConfs(y));
  }

  async function handleSetAttendance(id: string, status: AttendanceStatus) {
    setActionError(null);
    try {
      await setAttendance(id, status);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update attendance.');
    }
  }

  // Year overview: per-month count + attendance dots (by start month). Dots use
  // the SAME attendance colours as the month calendar bars (green/blue/orange).
  const months: MonthSummary[] = useMemo(() => {
    const out: MonthSummary[] = Array.from({ length: 12 }, () => ({ count: 0, dots: [] }));
    for (const c of dated) {
      const d = parseISO(c.startDate);
      if (d.getFullYear() !== year) continue;
      const m = d.getMonth();
      out[m].count += 1;
      out[m].dots.push(ATTENDANCE_VISUAL[c.attendanceStatus].hex);
    }
    return out;
  }, [dated, year]);

  // Conferences overlapping the selected month (respecting the not-attending toggle).
  const monthConferences = useMemo(() => {
    const monthStart = new Date(year, selectedMonth, 1);
    const monthEnd = new Date(year, selectedMonth + 1, 0);
    return dated.filter((c) => {
      if (!showNotAttending && c.attendanceStatus === 'not_attending') return false;
      const s = parseISO(c.startDate);
      const e = parseISO(c.endDate);
      return e >= monthStart && s <= monthEnd;
    });
  }, [dated, year, selectedMonth, showNotAttending]);

  // Trip opportunities (global, upcoming). Deterministic.
  const trips: UITrip[] = useMemo(() => {
    const byId = new Map(conferences.map((c) => [c.id, c]));
    const inputs: TripInput[] = conferences.map((c) => ({
      id: c.id,
      startDate: c.startDate,
      endDate: c.endDate,
      travelRegion: travelRegionFor(c.region),
      attendance: c.attendanceStatus,
    }));
    return buildTripClusters(inputs)
      .filter((cl) => cl.endDate >= iso) // forward-looking
      .map((cluster) => ({
        cluster,
        stops: cluster.stops.flatMap((s) => {
          const conf = byId.get(s.id);
          if (!conf) return [];
          return [{ conference: conf, result: scoreConference(conf), gapDays: s.gapDays }];
        }),
      }))
      .filter((t) => t.stops.length >= 2);
  }, [conferences, iso]);

  const notAttendingCount = useMemo(
    () => dated.filter((c) => c.attendanceStatus === 'not_attending').length,
    [dated],
  );

  // Planning summary — attendance counts + a few useful attention items.
  // Deterministic, no Gemini call.
  const summary = useMemo(() => {
    const inputs = dated.map((c) => {
      const tier = scoreConference(c).tier;
      return {
        startDate: c.startDate,
        endDate: c.endDate,
        attendance: c.attendanceStatus,
        relevant: tier === 'A' || tier === 'B',
      };
    });
    const tripUndecided = trips.map(
      (t) => t.stops.filter((s) => s.conference.attendanceStatus === 'undecided').length,
    );
    return buildPlanningSummary(inputs, iso, tripUndecided);
  }, [dated, trips, iso]);

  if (error) {
    return (
      <AppShell>
        <PageHeader />
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 px-6 py-16 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-500">
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-sm font-semibold text-ink-900">Couldn't load planning data</h3>
          <p className="mt-1 max-w-md text-sm text-ink-500">{error}</p>
          <div className="mt-4">
            <Button variant="secondary" onClick={reload}>
              <RefreshCw size={15} />
              Try again
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader />

      {actionError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertTriangle size={16} className="shrink-0 text-rose-600" />
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="mt-6 space-y-4">
          <div className="h-40 animate-pulse rounded-xl border border-ink-200 bg-white" />
          <div className="h-96 animate-pulse rounded-xl border border-ink-200 bg-white" />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <YearTimeline
            year={year}
            years={years.length ? years : [year]}
            onYearChange={changeYear}
            months={months}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
          />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-ink-900">
                {monthLabelLong(selectedMonth)} {year}
              </h2>
              {notAttendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowNotAttending((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-50"
                >
                  {showNotAttending ? <EyeOff size={13} /> : <Eye size={13} />}
                  {showNotAttending ? 'Hide not attending' : 'Show not attending'}
                </button>
              )}
            </div>
            <MonthCalendar
              year={year}
              month={selectedMonth}
              conferences={monthConferences}
              onSetAttendance={handleSetAttendance}
            />
          </div>

          {/* Planning summary — attendance counts + attention items */}
          <PlanningSummary summary={summary} />

          {/* Trip opportunities */}
          <div id="trip-opportunities" className="scroll-mt-20">
            <div className="mb-3 flex items-center gap-2">
              <Route size={18} className="text-brand-600" />
              <h2 className="text-lg font-bold tracking-tight text-ink-900">Trip opportunities</h2>
              {trips.length > 0 && (
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
                  {trips.length}
                </span>
              )}
            </div>
            {trips.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
                <p className="mx-auto max-w-md text-sm text-ink-500">
                  Nearby conferences in the same travel region are grouped into efficient trips
                  automatically — including all-undecided <span className="font-semibold text-violet-700">suggested trips</span>.
                  None are close enough yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {trips.map((trip, i) => (
                  <div id={`trip-${i}`} key={i} className="scroll-mt-20">
                    <TripCard trip={trip} onSetAttendance={handleSetAttendance} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-grain-700">Planning</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">
        See conference coverage across the year, decide what to attend, and combine nearby
        conferences into efficient sales trips.
      </p>
    </div>
  );
}
