import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, ChevronRight, PlusCircle } from 'lucide-react';
import type { ScoredConference } from '../lib/filters';
import { formatDateRange, formatAudience, daysUntil } from '../lib/format';
import { ScoreDial } from './ui/ScoreDial';
import { TierBadge } from './ui/TierBadge';
import { ConfidenceSignal } from './ui/ConfidenceSignal';
import { Chip } from './ui/Chip';

export function ConferenceCard({ conference }: { conference: ScoredConference }) {
  const { result } = conference;
  const days = daysUntil(conference.startDate);

  return (
    <Link
      to={`/conference/${conference.id}`}
      className="group block rounded-xl border border-ink-200 bg-white p-4 transition-all hover:border-ink-300 hover:shadow-[0_2px_16px_-4px_rgba(15,23,42,0.12)] focus-visible:border-brand-400 sm:p-5"
    >
      <div className="flex items-start gap-4 sm:gap-5">
        <ScoreDial score={result.score} tier={result.tier} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-[15px] font-semibold text-ink-900 group-hover:text-brand-700">
              {conference.name}
            </h3>
            {conference.addedManually && (
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                <PlusCircle size={10} />
                Added
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} className="text-ink-400" />
              {formatDateRange(conference.startDate, conference.endDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} className="text-ink-400" />
              {conference.city}, {conference.country}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={13} className="text-ink-400" />
              {formatAudience(conference.audienceSize)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {conference.vertical && <Chip tone="brand">{conference.vertical}</Chip>}
            {conference.region && <Chip>{conference.region}</Chip>}
            {!conference.vertical && !conference.region && <Chip>Not specified</Chip>}
            {days >= 0 && days <= 45 && (
              <span className="text-[11px] font-medium text-amber-600">
                {days === 0 ? 'Starts today' : `In ${days} day${days === 1 ? '' : 's'}`}
              </span>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
          <TierBadge tier={result.tier} />
          {conference.evidenceConfidence ? (
            <ConfidenceSignal confidence={conference.evidenceConfidence} size="sm" />
          ) : (
            <span className="text-[11px] text-ink-400">Not yet scored</span>
          )}
          {result.hasGaps && result.score !== null && (
            <span className="text-[11px] text-ink-400">Partial evidence</span>
          )}
        </div>

        <ChevronRight
          size={18}
          className="mt-1 shrink-0 self-center text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500"
        />
      </div>

      {/* Compact tier/confidence row for small screens */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-100 pt-3 sm:hidden">
        <TierBadge tier={result.tier} size="sm" />
        {conference.evidenceConfidence ? (
          <ConfidenceSignal confidence={conference.evidenceConfidence} size="sm" />
        ) : (
          <span className="text-[11px] text-ink-400">Not yet scored</span>
        )}
      </div>
    </Link>
  );
}
