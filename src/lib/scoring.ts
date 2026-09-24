/**
 * Conference Fit scoring engine.
 *
 * Four weighted dimensions produce a single normalized 0–100 fit score.
 * The two principles that make this defensible:
 *
 *  1. Missing evidence is NOT zero. A dimension with `score: null` is excluded
 *     and the remaining weights are normalized back to 100%.
 *  2. The score measures FIT only. It never claims a conference must be attended —
 *     timing, geography, and cost belong to the later planning layer.
 */
import type {
  Conference,
  DimensionAssessment,
  DimensionKey,
  Tier,
} from '../types/conference';

export interface DimensionMeta {
  key: DimensionKey;
  label: string;
  weight: number; // 0..1
  /** The question this dimension answers, shown in the breakdown UI. */
  question: string;
  /** Short description of what evidence feeds it. */
  evidenceHint: string;
}

/** Ordered by weight, highest first — this is also the display order. */
export const DIMENSIONS: DimensionMeta[] = [
  {
    key: 'companyFit',
    label: 'Company Fit',
    weight: 0.35,
    question:
      'How strongly does the audience represent companies that could realistically need Grain?',
    evidenceHint: 'Who Attends · Sponsors · Exhibitors · Partners · Audience profile',
  },
  {
    key: 'buyerFit',
    label: 'Buyer Fit',
    weight: 0.3,
    question:
      'Are people who could buy, champion, or influence adoption of Grain likely to attend?',
    evidenceHint: 'Speaker titles · Attendee personas · Who Attends · Positioning',
  },
  {
    key: 'agendaRelevance',
    label: 'Agenda Relevance',
    weight: 0.2,
    question: 'How closely does the content overlap with the problems Grain solves?',
    evidenceHint: 'Tracks · Sessions · Themes (FX, cross-border, treasury, payments)',
  },
  {
    key: 'networking',
    label: 'Networking Opportunity',
    weight: 0.15,
    question: 'How intentionally does the conference help attendees form commercial relationships?',
    evidenceHint: 'Matchmaking · 1:1 meetings · Hosted buyers · Receptions · Lounges',
  },
];

export const DIMENSION_MAP: Record<DimensionKey, DimensionMeta> = DIMENSIONS.reduce(
  (acc, d) => {
    acc[d.key] = d;
    return acc;
  },
  {} as Record<DimensionKey, DimensionMeta>,
);

/** Rubric anchors, shared by the detail view and the manual-entry form. */
export const RUBRIC: { value: number; label: string }[] = [
  { value: 100, label: 'Very High' },
  { value: 75, label: 'High' },
  { value: 50, label: 'Medium' },
  { value: 25, label: 'Low' },
  { value: 0, label: 'No Fit' },
];

export interface ScoreResult {
  /** Normalized 0–100 score, or null when no dimension could be assessed. */
  score: number | null;
  tier: Tier | null;
  /** Sum of weights that were actually assessed (0..1). */
  assessedWeight: number;
  /** How many of the four dimensions had evidence. */
  assessedCount: number;
  /** True when at least one dimension is Insufficient Evidence. */
  hasGaps: boolean;
}

/**
 * Compute the normalized Conference Fit Score.
 *
 * Normalized Score = weighted sum of assessed dimensions / sum of assessed weights.
 * With all four present this equals the plain weighted average; with a gap it
 * redistributes the missing weight proportionally across what remains.
 */
export function computeScore(
  dimensions: Record<DimensionKey, DimensionAssessment>,
): ScoreResult {
  let weightedSum = 0;
  let assessedWeight = 0;
  let assessedCount = 0;

  for (const dim of DIMENSIONS) {
    const assessment = dimensions[dim.key];
    if (!assessment || assessment.score === null) continue;
    weightedSum += assessment.score * dim.weight;
    assessedWeight += dim.weight;
    assessedCount += 1;
  }

  const hasGaps = assessedCount < DIMENSIONS.length;

  if (assessedWeight === 0) {
    return { score: null, tier: null, assessedWeight: 0, assessedCount: 0, hasGaps: true };
  }

  const normalized = Math.round(weightedSum / assessedWeight);
  return {
    score: normalized,
    tier: tierForScore(normalized),
    assessedWeight,
    assessedCount,
    hasGaps,
  };
}

export interface TierMeta {
  tier: Tier;
  label: string;
  range: string;
  min: number;
}

/** Tier definitions. Deliberately NOT "Must Attend" — this is fit, not a verdict. */
export const TIERS: TierMeta[] = [
  { tier: 'A', label: 'Strong Fit', range: '80–100', min: 80 },
  { tier: 'B', label: 'Good Fit', range: '60–79', min: 60 },
  { tier: 'C', label: 'Moderate Fit', range: '40–59', min: 40 },
  { tier: 'D', label: 'Low Fit', range: '0–39', min: 0 },
];

export const TIER_MAP: Record<Tier, TierMeta> = TIERS.reduce((acc, t) => {
  acc[t.tier] = t;
  return acc;
}, {} as Record<Tier, TierMeta>);

export function tierForScore(score: number): Tier {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

/** Convenience: compute the score for a full conference record. */
export function scoreConference(conference: Conference): ScoreResult {
  return computeScore(conference.dimensions);
}
