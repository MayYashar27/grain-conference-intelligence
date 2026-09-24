import type { Tier } from '../../types/conference';
import { TIER_STYLE, UNSCORED_STYLE } from '../../lib/ui';

interface ScoreDialProps {
  score: number | null;
  tier: Tier | null;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { box: 56, stroke: 5, value: 'text-base', label: 'text-[9px]' },
  md: { box: 92, stroke: 7, value: 'text-2xl', label: 'text-[10px]' },
  lg: { box: 132, stroke: 9, value: 'text-4xl', label: 'text-xs' },
} as const;

/**
 * Circular fit-score indicator. The ring fills proportionally to the score and
 * is colored by tier. When no dimension could be assessed, it renders a neutral,
 * dashed "N/A" state rather than an implied zero.
 */
export function ScoreDial({ score, tier, size = 'md' }: ScoreDialProps) {
  const s = SIZES[size];
  const r = (s.box - s.stroke) / 2;
  const c = 2 * Math.PI * r;
  const style = tier ? TIER_STYLE[tier] : UNSCORED_STYLE;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const center = s.box / 2;

  return (
    <div
      className="relative shrink-0"
      style={{ width: s.box, height: s.box }}
      role="img"
      aria-label={score === null ? 'Score not available' : `Fit score ${score} of 100`}
    >
      <svg width={s.box} height={s.box} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={style.softHex}
          strokeWidth={s.stroke}
          strokeDasharray={score === null ? '3 4' : undefined}
        />
        {score !== null && (
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={style.hex}
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {score === null ? (
          <>
            <span className={`font-semibold ${s.value} ${style.text}`}>—</span>
            <span className={`font-medium uppercase tracking-wide ${s.label} ${style.text}`}>
              N/A
            </span>
          </>
        ) : (
          <>
            <span className={`tnum font-bold text-ink-900 ${s.value}`}>{score}</span>
            {size !== 'sm' && (
              <span className={`font-medium uppercase tracking-wide text-ink-400 ${s.label}`}>
                Fit
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
