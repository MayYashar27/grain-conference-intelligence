import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

/** Consistent native select with a custom chevron — accessible and lightweight. */
export function Select({ label, options, className = '', id, ...props }: SelectProps) {
  return (
    <label className="flex flex-col gap-1">
      {label && (
        <span className="text-xs font-medium text-ink-500">{label}</span>
      )}
      <div className="relative">
        <select
          id={id}
          className={`w-full appearance-none rounded-lg border border-ink-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-ink-800 transition-colors hover:border-ink-300 focus:border-brand-400 focus:outline-none ${className}`}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"
        />
      </div>
    </label>
  );
}
