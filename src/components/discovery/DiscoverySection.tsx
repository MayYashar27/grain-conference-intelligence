import { useState } from 'react';
import {
  Sparkles,
  Loader2,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { Conference, Region, Vertical } from '../../types/conference';
import { useConferences } from '../../store/conferences';
import { runDiscovery, type DiscoveryFilters } from '../../lib/discovery';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { DiscoveryCard } from './DiscoveryCard';

const REGIONS: Region[] = [
  'North America',
  'Europe',
  'Middle East',
  'Asia-Pacific',
  'Latin America',
  'Africa',
];
const VERTICALS: Vertical[] = [
  'Payments',
  'Fintech',
  'Treasury & Finance',
  'Travel',
  'E-commerce & Marketplaces',
  'Technology & SaaS',
];

const inputClass =
  'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 transition-colors hover:border-ink-300 focus:border-brand-400 focus:outline-none';

interface Processing {
  id: string;
  action: 'approve' | 'dismiss';
}

/**
 * Discovery lives INSIDE the Conferences workspace. Running it never replaces or
 * hides the saved conferences: it shows a compact non-blocking state, and
 * surfaces candidates in a "Discovery results" panel with Approve / Dismiss.
 * Approving persists via the store, so the candidate joins the saved dataset.
 */
export function DiscoverySection() {
  const { approveConference } = useConferences();
  const [candidates, setCandidates] = useState<Conference[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Processing | null>(null);
  const [approved, setApproved] = useState<string | null>(null);

  // Optional, secondary refinements — collapsed by default.
  const [showFilters, setShowFilters] = useState(false);
  const [region, setRegion] = useState('');
  const [vertical, setVertical] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [keywords, setKeywords] = useState('');

  async function handleDiscover() {
    const filters: DiscoveryFilters = {
      region: region || undefined,
      vertical: vertical || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      keywords: keywords.trim() || undefined,
    };
    setDiscovering(true);
    setError(null);
    setActionError(null);
    setApproved(null);
    setHasRun(true);
    try {
      const results = await runDiscovery(filters);
      setCandidates(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discovery failed.');
      setCandidates([]);
    } finally {
      setDiscovering(false);
    }
  }

  async function handleApprove(candidate: Conference) {
    setActionError(null);
    setProcessing({ id: candidate.id, action: 'approve' });
    try {
      await approveConference(candidate);
      setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
      setApproved(candidate.name);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not approve this conference.');
    } finally {
      setProcessing(null);
    }
  }

  function handleDismiss(candidate: Conference) {
    setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
  }

  function clearResults() {
    setCandidates([]);
    setHasRun(false);
    setError(null);
    setApproved(null);
  }

  const showPanel = discovering || hasRun || error;

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Sparkles size={18} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink-900">Discover new conferences</h2>
            <p className="text-xs text-ink-500">
              Search the public web for events relevant to Grain. Your saved conferences stay right
              here while it runs.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
          >
            <SlidersHorizontal size={13} />
            {showFilters ? 'Hide refine' : 'Refine'}
          </button>
          <Button onClick={handleDiscover} disabled={discovering}>
            {discovering ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Discovering…
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Discover conferences
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Optional refinements — secondary/collapsible. */}
      {showFilters && (
        <div className="mt-4 border-t border-ink-100 pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              options={[{ value: '', label: 'Any region' }, ...REGIONS.map((r) => ({ value: r, label: r }))]}
            />
            <Select
              label="Vertical"
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              options={[{ value: '', label: 'Any vertical' }, ...VERTICALS.map((v) => ({ value: v, label: v }))]}
            />
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-500">Earliest date</span>
              <input type="date" className={inputClass} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-500">Latest date</span>
              <input type="date" className={inputClass} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-500">Keywords / intent</span>
            <input
              className={inputClass}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. cross-border payments, treasury, travel"
            />
          </label>
        </div>
      )}

      {approved && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-800">
          <CheckCircle2 size={16} className="shrink-0 text-brand-600" />
          <span>
            Approved <span className="font-semibold">{approved}</span> — it's now in your conferences
            below.
          </span>
        </div>
      )}
      {actionError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">
          <AlertTriangle size={16} className="shrink-0 text-rose-600" />
          {actionError}
        </div>
      )}

      {/* Non-blocking status / results panel. */}
      {showPanel && (
        <div className="mt-4 border-t border-ink-100 pt-4">
          {discovering ? (
            <div className="flex items-center gap-2 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
              <Loader2 size={15} className="animate-spin text-brand-500" />
              Discovering conferences… you can keep browsing your list below — results appear here
              when ready.
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm text-rose-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
              <div>
                <span className="font-semibold">Discovery didn't complete.</span> {error}
              </div>
            </div>
          ) : candidates.length > 0 ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-ink-500">
                  <span className="font-semibold text-ink-800">Discovery results</span> ·{' '}
                  {candidates.length} candidate{candidates.length === 1 ? '' : 's'} — approve or
                  dismiss
                </p>
                <button
                  type="button"
                  onClick={clearResults}
                  className="inline-flex items-center gap-1 text-xs font-medium text-ink-400 transition-colors hover:text-ink-700"
                >
                  <X size={13} />
                  Clear
                </button>
              </div>
              <div className="space-y-3">
                {candidates.map((c) => (
                  <DiscoveryCard
                    key={c.id}
                    candidate={c}
                    onApprove={() => handleApprove(c)}
                    onDismiss={() => handleDismiss(c)}
                    processing={processing?.id === c.id ? processing.action : null}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
              <span>
                No new candidates surfaced this time — they may already be in your list. Try
                broadening the refinements.
              </span>
              <button
                type="button"
                onClick={clearResults}
                className="shrink-0 text-xs font-medium text-ink-400 transition-colors hover:text-ink-700"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
