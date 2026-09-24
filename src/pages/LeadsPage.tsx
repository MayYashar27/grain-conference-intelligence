import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Plus,
  MapPin,
  Search,
  Phone,
  CalendarClock,
  AlertTriangle,
  RefreshCw,
  Users,
  Loader2,
  CheckCircle2,
  Flag,
} from 'lucide-react';
import type { Conference } from '../types/conference';
import { useConferences } from '../store/conferences';
import { useLeads } from '../store/leads';
import { conferencesToday, localToday } from '../lib/leadContext';
import { formatDateRange } from '../lib/format';
import { analyzeRelationship } from '../lib/relationship';
import {
  computeFollowUpPriority,
  compareByPriorityThenRecency,
  type FollowUpPriority,
} from '../lib/followUpPriority';
import { MOMENTUM_STYLE, STAGE_STYLE, PRIORITY_STYLE } from '../lib/researchLabels';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { CaptureLeadModal } from '../components/leads/CaptureLeadModal';
import { HubSpotPreviewModal } from '../components/leads/HubSpotPreviewModal';

interface CaptureTarget {
  conferenceId: string | null;
  conferenceName: string | null;
}

export function LeadsPage() {
  const { conferences, loading: confLoading } = useConferences();
  const { contacts, interactions, research, researchStatus, loading, error, reload } = useLeads();
  const [capture, setCapture] = useState<CaptureTarget | null>(null);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const [deletedToast, setDeletedToast] = useState(false);
  const [showHubspot, setShowHubspot] = useState(false);

  useEffect(() => {
    if ((location.state as { deleted?: boolean } | null)?.deleted) {
      setDeletedToast(true);
      window.history.replaceState({}, '');
      const t = setTimeout(() => setDeletedToast(false), 4000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  const today = conferencesToday(conferences, localToday());

  // Per-contact rows: interaction summary + live relationship + Follow-up Priority.
  // Relationship & priority are deterministic/internal — no Gemini call.
  const rows = useMemo(() => {
    const byC = new Map<string, { occurredAt: string; note: string | null }[]>();
    const meta = new Map<string, { count: number; latestAt: string; latestConfId: string | null }>();
    for (const it of interactions) {
      const list = byC.get(it.contactId);
      if (list) list.push({ occurredAt: it.occurredAt, note: it.note });
      else byC.set(it.contactId, [{ occurredAt: it.occurredAt, note: it.note }]);

      const cur = meta.get(it.contactId);
      if (!cur) {
        meta.set(it.contactId, { count: 1, latestAt: it.occurredAt, latestConfId: it.conferenceId });
      } else {
        cur.count += 1;
        if (it.occurredAt > cur.latestAt) {
          cur.latestAt = it.occurredAt;
          cur.latestConfId = it.conferenceId;
        }
      }
    }

    const now = new Date().toISOString();
    const list = contacts.map((c) => {
      const hist = byC.get(c.id) ?? [];
      const relationship = analyzeRelationship(hist, now);
      const m = meta.get(c.id) ?? { count: 0, latestAt: '', latestConfId: null as string | null };
      const res = research[c.id] ?? null;
      const { priority } = computeFollowUpPriority({
        research: res,
        relationship,
        interactions: hist,
        nowISO: now,
      });
      return {
        contact: c,
        ...m,
        relationship,
        research: res,
        priority,
        // Flat keys consumed by the deterministic list comparator.
        momentum: relationship.momentum,
        stage: relationship.stage,
        icp: res?.icpFit.level ?? null,
        id: c.id,
      };
    });

    // Default sort: Priority, then relationship-quality signals, then recency,
    // then a stable id tie-breaker (see compareByPriorityThenRecency).
    list.sort(compareByPriorityThenRecency);
    return list;
  }, [contacts, interactions, research]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) => {
      const c = s.contact;
      return `${c.fullName} ${c.company} ${c.phone} ${c.email ?? ''}`.toLowerCase().includes(q);
    });
  }, [rows, query]);

  const confName = (id: string | null) =>
    id ? conferences.find((c) => c.id === id)?.name ?? null : null;

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-grain-700">Leads</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">
          Capture people you meet in seconds. Conference context is added automatically, and repeat
          contacts build a cross-conference history.
        </p>
      </div>

      {deletedToast && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <CheckCircle2 size={16} className="shrink-0 text-brand-600" />
          Lead deleted.
        </div>
      )}

      {/* Today / capture */}
      <TodayContext
        conferencesToday={today}
        loading={confLoading}
        onCapture={(t) => setCapture(t)}
      />

      {/* All leads */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-ink-500" />
            <h2 className="text-lg font-bold tracking-tight text-ink-900">All leads</h2>
            {!loading && !error && (
              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
                {contacts.length}
              </span>
            )}
          </div>
          <Button variant="secondary" onClick={() => setShowHubspot(true)}>
            Sync to HubSpot
          </Button>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, company, phone, or email…"
            className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400 transition-colors hover:border-ink-300 focus:border-brand-400 focus:outline-none"
          />
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 px-6 py-12 text-center">
            <AlertTriangle size={20} className="mb-2 text-rose-500" />
            <h3 className="text-sm font-semibold text-ink-900">Couldn't load leads</h3>
            <p className="mt-1 max-w-md text-sm text-ink-500">{error}</p>
            <div className="mt-3">
              <Button variant="secondary" onClick={reload}>
                <RefreshCw size={15} />
                Try again
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-ink-200 bg-white" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={contacts.length === 0 ? 'No leads yet' : 'No leads match your search'}
            message={
              contacts.length === 0
                ? 'Capture your first lead using the button above.'
                : 'Try a different name, company, phone, or email.'
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <Link
                key={s.contact.id}
                to={`/leads/${s.contact.id}`}
                className="group flex items-center gap-4 rounded-xl border border-ink-200 bg-white px-4 py-3.5 transition-colors hover:border-ink-300 hover:bg-ink-50"
              >
                <div className="min-w-0 flex-1">
                  {/* Person — prominent — then company / role */}
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="truncate text-base font-bold text-ink-900 group-hover:text-grain-700">
                      {s.contact.fullName}
                    </span>
                    <span className="truncate text-sm text-ink-500">{s.contact.company}</span>
                  </div>
                  {s.research?.person.title && (
                    <div className="truncate text-xs text-ink-500">{s.research.person.title}</div>
                  )}
                  {/* Priority + relationship status */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <PriorityChip priority={s.priority} />
                    <MiniBadge cls={STAGE_STYLE[s.relationship.stage].cls}>
                      {STAGE_STYLE[s.relationship.stage].label}
                    </MiniBadge>
                    <MiniBadge cls={MOMENTUM_STYLE[s.relationship.momentum].cls}>
                      {MOMENTUM_STYLE[s.relationship.momentum].label}
                    </MiniBadge>
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-ink-400">
                    <Phone size={12} />
                    {s.contact.phone}
                  </div>
                </div>
                {/* Latest interaction context */}
                <div className="hidden shrink-0 text-right sm:block">
                  <div className="text-sm font-semibold text-ink-800">
                    {s.count} interaction{s.count === 1 ? '' : 's'}
                  </div>
                  <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-500">
                    <CalendarClock size={12} className="text-ink-400" />
                    {confName(s.latestConfId) ?? 'Direct'}
                  </div>
                  {s.latestAt && (
                    <div className="mt-0.5 text-xs text-ink-400">Last: {shortDay(s.latestAt)}</div>
                  )}
                  {researchStatus[s.contact.id] === 'researching' ? (
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600">
                      <Loader2 size={10} className="animate-spin" />
                      Researching…
                    </div>
                  ) : researchStatus[s.contact.id] === 'failed' ? (
                    <div className="mt-1 text-[11px] font-medium text-rose-500">Research failed</div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {capture && (
        <CaptureLeadModal
          conferenceId={capture.conferenceId}
          conferenceName={capture.conferenceName}
          onClose={() => setCapture(null)}
        />
      )}

      {showHubspot && <HubSpotPreviewModal onClose={() => setShowHubspot(false)} />}
    </AppShell>
  );
}

/** Short "12 Sep" style date for the latest-interaction hint. */
function shortDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function MiniBadge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

/** The standout signal — Follow-up Priority, with a flag so it can't be mistaken
 * for Stage/Momentum. */
function PriorityChip({ priority }: { priority: FollowUpPriority }) {
  const s = PRIORITY_STYLE[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${s.cls}`}
      title="Follow-up priority"
    >
      <Flag size={11} />
      {s.label}
    </span>
  );
}

function TodayContext({
  conferencesToday: today,
  loading,
  onCapture,
}: {
  conferencesToday: Conference[];
  loading: boolean;
  onCapture: (t: CaptureTarget) => void;
}) {
  if (loading) {
    return <div className="mt-5 h-28 animate-pulse rounded-2xl border border-ink-200 bg-white" />;
  }

  // Case B — no attending conference today.
  if (today.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-ink-900">No conference today</h2>
            <p className="text-sm text-ink-500">Add a lead from another meeting, call, or outreach.</p>
          </div>
          <Button onClick={() => onCapture({ conferenceId: null, conferenceName: null })}>
            <Plus size={16} />
            Add lead
          </Button>
        </div>
      </div>
    );
  }

  // Case A — exactly one attending conference today.
  if (today.length === 1) {
    const c = today[0];
    return (
      <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50/60 p-5 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-ink-900">You're at {c.name} today</h2>
            <p className="inline-flex items-center gap-1.5 text-sm text-ink-600">
              <MapPin size={13} className="text-brand-500" />
              {[c.city, c.country].filter(Boolean).join(', ')} · {formatDateRange(c.startDate, c.endDate)}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button onClick={() => onCapture({ conferenceId: c.id, conferenceName: c.name })}>
              <Plus size={16} />
              Add lead
            </Button>
            <Button
              variant="secondary"
              onClick={() => onCapture({ conferenceId: null, conferenceName: null })}
            >
              <Plus size={16} />
              Add without conference
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Case C — 2+ attending conferences today: separate entry points, no popup.
  return (
    <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50/60 p-5 sm:p-6">
      <h2 className="text-base font-bold text-ink-900">
        You're attending {today.length} conferences today
      </h2>
      <p className="text-sm text-ink-500">Pick the conference you're capturing from.</p>
      <div className="mt-4 space-y-2">
        {today.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink-900">{c.name}</div>
              <div className="inline-flex items-center gap-1 text-xs text-ink-500">
                <MapPin size={11} className="text-ink-400" />
                {[c.city, c.country].filter(Boolean).join(', ')}
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => onCapture({ conferenceId: c.id, conferenceName: c.name })}
            >
              <Plus size={15} />
              Add lead
            </Button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onCapture({ conferenceId: null, conferenceName: null })}
          className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-800"
        >
          <Plus size={14} />
          Add lead without conference
        </button>
      </div>
    </div>
  );
}
