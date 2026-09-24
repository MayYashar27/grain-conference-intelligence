/**
 * Deterministic relationship Stage + Momentum from INTERNAL interaction history
 * only (no AI, no public research). Pure and testable.
 *
 * Principles enforced here:
 *  - interaction COUNT alone never yields positive momentum
 *  - sparse/empty notes yield INSUFFICIENT_EVIDENCE, never invented intent
 *  - Stage = where the relationship is; Momentum = its direction (kept separate)
 */
import type { RelationshipAssessment } from '../types/research.js';

export interface RelInteraction {
  occurredAt: string;
  note: string | null;
}

const POSITIVE =
  /\b(demo|pilot|poc|proof of concept|proposal|evaluat|trial|interested|keen|moving forward|next steps?|asked for|requested|wants? to|onboard|contract|sign(ed|ing)?|budget approved|shortlist)\b/i;
const NEGATIVE =
  /\b(not a priority|no budget|budget freeze|not now|next year|not this year|stalled|on hold|de-?prioriti|declined|passed|no interest|not interested|revisit later|circle back next|went dark|no response)\b/i;
const EVALUATION = /\b(demo|pilot|poc|proof of concept|proposal|evaluat|trial|shortlist)\b/i;

const STALE_DAYS = 180;

function toMs(iso: string): number {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? NaN : d.getTime();
}

/** Analyze internal interactions into a Stage + Momentum assessment. */
export function analyzeRelationship(
  interactions: RelInteraction[],
  nowISO: string,
): RelationshipAssessment {
  const sorted = [...interactions]
    .filter((i) => !Number.isNaN(toMs(i.occurredAt)))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const n = sorted.length;

  if (n === 0) {
    return { stage: 'new', momentum: 'insufficient_evidence', explanation: 'No interactions recorded yet.' };
  }

  const notes = sorted.map((i) => (i.note ?? '').trim());
  const latestNote = notes[n - 1];
  const combined = notes.join(' • ');
  const hasAnyNote = notes.some((x) => x.length > 0);

  const pos = POSITIVE.test(combined);
  const neg = NEGATIVE.test(combined);
  const latestNeg = NEGATIVE.test(latestNote);
  const evalCue = EVALUATION.test(combined);

  const nowMs = toMs(nowISO);
  const lastMs = toMs(sorted[n - 1].occurredAt);
  const daysSinceLast =
    Number.isNaN(nowMs) || Number.isNaN(lastMs) ? 0 : Math.round((nowMs - lastMs) / 86_400_000);
  const stale = daysSinceLast > STALE_DAYS;

  // ── Stage ──────────────────────────────────────────────────────────────────
  let stage: RelationshipAssessment['stage'];
  if (n === 1) {
    stage = 'new';
  } else if (stale) {
    stage = 'stalled';
  } else if (evalCue) {
    stage = 'evaluating';
  } else {
    stage = 'engaged';
  }

  // ── Momentum ───────────────────────────────────────────────────────────────
  // Sparse/empty notes => insufficient (never invent intent; count is not signal).
  let momentum: RelationshipAssessment['momentum'];
  if (!hasAnyNote || (!pos && !neg && combined.replace(/[^a-z0-9]/gi, '').length < 12)) {
    momentum = 'insufficient_evidence';
  } else if (latestNeg) {
    momentum = 'negative';
  } else if (neg && !pos) {
    momentum = 'negative';
  } else if (pos && !stale) {
    momentum = 'positive';
  } else if (stale) {
    momentum = 'negative';
  } else {
    momentum = 'neutral';
  }

  // ── Explanation (deterministic, evidence-referencing) ───────────────────────
  const parts: string[] = [`${n} interaction${n === 1 ? '' : 's'} on record`];
  if (momentum === 'insufficient_evidence') {
    parts.push('notes are too sparse to judge direction');
  } else {
    if (latestNeg) parts.push('the latest note signals a blocker or deprioritization');
    else if (pos) parts.push('notes reference concrete interest (e.g. a demo or next step)');
    if (stale) parts.push(`no activity for ~${daysSinceLast} days`);
    if (!latestNeg && !pos && !stale) parts.push('notes are present but neutral');
  }
  return { stage, momentum, explanation: parts.join('; ') + '.' };
}
