import { Search, X } from 'lucide-react';
import type { Region, Tier, Vertical } from '../types/conference';
import {
  type FilterState,
  type SortKey,
  SORT_OPTIONS,
  isFilterActive,
} from '../lib/filters';
import { monthLabelLong } from '../lib/format';
import { TIER_MAP } from '../lib/scoring';
import { TIER_STYLE } from '../lib/ui';
import { Select } from './ui/Select';

interface FilterBarProps {
  filters: FilterState;
  sort: SortKey;
  onChange: (next: FilterState) => void;
  onSortChange: (sort: SortKey) => void;
  onClear: () => void;
  verticals: Vertical[];
  regions: Region[];
  months: number[];
}

const TIERS: Tier[] = ['A', 'B', 'C', 'D'];

export function FilterBar({
  filters,
  sort,
  onChange,
  onSortChange,
  onClear,
  verticals,
  regions,
  months,
}: FilterBarProps) {
  const toggleTier = (tier: Tier) => {
    const next = filters.tiers.includes(tier)
      ? filters.tiers.filter((t) => t !== tier)
      : [...filters.tiers, tier];
    onChange({ ...filters, tiers: next });
  };

  const active = isFilterActive(filters);

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {/* Search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Search by name, city, or country…"
            className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400 transition-colors hover:border-ink-300 focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div className="sm:w-64">
          <Select
            aria-label="Sort conferences"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            options={SORT_OPTIONS.map((o) => ({ value: o.key, label: `Sort · ${o.label}` }))}
          />
        </div>
      </div>

      {/* Dropdown filters */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select
          label="Vertical"
          value={filters.vertical}
          onChange={(e) =>
            onChange({ ...filters, vertical: e.target.value as Vertical | 'all' })
          }
          options={[
            { value: 'all', label: 'All verticals' },
            ...verticals.map((v) => ({ value: v, label: v })),
          ]}
        />
        <Select
          label="Region"
          value={filters.region}
          onChange={(e) => onChange({ ...filters, region: e.target.value as Region | 'all' })}
          options={[
            { value: 'all', label: 'All regions' },
            ...regions.map((r) => ({ value: r, label: r })),
          ]}
        />
        <Select
          label="Month"
          value={String(filters.month)}
          onChange={(e) =>
            onChange({
              ...filters,
              month: e.target.value === 'all' ? 'all' : Number(e.target.value),
            })
          }
          options={[
            { value: 'all', label: 'All months' },
            ...months.map((m) => ({ value: String(m), label: monthLabelLong(m) })),
          ]}
        />
      </div>

      {/* Fit chips + clear */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-ink-500">Fit</span>
          <div className="flex flex-wrap gap-1.5">
            {TIERS.map((tier) => {
              const selected = filters.tiers.includes(tier);
              const style = TIER_STYLE[tier];
              const shortLabel = TIER_MAP[tier].label.replace(' Fit', '');
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => toggleTier(tier)}
                  aria-pressed={selected}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                    selected
                      ? `${style.bg} ${style.border} ${style.text}`
                      : 'border-ink-200 bg-white text-ink-400 hover:border-ink-300 hover:text-ink-600'
                  }`}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        {active && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={14} />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
