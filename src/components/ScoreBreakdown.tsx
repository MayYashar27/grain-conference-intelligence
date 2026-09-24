import { AlertCircle, ExternalLink, Sparkles } from 'lucide-react';
import type { Conference } from '../types/conference';
import { DIMENSIONS, type ScoreResult } from '../lib/scoring';
import { DimensionBar } from './ui/DimensionBar';

/**
 * The scoring breakdown, tuned for a salesperson: four dimensions with scores
 * and key signals. Methodology (weights, normalization math) is intentionally
 * not narrated here — the only surfaced note is the honest, decision-relevant
 * fact that some dimensions lack evidence.
 */
export function ScoreBreakdown({
  conference,
  result,
}: {
  conference: Conference;
  result: ScoreResult;
}) {
  const gaps = DIMENSIONS.length - result.assessedCount;
  // A fully unscored conference (e.g. just added, not yet enriched).
  const unscored = result.score === null;

  return (
    <section className="rounded-xl border border-ink-200 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-ink-900">What makes it relevant</h2>
          <p className="text-xs text-ink-500">
            {unscored ? 'Not yet scored.' : 'Fit across four weighted dimensions.'}
          </p>
        </div>
        {conference.url && (
          <a
            href={conference.url}
            target="_blank"
            rel="noopener noreferrer"
            title={conference.source ?? undefined}
            className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-ink-400 transition-colors hover:text-ink-700"
          >
            View source
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {unscored ? (
        <div className="flex flex-col items-center px-5 py-12 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <Sparkles size={20} />
          </div>
          <h3 className="text-sm font-semibold text-ink-900">Not yet scored</h3>
          <p className="mt-1 max-w-sm text-sm text-ink-500">
            This conference hasn't been enriched yet. Grain fit scoring and supporting evidence are
            generated automatically by the intelligence layer.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-ink-100 px-5">
            {DIMENSIONS.map((meta) => (
              <DimensionBar
                key={meta.key}
                meta={meta}
                assessment={conference.dimensions[meta.key]}
              />
            ))}
          </div>

          {gaps > 0 && (
            <div className="flex items-center gap-2 border-t border-ink-100 bg-amber-50/60 px-5 py-3">
              <AlertCircle size={15} className="shrink-0 text-amber-600" />
              <p className="text-xs font-medium text-amber-800">
                {`${gaps} ${gaps === 1 ? 'dimension has' : 'dimensions have'} insufficient evidence — the score reflects the rest.`}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
