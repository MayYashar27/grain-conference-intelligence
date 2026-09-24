import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Globe,
  ExternalLink,
  PlusCircle,
  Pencil,
  Trash2,
  Sparkles,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useConferences } from '../store/conferences';
import { scoreConference } from '../lib/scoring';
import { TIERS } from '../lib/scoring';
import { CONFIDENCE_STYLE } from '../lib/ui';
import {
  formatDateRange,
  formatAudienceLong,
  daysUntil,
} from '../lib/format';
import { AppShell } from '../components/AppShell';
import { ScoreDial } from '../components/ui/ScoreDial';
import { TierBadge } from '../components/ui/TierBadge';
import { ConfidenceSignal } from '../components/ui/ConfidenceSignal';
import { Chip } from '../components/ui/Chip';
import { InfoTooltip } from '../components/ui/InfoTooltip';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { EditConferenceModal } from '../components/EditConferenceModal';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export function ConferenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getById, loading, error, enrichStatus, runEnrichment, removeConference } = useConferences();
  const navigate = useNavigate();
  const conference = id ? getById(id) : undefined;
  const [showEdit, setShowEdit] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!conference && (loading || error)) {
    return (
      <AppShell>
        <Link
          to="/conferences"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-800"
        >
          <ArrowLeft size={16} />
          Conferences
        </Link>
        {error ? (
          <div className="mt-4">
            <EmptyState
              title="Couldn't load this conference"
              message={error}
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="h-48 animate-pulse rounded-xl border border-ink-200 bg-white" />
              <div className="h-96 animate-pulse rounded-xl border border-ink-200 bg-white" />
            </div>
            <div className="h-64 animate-pulse rounded-xl border border-ink-200 bg-white" />
          </div>
        )}
      </AppShell>
    );
  }

  if (!conference) {
    return (
      <AppShell>
        <EmptyState
          title="Conference not found"
          message="This conference may have been removed, or the link is out of date."
          action={
            <Link to="/conferences">
              <Button variant="secondary">
                <ArrowLeft size={16} />
                Back to conferences
              </Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  const result = scoreConference(conference);
  const confidence = conference.evidenceConfidence
    ? CONFIDENCE_STYLE[conference.evidenceConfidence]
    : null;
  const days = daysUntil(conference.startDate);

  const status = enrichStatus[conference.id];
  const enriching = status === 'enriching';
  const enrichFailed = status === 'failed';
  const notEnriched = !conference.evidenceConfidence && result.score === null;

  async function enrichNow() {
    setActionError(null);
    try {
      await runEnrichment(conference!.id);
    } catch {
      /* status handled by store */
    }
  }

  async function del() {
    setActionError(null);
    setDeleting(true);
    try {
      await removeConference(conference!.id);
      navigate('/conferences');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete the conference.');
      setDeleting(false);
    }
  }

  return (
    <AppShell>
      <Link
        to="/conferences"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-800"
      >
        <ArrowLeft size={16} />
        Conferences
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Header */}
          <div className="rounded-xl border border-ink-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {conference.vertical && <Chip tone="brand">{conference.vertical}</Chip>}
                {conference.region && <Chip>{conference.region}</Chip>}
                {!conference.vertical && !conference.region && <Chip>Not specified</Chip>}
                {conference.addedManually && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                    <PlusCircle size={10} />
                    Manually added
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowEdit(true)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>
            {actionError && <p className="mt-2 text-xs text-rose-600">{actionError}</p>}

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-grain-700">
              {conference.name}
            </h1>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={15} className="text-ink-400" />
                {formatDateRange(conference.startDate, conference.endDate)}
                {days >= 0 && (
                  <span className="ml-1 text-ink-400">· in {days} days</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={15} className="text-ink-400" />
                {conference.city}, {conference.country}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users size={15} className="text-ink-400" />
                {formatAudienceLong(conference.audienceSize)}
              </span>
            </div>

            {conference.description && (
              <p className="mt-4 text-sm leading-relaxed text-ink-600">
                {conference.description}
              </p>
            )}

            {conference.url && (
              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-ink-100 pt-4 text-sm">
                <a
                  href={conference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-brand-700 transition-colors hover:text-brand-800"
                >
                  <Globe size={15} />
                  Conference website
                  <ExternalLink size={13} className="text-brand-400" />
                </a>
              </div>
            )}
          </div>

          {/* Scoring breakdown */}
          <ScoreBreakdown conference={conference} result={result} />
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* Score summary */}
          <div className="rounded-xl border border-ink-200 bg-white p-5">
            <div className="flex items-center gap-4">
              <ScoreDial score={result.score} tier={result.tier} size="lg" />
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  Conference Fit
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <TierBadge tier={result.tier} />
                  <InfoTooltip label="Fit scale">
                    <div className="mb-1.5 text-xs font-semibold text-ink-800">Fit scale</div>
                    <div className="space-y-1">
                      {TIERS.map((t) => {
                        const isCurrent = result.tier === t.tier;
                        return (
                          <div
                            key={t.tier}
                            className={`flex items-center justify-between text-xs ${
                              isCurrent ? 'font-semibold text-ink-900' : 'text-ink-500'
                            }`}
                          >
                            <span>{t.label}</span>
                            <span className="tnum">{t.range}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 border-t border-ink-100 pt-2 text-[11px] leading-snug text-ink-400">
                      Fit measures relevance, not the decision to attend.
                    </p>
                  </InfoTooltip>
                </div>
                <div className="mt-2">
                  {enriching ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                      <Loader2 size={11} className="animate-spin" />
                      Enriching…
                    </span>
                  ) : conference.evidenceConfidence ? (
                    <ConfidenceSignal confidence={conference.evidenceConfidence} />
                  ) : (
                    <span className="text-xs font-medium text-ink-400">Not yet scored</span>
                  )}
                </div>
              </div>
            </div>

            {enriching ? (
              <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-ink-50 p-3 text-xs leading-relaxed text-ink-600">
                <Sparkles size={13} className="mt-px shrink-0 text-brand-500" />
                Gathering public-web evidence and classifying fit. You can keep working — the score
                and evidence appear here when ready.
              </p>
            ) : enrichFailed ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/60 p-3">
                <p className="flex items-start gap-1.5 text-xs leading-relaxed text-rose-800">
                  <AlertTriangle size={13} className="mt-px shrink-0 text-rose-500" />
                  Enrichment didn't complete. The conference is saved — you can retry.
                </p>
                <div className="mt-2">
                  <Button variant="secondary" onClick={enrichNow}>
                    <Sparkles size={14} />
                    Retry enrichment
                  </Button>
                </div>
              </div>
            ) : notEnriched ? (
              <div className="mt-4 rounded-lg bg-ink-50 p-3">
                <p className="text-xs leading-relaxed text-ink-600">
                  Awaiting enrichment — Grain fit scoring and evidence are generated automatically.
                </p>
                <div className="mt-2">
                  <Button variant="secondary" onClick={enrichNow}>
                    <Sparkles size={14} />
                    Enrich now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-ink-50 p-3">
                <p className="text-xs leading-relaxed text-ink-600">
                  {confidence
                    ? confidence.description
                    : 'Grain fit scoring and evidence are generated automatically.'}
                </p>
                <button
                  type="button"
                  onClick={enrichNow}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 transition-colors hover:text-brand-800"
                >
                  <Sparkles size={12} />
                  Refresh intelligence
                </button>
              </div>
            )}
          </div>

          {/* Facts */}
          <div className="rounded-xl border border-ink-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              At a glance
            </div>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Fact label="Vertical" value={conference.vertical ?? 'Not specified'} />
              <Fact label="Region" value={conference.region ?? 'Not specified'} />
              <Fact
                label="Location"
                value={`${conference.city}, ${conference.country}`}
              />
              <Fact
                label="Audience"
                value={formatAudienceLong(conference.audienceSize)}
              />
            </dl>
          </div>
        </aside>
      </div>

      {showEdit && <EditConferenceModal conference={conference} onClose={() => setShowEdit(false)} />}

      {confirmingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setConfirmingDelete(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-ink-900">Delete conference?</h3>
            <p className="mt-2 text-sm text-ink-600">
              This permanently deletes <span className="font-medium">{conference.name}</span> and its
              fit intelligence. Any lead interactions logged here become direct / non-conference.
            </p>
            {actionError && <p className="mt-2 text-xs text-rose-600">{actionError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button onClick={del} disabled={deleting} className="!bg-rose-600 hover:!bg-rose-700">
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Delete conference
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-medium text-ink-800">{value}</dd>
    </div>
  );
}
