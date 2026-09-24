/**
 * Deterministic, explainable Follow-up Priority for a lead — answers
 * "who should I deal with first?" WITHOUT an opaque 0–100 AI score.
 *
 * It combines only signals we already have: ICP relevance (from persisted public
 * research), the live Relationship Stage + Momentum (from internal interactions),
 * recency, and explicit cues in the latest note (demo/follow-up requested, a
 * clear pain point, "not a priority", went cold).
 *
 * Guardrails (enforced by the rule ORDER below):
 *  - High ICP Fit ALONE never forces High.
 *  - Many interactions / a long-standing relationship never force High.
 *  - Negative or stalled signals cap priority at Low.
 *  - When the company is unresearched and internal signal is thin, the answer is
 *    NEEDS RESEARCH — we do not invent a priority.
 *
 * Pure and node-testable (no React / network).
 */
import type {
  FitLevel,
  LeadResearch,
  Momentum,
  RelationshipAssessment,
  RelationshipStage,
} from '../types/research';

export type FollowUpPriority = 'high' | 'medium' | 'low' | 'needs_research';

export interface PriorityInput {
  /** Persisted public research, or null if not researched yet. */
  research: LeadResearch | null;
  /** Live relationship assessment (from interaction history). */
  relationship: RelationshipAssessment;
  /** All interactions for the contact (order-independent). */
  interactions: { occurredAt: string; note: string | null }[];
  nowISO: string;
}

export interface PriorityResult {
  priority: FollowUpPriority;
  reason: string;
}

/** Sort rank — smaller = higher up the list. */
export const PRIORITY_RANK: Record<FollowUpPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  needs_research: 3,
};

/** Within-tier signal ranks (smaller = higher up). */
const MOMENTUM_RANK: Record<Momentum, number> = {
  positive: 0,
  neutral: 1,
  insufficient_evidence: 2,
  negative: 3,
};
const STAGE_RANK: Record<RelationshipStage, number> = {
  evaluating: 0,
  engaged: 1,
  new: 2,
  stalled: 3,
};
const ICP_RANK: Record<FitLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
  insufficient_evidence: 3,
};
/** Not-yet-researched (null) sorts just after the weakest researched level. */
function icpRank(level: FitLevel | null): number {
  return level ? ICP_RANK[level] : 4;
}

export interface PriorityRecencyRow {
  priority: FollowUpPriority;
  /** Live relationship momentum (from interaction history). */
  momentum: Momentum;
  /** Live relationship stage. */
  stage: RelationshipStage;
  /** ICP fit from persisted research, or null when not yet researched. */
  icp: FitLevel | null;
  /** ISO timestamp of the contact's MOST RECENT interaction ('' when none). */
  latestAt: string;
  /** Stable id — the deterministic final tie-breaker. */
  id: string;
}

/**
 * Leads-list ordering. Priority stays the PRIMARY sort (High → Medium → Low →
 * Needs research). WITHIN a priority group we then order by relationship-quality
 * signals — Momentum (Positive > Neutral > Insufficient > Negative), then Stage
 * (Evaluating > Engaged > New > Stalled), then ICP Fit (High > Medium > Low >
 * Insufficient) — then the most recent interaction first, and finally a stable id
 * tie-breaker so the order is always deterministic. This only affects DISPLAY
 * order; it never changes a lead's Priority/Stage/Momentum.
 */
export function compareByPriorityThenRecency(a: PriorityRecencyRow, b: PriorityRecencyRow): number {
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    MOMENTUM_RANK[a.momentum] - MOMENTUM_RANK[b.momentum] ||
    STAGE_RANK[a.stage] - STAGE_RANK[b.stage] ||
    icpRank(a.icp) - icpRank(b.icp) ||
    (b.latestAt || '').localeCompare(a.latestAt || '') ||
    a.id.localeCompare(b.id)
  );
}

const RECENT_DAYS = 120;

const DEMO_REQUEST = /\b(demo|pilot|poc|proof of concept|trial|walkthrough)\b/i;
const FOLLOW_UP =
  /\b(follow[- ]?up|circle back|reconnect|schedule a|book a|set up a|send (me|over|through)|next steps?|get back to)\b/i;
const PAIN =
  /\b(pain|painful|struggl\w*|problem|challeng\w*|complexit\w*|friction|bottleneck|reconcil\w*|manual (process|effort|work|reconcil\w*)|too (slow|costly|expensive|manual)|error[- ]?prone|inefficien\w*|headache)\b/i;
const DEPRIORITIZE =
  /\b(not a priority|no budget|budget freeze|not now|next year|not this year|de-?prioriti|on hold|declined|passed|not interested|revisit later)\b/i;
const WENT_COLD = /\b(went (dark|cold|quiet)|no response|no reply|ghosted|unresponsive|stopped responding)\b/i;

function toMs(iso: string): number {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? NaN : d.getTime();
}

export function computeFollowUpPriority(input: PriorityInput): PriorityResult {
  const { research, relationship, interactions, nowISO } = input;
  const { stage, momentum } = relationship;

  const sorted = [...interactions]
    .filter((i) => !Number.isNaN(toMs(i.occurredAt)))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const latest = sorted[sorted.length - 1];
  const latestNote = (latest?.note ?? '').trim();

  const nowMs = toMs(nowISO);
  const lastMs = latest ? toMs(latest.occurredAt) : NaN;
  const daysSinceLast =
    Number.isNaN(nowMs) || Number.isNaN(lastMs) ? Infinity : Math.round((nowMs - lastMs) / 86_400_000);
  const recent = daysSinceLast <= RECENT_DAYS;

  // Intent/pain/follow-up is read from the RECENT MEANINGFUL notes (within the
  // recency window, non-empty), not just the latest one — so a newer empty or
  // neutral capture can't erase a real recent buying signal. Deterministic.
  const recentText = sorted
    .filter((i) => {
      const t = toMs(i.occurredAt);
      if (Number.isNaN(nowMs) || Number.isNaN(t)) return false;
      return Math.round((nowMs - t) / 86_400_000) <= RECENT_DAYS;
    })
    .map((i) => (i.note ?? '').trim())
    .filter((n) => n.length > 0)
    .join(' • ');

  const demo = DEMO_REQUEST.test(recentText);
  const followUp = FOLLOW_UP.test(recentText);
  const pain = PAIN.test(recentText);
  // Blockers reflect the CURRENT state, so they are judged from the latest note.
  const deprioritized = DEPRIORITIZE.test(latestNote);
  const cold = WENT_COLD.test(latestNote);

  const icp = research?.icpFit.level;

  // 1) Explicit deprioritization / stall / negative momentum → capped at Low.
  if (deprioritized || cold || momentum === 'negative' || stage === 'stalled') {
    return {
      priority: 'low',
      reason: 'Recently stalled or deprioritized — de-emphasize until it re-warms.',
    };
  }

  // 2) Recent explicit intent (demo / follow-up / a clear pain point) → top.
  if (recent && (demo || followUp || pain)) {
    if (icp === 'low') {
      return { priority: 'medium', reason: 'Clear recent interest, but company fit looks weak.' };
    }
    return {
      priority: 'high',
      reason:
        demo || followUp
          ? 'A demo or follow-up was requested in a recent conversation.'
          : 'A clear pain point was raised in a recent conversation.',
    };
  }

  // 3) Unresearched + thin internal signal → research first, don't invent priority.
  if (!research && momentum === 'insufficient_evidence') {
    return {
      priority: 'needs_research',
      reason: 'Not enough context yet — research the company before prioritizing.',
    };
  }

  // 4) Earned positive momentum → strong, scaled by fit (not by ICP alone).
  if (momentum === 'positive') {
    if (icp === 'high') {
      return { priority: 'high', reason: 'Positive momentum with a strong company fit.' };
    }
    return { priority: 'medium', reason: 'Positive momentum from your recent interactions.' };
  }

  // 5) Some relevance (fit or an active stage) → worth a touch, not urgent.
  if (icp === 'high' || icp === 'medium' || stage === 'evaluating' || stage === 'engaged') {
    return { priority: 'medium', reason: 'Relevant, but no explicit next-step signal yet.' };
  }

  // 6) Otherwise: research if we still know little, else genuinely low.
  if (!research) {
    return {
      priority: 'needs_research',
      reason: 'Little is known yet — research to decide how to prioritize.',
    };
  }
  return { priority: 'low', reason: 'No strong fit or interest signals right now.' };
}
