import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

/**
 * Lightweight hover/focus tooltip anchored to a small info button. Used to keep
 * reference material (e.g. the tier scale) accessible without occupying the
 * main information hierarchy.
 */
export function InfoTooltip({
  children,
  label = 'More information',
  align = 'right',
}: {
  children: ReactNode;
  label?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <Info size={14} />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute top-7 z-20 w-56 rounded-lg border border-ink-200 bg-white p-3 text-left shadow-[0_8px_24px_-6px_rgba(15,23,42,0.2)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
