import { useState } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  Loader2,
  Link2,
} from 'lucide-react';
import type { Conference } from '../../types/conference';
import { scoreConference, DIMENSIONS } from '../../lib/scoring';
import { formatDateRange, formatAudience } from '../../lib/format';
import { ScoreDial } from '../ui/ScoreDial';
import { TierBadge } from '../ui/TierBadge';
import { ConfidenceSignal } from '../ui/ConfidenceSignal';
import { Chip } from '../ui/Chip';
import { DimensionBar } from '../ui/DimensionBar';
import { Button } from '../ui/Button';

/**
 * Concise, deduped key signals for fast triage: at most 5, prioritized by
 * dimension weight (Company → Buyer → Agenda → Networking). The fuller per-
 * dimension signals/evidence remain available in the expanded Evidence view.
 */
const MAX_CARD_SIGNALS = 5;

function keySignals(conference: Conference): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const dim of DIMENSIONS) {
    for (const s of conference.dimensions[dim.key]?.signals ?? []) {
      const k = s.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(s);
      }
      if (out.length >= MAX_CARD_SIGNALS) return out;
    }
  }
  return out;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function DiscoveryCard({
  candidate,
  onApprove,
  onDismiss,
  processing,
}: {
  candidate: Conference;
  onApprove: () => void;
  onDismiss: () => void;
  processing: 'approve' | 'dismiss' | null;
}) {
  const result = scoreConference(candidate);
  const signals = keySignals(candidate);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const busy = processing !== null;

  const location = [candidate.city, candidate.country].filter(Boolean).join(', ') || 'Location TBC';

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-4 sm:gap-5">
        <ScoreDial score={result.score} tier={result.tier} size="sm" />

        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-ink-900">{candidate.name}</h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} className="text-ink-400" />
              {formatDateRange(candidate.startDate, candidate.endDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} className="text-ink-400" />
              {location}
            </span>
            {candidate.audienceSize !== null && (
              <span className="inline-flex items-center gap-1.5">
                <Users size={13} className="text-ink-400" />
                {formatAudience(candidate.audienceSize)}
              </span>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {candidate.vertical && <Chip tone="brand">{candidate.vertical}</Chip>}
            {candidate.region && <Chip>{candidate.region}</Chip>}
            <TierBadge tier={result.tier} size="sm" />
            {candidate.evidenceConfidence && (
              <ConfidenceSignal confidence={candidate.evidenceConfidence} size="sm" />
            )}
          </div>

          {signals.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {signals.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center rounded-md bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-600 ring-1 ring-inset ring-ink-100"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Secondary controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink-100 pt-3 text-xs">
        <button
          type="button"
          onClick={() => setShowEvidence((v) => !v)}
          className="inline-flex items-center gap-1 font-medium text-ink-500 transition-colors hover:text-ink-800"
          aria-expanded={showEvidence}
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${showEvidence ? 'rotate-180' : ''}`}
          />
          {showEvidence ? 'Hide evidence' : 'Evidence'}
        </button>

        {candidate.sources.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSources((v) => !v)}
            className="inline-flex items-center gap-1 font-medium text-ink-500 transition-colors hover:text-ink-800"
            aria-expanded={showSources}
          >
            <Link2 size={13} />
            {candidate.sources.length} source{candidate.sources.length === 1 ? '' : 's'}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={onDismiss} disabled={busy}>
            {processing === 'dismiss' ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <X size={15} />
            )}
            Dismiss
          </Button>
          <Button onClick={onApprove} disabled={busy}>
            {processing === 'approve' ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Check size={15} />
            )}
            Approve
          </Button>
        </div>
      </div>

      {showSources && (
        <ul className="mt-3 space-y-1.5 border-t border-ink-100 pt-3">
          {candidate.sources.map((url) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                {hostname(url)}
                <ExternalLink size={12} className="text-brand-400" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {showEvidence && (
        <div className="mt-1 divide-y divide-ink-100 border-t border-ink-100 px-1">
          {DIMENSIONS.map((meta) => (
            <DimensionBar key={meta.key} meta={meta} assessment={candidate.dimensions[meta.key]} />
          ))}
        </div>
      )}
    </div>
  );
}
