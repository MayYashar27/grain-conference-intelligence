import type { Tier } from '../../types/conference';
import { TIER_MAP } from '../../lib/scoring';
import { TIER_STYLE } from '../../lib/ui';

interface FitBadgeProps {
  tier: Tier | null;
  size?: 'sm' | 'md';
}

/**
 * Conference-fit pill. Shows the plain fit label ("Strong Fit" / "Good Fit" /
 * "Moderate Fit" / "Low Fit" / "Unscored") — never "Tier A". The colour system
 * (from TIER_STYLE) is preserved for fast visual scanning of conference quality.
 * (Internal name stays TierBadge to avoid churn across imports.)
 */
export function TierBadge({ tier, size = 'md' }: FitBadgeProps) {
  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (!tier) {
    return (
      <span
        className={`inline-flex items-center rounded-full border border-ink-200 bg-ink-100 font-medium text-ink-500 ${sizeCls}`}
      >
        Unscored
      </span>
    );
  }

  const style = TIER_STYLE[tier];
  const meta = TIER_MAP[tier];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${style.bg} ${style.border} ${style.text} ${sizeCls}`}
    >
      {meta.label}
    </span>
  );
}
