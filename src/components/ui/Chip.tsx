import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  icon?: ReactNode;
  tone?: 'neutral' | 'brand';
}

/** Small, quiet metadata pill (vertical, region, etc.). */
export function Chip({ children, icon, tone = 'neutral' }: ChipProps) {
  const tones =
    tone === 'brand'
      ? 'bg-brand-50 text-brand-700 border-brand-200'
      : 'bg-white text-ink-600 border-ink-200';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${tones}`}
    >
      {icon && <span className="shrink-0 text-ink-400">{icon}</span>}
      {children}
    </span>
  );
}
