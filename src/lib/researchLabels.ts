import type {
  FitLevel,
  Maturity,
  Momentum,
  RelationshipStage,
  SalesMotion,
  StackRelation,
} from '../types/research';
import type { FollowUpPriority } from './followUpPriority';

interface Style {
  label: string;
  cls: string; // badge classes (bg/text/border)
}

/**
 * Follow-up Priority — the standout signal on a lead. High is a filled brand
 * chip so it reads as "act on this first"; the rest are quieter outlines.
 */
export const PRIORITY_STYLE: Record<FollowUpPriority, Style> = {
  high: { label: 'High', cls: 'bg-brand-600 text-white border-brand-600' },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'Low', cls: 'bg-ink-100 text-ink-600 border-ink-200' },
  needs_research: { label: 'Needs research', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
};

export const FIT_STYLE: Record<FitLevel, Style> = {
  high: { label: 'High', cls: 'bg-brand-50 text-brand-700 border-brand-200' },
  medium: { label: 'Medium', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  low: { label: 'Low', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  insufficient_evidence: { label: 'Insufficient evidence', cls: 'bg-ink-100 text-ink-500 border-ink-200' },
};

export const MOMENTUM_STYLE: Record<Momentum, Style> = {
  positive: { label: 'Positive', cls: 'bg-brand-50 text-brand-700 border-brand-200' },
  neutral: { label: 'Neutral', cls: 'bg-ink-100 text-ink-600 border-ink-200' },
  negative: { label: 'Negative', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  insufficient_evidence: { label: 'Insufficient evidence', cls: 'bg-ink-100 text-ink-500 border-ink-200' },
};

export const STAGE_STYLE: Record<RelationshipStage, Style> = {
  new: { label: 'New', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  engaged: { label: 'Engaged', cls: 'bg-brand-50 text-brand-700 border-brand-200' },
  evaluating: { label: 'Evaluating', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  stalled: { label: 'Stalled', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const MATURITY_LABEL: Record<Maturity, string> = {
  strong: 'Strong evidence of modern adoption',
  some: 'Some evidence',
  manual_legacy: 'Evidence of manual / legacy processes',
  insufficient_evidence: 'Insufficient evidence',
};

export const MOTION_LABEL: Record<SalesMotion, string> = {
  education_discovery: 'Education & discovery',
  transformation: 'Transformation',
  optimization: 'Optimization',
  differentiation_replacement: 'Differentiation / replacement',
  expansion_complement: 'Expansion / complement',
  insufficient_evidence: 'Insufficient evidence',
};

export const RELATION_STYLE: Record<StackRelation, Style> = {
  competitor_overlapping: { label: 'Overlapping', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  adjacent_complementary: { label: 'Adjacent', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  general_fintech: { label: 'General fintech', cls: 'bg-ink-100 text-ink-600 border-ink-200' },
  unclear: { label: 'Unclear', cls: 'bg-ink-100 text-ink-500 border-ink-200' },
};
