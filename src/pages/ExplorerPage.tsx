import { useMemo, useState, type ReactNode } from 'react';
import { Plus, CalendarClock, AlertTriangle, RefreshCw } from 'lucide-react';
import type { Region, Vertical } from '../types/conference';
import { useConferences } from '../store/conferences';
import {
  applyFilters,
  scoreAll,
  EMPTY_FILTERS,
  type FilterState,
  type SortKey,
} from '../lib/filters';
import { parseISO, daysUntil, formatDateRange } from '../lib/format';
import { AppShell } from '../components/AppShell';
import { FilterBar } from '../components/FilterBar';
import { ConferenceCard } from '../components/ConferenceCard';
import { AddConferenceModal } from '../components/AddConferenceModal';
import { DiscoverySection } from '../components/discovery/DiscoverySection';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

const VERTICAL_ORDER: Vertical[] = [
  'Payments',
  'Fintech',
  'Treasury & Finance',
  'Travel',
  'E-commerce & Marketplaces',
  'Technology & SaaS',
];

const REGION_ORDER: Region[] = [
  'North America',
  'Europe',
  'Middle East',
  'Asia-Pacific',
  'Latin America',
  'Africa',
];

export function ExplorerPage() {
  const { conferences, loading, error, reload } = useConferences();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('fit');
  const [showAdd, setShowAdd] = useState(false);

  const scored = useMemo(() => scoreAll(conferences), [conferences]);
  const results = useMemo(
    () => applyFilters(scored, filters, sort),
    [scored, filters, sort],
  );

  // Filter option sets, ordered meaningfully and limited to what exists.
  const verticals = useMemo(
    () => VERTICAL_ORDER.filter((v) => conferences.some((c) => c.vertical === v)),
    [conferences],
  );
  const regions = useMemo(
    () => REGION_ORDER.filter((r) => conferences.some((c) => c.region === r)),
    [conferences],
  );
  const months = useMemo(() => {
    const set = new Set(conferences.map((c) => parseISO(c.startDate).getMonth()));
    return [...set].sort((a, b) => a - b);
  }, [conferences]);

  // Headline stats.
  const tierACount = scored.filter((c) => c.result.tier === 'A').length;
  const nextUp = useMemo(() => {
    return scored
      .filter((c) => daysUntil(c.startDate) >= 0)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  }, [scored]);

  return (
    <AppShell>
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-grain-700">Conferences</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">
            The conferences most likely to put Grain in the room with relevant companies and
            decision-makers — ranked by a transparent Conference Fit Score.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowAdd(true)}
          className="shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} />
          Add Conference
        </Button>
      </div>

      {/* Discovery — non-blocking, inside the Conferences workspace. */}
      <div className="mt-5">
        <DiscoverySection />
      </div>

      {/* Insight strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading || error ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat label="Total conferences" value={String(scored.length)} />
            <Stat label="Strong Fit" value={String(tierACount)} accent />
            <Stat label="Verticals covered" value={String(verticals.length)} />
            {nextUp ? (
              <Stat
                label="Next up"
                value={nextUp.name}
                sub={`${formatDateRange(nextUp.startDate, nextUp.endDate)} · in ${daysUntil(
                  nextUp.startDate,
                )} days`}
                icon={<CalendarClock size={15} />}
              />
            ) : (
              <Stat label="Next up" value="—" />
            )}
          </>
        )}
      </div>

      {/* Filters */}
      <div className="mt-6">
        <FilterBar
          filters={filters}
          sort={sort}
          onChange={setFilters}
          onSortChange={setSort}
          onClear={() => setFilters(EMPTY_FILTERS)}
          verticals={verticals}
          regions={regions}
          months={months}
        />
      </div>

      {/* Results header */}
      {!error && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-ink-500">
            {loading ? (
              <span className="text-ink-400">Loading conferences…</span>
            ) : (
              <>
                <span className="font-semibold text-ink-800">{results.length}</span>{' '}
                {results.length === 1 ? 'conference' : 'conferences'}
                {results.length !== scored.length && (
                  <span className="text-ink-400"> of {scored.length}</span>
                )}
              </>
            )}
          </p>
        </div>
      )}

      {/* Results */}
      <div className="mt-3 space-y-3">
        {error ? (
          <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 px-6 py-16 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-500">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-sm font-semibold text-ink-900">Couldn't load conferences</h3>
            <p className="mt-1 max-w-md text-sm text-ink-500">{error}</p>
            <div className="mt-4">
              <Button variant="secondary" onClick={reload}>
                <RefreshCw size={15} />
                Try again
              </Button>
            </div>
          </div>
        ) : loading ? (
          Array.from({ length: 5 }).map((_, i) => <ConferenceCardSkeleton key={i} />)
        ) : results.length === 0 ? (
          <EmptyState
            title="No conferences match these filters"
            message="Try widening your search, clearing a filter, or adding a conference you already know about."
            action={
              <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </Button>
            }
          />
        ) : (
          results.map((c) => <ConferenceCard key={c.id} conference={c} />)
        )}
      </div>

      {showAdd && <AddConferenceModal onClose={() => setShowAdd(false)} />}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
        {icon && <span className="text-ink-400">{icon}</span>}
        {label}
      </div>
      <div
        className={`mt-1 truncate text-lg font-bold ${
          accent ? 'text-brand-700' : 'text-ink-900'
        }`}
        title={value}
      >
        {value}
      </div>
      {sub && <div className="truncate text-[11px] text-ink-400">{sub}</div>}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
      <div className="mt-2 h-5 w-16 animate-pulse rounded bg-ink-100" />
    </div>
  );
}

function ConferenceCardSkeleton() {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-4 sm:gap-5">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-ink-100" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-48 animate-pulse rounded bg-ink-100" />
          <div className="mt-2.5 h-3 w-64 max-w-full animate-pulse rounded bg-ink-100" />
          <div className="mt-3 flex gap-2">
            <div className="h-5 w-20 animate-pulse rounded bg-ink-100" />
            <div className="h-5 w-24 animate-pulse rounded bg-ink-100" />
          </div>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
          <div className="h-5 w-24 animate-pulse rounded bg-ink-100" />
          <div className="h-4 w-20 animate-pulse rounded bg-ink-100" />
        </div>
      </div>
    </div>
  );
}
