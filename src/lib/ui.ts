import type { EvidenceConfidence, Tier } from '../types/conference';

/**
 * Centralized visual language for scores, tiers and confidence, so every
 * surface (cards, detail, badges) stays perfectly consistent.
 */

export interface TierStyle {
  text: string;
  bg: string;
  border: string;
  /** Hex for SVG strokes / inline styling. */
  hex: string;
  softHex: string;
}

export const TIER_STYLE: Record<Tier, TierStyle> = {
  A: {
    text: 'text-brand-700',
    bg: 'bg-brand-50',
    border: 'border-brand-200',
    hex: '#068f70',
    softHex: '#d1faec',
  },
  B: {
    text: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    hex: '#0284c7',
    softHex: '#e0f2fe',
  },
  C: {
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    hex: '#d97706',
    softHex: '#fef3c7',
  },
  D: {
    text: 'text-ink-600',
    bg: 'bg-ink-100',
    border: 'border-ink-200',
    hex: '#64748b',
    softHex: '#e2e7ee',
  },
};

/** Neutral style used when a conference has no assessable score. */
export const UNSCORED_STYLE: TierStyle = {
  text: 'text-ink-500',
  bg: 'bg-ink-100',
  border: 'border-ink-200',
  hex: '#97a3b6',
  softHex: '#eef1f5',
};

export interface ConfidenceStyle {
  label: string;
  /** Number of filled signal bars (1–3). */
  bars: number;
  text: string;
  hex: string;
  description: string;
}

export const CONFIDENCE_STYLE: Record<EvidenceConfidence, ConfidenceStyle> = {
  high: {
    label: 'High confidence',
    bars: 3,
    text: 'text-emerald-700',
    hex: '#059669',
    description: 'Public evidence for this conference is complete and consistent.',
  },
  medium: {
    label: 'Medium confidence',
    bars: 2,
    text: 'text-amber-700',
    hex: '#d97706',
    description: 'Reasonable public evidence, with some gaps or ambiguity.',
  },
  low: {
    label: 'Low confidence',
    bars: 1,
    text: 'text-rose-700',
    hex: '#e11d48',
    description: 'Limited public evidence — read this score with caution.',
  },
};

/** Color for an individual dimension bar based on its 0–100 value. */
export function dimensionHex(score: number | null): string {
  if (score === null) return '#cbd3df'; // ink-300 — insufficient evidence
  if (score >= 80) return '#068f70';
  if (score >= 60) return '#0284c7';
  if (score >= 40) return '#d97706';
  if (score >= 20) return '#f59e0b';
  return '#94a3b8';
}
