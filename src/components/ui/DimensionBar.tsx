import { AlertCircle } from 'lucide-react';
import type { DimensionAssessment } from '../../types/conference';
import { RUBRIC, type DimensionMeta } from '../../lib/scoring';
import { dimensionHex } from '../../lib/ui';

interface DimensionBarProps {
  meta: DimensionMeta;
  assessment: DimensionAssessment;
}

function rubricLabel(score: number): string {
  return RUBRIC.find((r) => r.value === score)?.label ?? '';
}

/**
 * One scoring dimension, presented for a salesperson: name, weight, score, a
 * qualitative label, a proportional bar, and a short set of scannable key
 * signals. No methodology questions or reasoning paragraphs — the signals carry
 * the "why". Missing evidence is shown plainly, never as a zero.
 */
export function DimensionBar({ meta, assessment }: DimensionBarProps) {
  const { score, signals } = assessment;
  const unknown = score === null;
  const weightPct = Math.round(meta.weight * 100);

    // NOTE: no `last:pb-0` — the last dimension keeps its bottom padding so its
    // signal chips are never flush against (and visually clipped by) the card edge.
  return (
    <div className="py-4 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-ink-900">{meta.label}</h4>
          <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-500 tnum">
            {weightPct}%
          </span>
        </div>
        <div className="shrink-0">
          {unknown ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              <AlertCircle size={12} />
              Insufficient evidence
            </span>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="tnum text-lg font-bold text-ink-900">{score}</span>
              <span className="text-xs font-medium text-ink-500">{rubricLabel(score)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        {unknown ? (
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #e2e7ee 0 6px, transparent 6px 12px)',
            }}
          />
        ) : (
          <div
            className="h-full rounded-full"
            style={{
              width: `${score}%`,
              backgroundColor: dimensionHex(score),
              transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)',
            }}
          />
        )}
      </div>

      {unknown ? (
        // Preserve grounded evidence even when it couldn't be classified into a score.
        assessment.evidence ? (
          <p className="mt-2.5 text-xs leading-relaxed text-ink-500">{assessment.evidence}</p>
        ) : (
          <p className="mt-2.5 text-xs text-ink-400">Not enough public evidence to assess.</p>
        )
      ) : signals.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {signals.map((signal) => (
            <span
              key={signal}
              className="inline-flex items-center rounded-md bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-600 ring-1 ring-inset ring-ink-100"
            >
              {signal}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
