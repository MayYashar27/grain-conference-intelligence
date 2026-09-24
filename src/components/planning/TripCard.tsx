import { MapPin, ArrowDown, Lightbulb, Route } from 'lucide-react';
import type { AttendanceStatus, Conference } from '../../types/conference';
import type { ScoreResult } from '../../lib/scoring';
import type { TripCluster } from '../../lib/trips';
import { formatDateRange } from '../../lib/format';
import { ScoreDial } from '../ui/ScoreDial';
import { TierBadge } from '../ui/TierBadge';
import { AttendanceControl } from './AttendanceControl';

export interface UITripStop {
  conference: Conference;
  result: ScoreResult;
  gapDays: number | null;
}
export interface UITrip {
  cluster: TripCluster;
  stops: UITripStop[];
}

function gapLabel(gapDays: number): string {
  if (gapDays < 0) return 'Overlapping';
  if (gapDays === 0) return 'Same day';
  return `${gapDays}-day gap`;
}

export function TripCard({
  trip,
  onSetAttendance,
}: {
  trip: UITrip;
  onSetAttendance: (id: string, status: AttendanceStatus) => void;
}) {
  const { cluster, stops } = trip;

  // A trip with no Attending stop is a SUGGESTED travel opportunity (not an
  // existing plan). Otherwise it's an existing plan with nearby undecided stops.
  const isSuggested = cluster.attendingCount === 0;
  const undecided = stops.filter((s) => s.conference.attendanceStatus === 'undecided');
  const insight = isSuggested
    ? `Suggested trip — ${stops.length} nearby ${cluster.travelRegion} conferences you could plan together. Mark the ones you'll attend.`
    : undecided.length === 1
      ? `${undecided[0].conference.name} fits naturally into this trip — consider adding it to your plan.`
      : undecided.length > 1
        ? `${undecided.length} undecided conferences fit naturally into this trip.`
        : null;

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Route size={15} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink-900">
                {cluster.travelRegion} · {stops.length} conferences
              </span>
              {isSuggested && (
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                  Suggested trip
                </span>
              )}
            </div>
            <div className="text-xs text-ink-500">
              {formatDateRange(cluster.startDate, cluster.endDate)}
            </div>
          </div>
        </div>
      </div>

      <ol className="mt-4">
        {stops.map((stop, i) => (
          <li key={stop.conference.id}>
            {i > 0 && stop.gapDays !== null && (
              <div className="flex items-center gap-1.5 py-1 pl-5 text-[11px] font-medium text-ink-400">
                <ArrowDown size={12} />
                {gapLabel(stop.gapDays)}
              </div>
            )}
            <div className="flex items-start gap-3 rounded-lg border border-ink-100 bg-ink-50/50 p-3">
              <ScoreDial score={stop.result.score} tier={stop.result.tier} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink-900">
                  {stop.conference.name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} className="text-ink-400" />
                    {[stop.conference.city, stop.conference.country].filter(Boolean).join(', ') || '—'}
                  </span>
                  <span>{formatDateRange(stop.conference.startDate, stop.conference.endDate)}</span>
                  <TierBadge tier={stop.result.tier} size="sm" />
                </div>
                <div className="mt-2">
                  <AttendanceControl
                    status={stop.conference.attendanceStatus}
                    onChange={(s) => onSetAttendance(stop.conference.id, s)}
                  />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {insight && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          <Lightbulb size={14} className="shrink-0 text-amber-500" />
          {insight}
        </div>
      )}
    </div>
  );
}
