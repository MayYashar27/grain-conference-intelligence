import type { EvidenceConfidence } from '../../types/conference';
import { CONFIDENCE_STYLE } from '../../lib/ui';

interface ConfidenceSignalProps {
  confidence: EvidenceConfidence;
  withLabel?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Evidence-confidence indicator, drawn as signal-strength bars so it reads as a
 * distinct signal from the fit score. A score of 90 with one bar (Low) should
 * look meaningfully different from 90 with three bars (High).
 */
export function ConfidenceSignal({
  confidence,
  withLabel = true,
  size = 'md',
}: ConfidenceSignalProps) {
  const style = CONFIDENCE_STYLE[confidence];
  const barW = size === 'sm' ? 3 : 3.5;
  const heights = size === 'sm' ? [6, 9, 12] : [7, 11, 15];

  return (
    <span className="inline-flex items-center gap-1.5" title={style.description}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {heights.map((h, i) => (
          <span
            key={i}
            style={{
              width: barW,
              height: h,
              backgroundColor: i < style.bars ? style.hex : '#e2e7ee',
              borderRadius: 1,
            }}
          />
        ))}
      </span>
      {withLabel && (
        <span className={`font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'} ${style.text}`}>
          {style.label}
        </span>
      )}
    </span>
  );
}
