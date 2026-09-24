/**
 * Deterministic tests for Follow-up Priority + Leads-list ordering. No AI, no
 * network. Verifies the guardrails (ICP alone can't force High, negative/stalled
 * cap at Low, explicit demo/follow-up/pain lifts priority, unknown → Needs
 * research), that intent is read from RECENT MEANINGFUL notes (a newer empty
 * capture can't erase a signal), the expanded pain vocabulary, and the within-tier
 * ordering (Priority → Momentum → Stage → ICP → recency → stable id tie-breaker).
 * Run: node scripts/test-priority.ts
 */
import {
  computeFollowUpPriority,
  PRIORITY_RANK,
  compareByPriorityThenRecency,
  type PriorityInput,
  type PriorityRecencyRow,
} from '../src/lib/followUpPriority.ts';
import type { LeadResearch, RelationshipAssessment, FitLevel } from '../src/types/research.ts';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  cond ? passed++ : failed++;
}

const NOW = '2026-09-22T00:00:00Z';

function rel(stage: RelationshipAssessment['stage'], momentum: RelationshipAssessment['momentum']): RelationshipAssessment {
  return { stage, momentum, explanation: '' };
}
/** Minimal research fixture carrying just an ICP level. */
function research(icp: FitLevel): LeadResearch {
  return {
    researchedAt: NOW,
    person: { title: null, linkedinUrl: null, linkedinStatus: 'not_confidently_identified', context: null },
    company: { website: null, whatItDoes: null, category: null, markets: null },
    grainSignals: [],
    financialTechMaturity: { level: 'insufficient_evidence', explanation: '' },
    existingStack: [],
    buyingSignals: [],
    icpFit: { level: icp, explanation: '' },
    relationship: rel('new', 'insufficient_evidence'),
    salesMotion: { type: 'insufficient_evidence', explanation: '' },
    suggestedNextStep: null,
    sources: [],
  };
}
function I(occurredAt: string, note: string | null) {
  return { occurredAt, note };
}
function run(input: Partial<PriorityInput> & Pick<PriorityInput, 'relationship' | 'interactions'>) {
  return computeFollowUpPriority({ research: null, nowISO: NOW, ...input }).priority;
}

// High ICP ALONE (neutral momentum, engaged, no explicit ask) → NOT High.
check(
  'high ICP alone does not force High',
  run({
    research: research('high'),
    relationship: rel('engaged', 'neutral'),
    interactions: [I('2026-06-01T00:00:00Z', 'Chatted at the booth.'), I('2026-09-01T00:00:00Z', 'Discussed their payment setup.')],
  }) === 'medium',
);

// High ICP + explicit demo request + positive momentum → HIGH.
check(
  'high ICP + demo request + positive → High',
  run({
    research: research('high'),
    relationship: rel('evaluating', 'positive'),
    interactions: [I('2026-09-15T00:00:00Z', 'Asked for a demo next week.')],
  }) === 'high',
);

// High ICP + stalled + explicit "not a priority" → NOT High (Low).
check(
  'high ICP + stalled + "not a priority" → Low (not High)',
  run({
    research: research('high'),
    relationship: rel('stalled', 'negative'),
    interactions: [I('2026-03-01T00:00:00Z', "Said it's not a priority this year.")],
  }) === 'low',
);

// Recent clear pain point, no research → may be HIGH.
check(
  'recent pain point (unresearched) → High',
  run({
    relationship: rel('engaged', 'neutral'),
    interactions: [I('2026-09-18T00:00:00Z', 'Flagged a big reconciliation pain across currencies.')],
  }) === 'high',
);

// Explicit follow-up requested → High (intent is an internal fact).
check(
  'explicit follow-up requested → High',
  run({
    relationship: rel('engaged', 'neutral'),
    interactions: [I('2026-09-10T00:00:00Z', 'Asked me to follow up after their Q3 planning.')],
  }) === 'high',
);

// Explicit demo but weak (low) fit → tempered to Medium.
check(
  'demo request + low ICP → Medium (fit tempers)',
  run({
    research: research('low'),
    relationship: rel('evaluating', 'positive'),
    interactions: [I('2026-09-15T00:00:00Z', 'Asked for a demo.')],
  }) === 'medium',
);

// Unresearched + insufficient internal signal → NEEDS RESEARCH.
check(
  'unresearched + insufficient → Needs research',
  run({
    relationship: rel('new', 'insufficient_evidence'),
    interactions: [I('2026-09-15T00:00:00Z', 'Quick hello.')],
  }) === 'needs_research',
);

// Went cold / no response → Low.
check(
  'went cold → Low',
  run({
    research: research('high'),
    relationship: rel('engaged', 'neutral'),
    interactions: [I('2026-09-01T00:00:00Z', 'No response after several attempts.')],
  }) === 'low',
);

// Positive momentum + high ICP (no explicit ask) → High.
check(
  'positive momentum + high ICP → High',
  run({
    research: research('high'),
    relationship: rel('engaged', 'positive'),
    interactions: [I('2026-09-10T00:00:00Z', 'Keen to move forward and see more.')],
  }) === 'high',
);

// An old (non-recent) demo mention should not, by itself, be High.
check(
  'stale demo mention is not High',
  run({
    relationship: rel('stalled', 'negative'),
    interactions: [I('2025-01-01T00:00:00Z', 'Asked for a demo.')],
  }) === 'low',
);

// Change #2 — a newer EMPTY capture must not erase a meaningful recent signal.
check(
  'recent demo in an earlier note survives a newer empty capture → High',
  run({
    research: research('high'),
    relationship: rel('engaged', 'neutral'),
    interactions: [
      I('2026-09-10T00:00:00Z', 'Asked for a demo of multi-currency settlement.'),
      I('2026-09-20T00:00:00Z', ''), // newer, note-less touch
    ],
  }) === 'high',
);

// Change #2 — the signal may sit a step back (neutral latest note), still counts.
check(
  'pain in an earlier recent note is still detected under a neutral latest note',
  run({
    research: research('high'),
    relationship: rel('engaged', 'neutral'),
    interactions: [
      I('2026-09-08T00:00:00Z', 'Flagged reconciliation pain across payouts.'),
      I('2026-09-19T00:00:00Z', 'Sent over the deck.'),
    ],
  }) === 'high',
);

// Change #3 — expanded pain vocabulary: "complexity".
check(
  'expanded pain vocab: complexity → High (strong fit)',
  run({
    research: research('high'),
    relationship: rel('engaged', 'neutral'),
    interactions: [I('2026-09-12T00:00:00Z', 'Raised multi-market payout complexity across currencies.')],
  }) === 'high',
);

// Change #3 — expanded pain vocabulary: "reconciliation".
check(
  'expanded pain vocab: reconciliation → High (strong fit)',
  run({
    research: research('high'),
    relationship: rel('engaged', 'neutral'),
    interactions: [I('2026-09-12T00:00:00Z', 'Walked through their FX reconciliation workflow.')],
  }) === 'high',
);

// Ordering: High < Medium < Low < Needs research.
check(
  'priority rank ordering',
  PRIORITY_RANK.high < PRIORITY_RANK.medium &&
    PRIORITY_RANK.medium < PRIORITY_RANK.low &&
    PRIORITY_RANK.low < PRIORITY_RANK.needs_research,
);

// ── Leads-list ordering ──────────────────────────────────────────────────────
// Priority is the PRIMARY key; within a tier: Momentum → Stage → ICP → recency →
// stable id. Helper builds a row; override only the field a case is testing.
function row(over: Partial<PriorityRecencyRow> & Pick<PriorityRecencyRow, 'id'>) {
  return {
    priority: 'medium' as const,
    momentum: 'neutral' as const,
    stage: 'engaged' as const,
    icp: 'high' as const,
    latestAt: '2026-09-01T00:00:00Z',
    ...over,
  };
}
const sortIds = (rows: ReturnType<typeof row>[]) =>
  [...rows].sort(compareByPriorityThenRecency).map((r) => r.id);

// Priority remains the primary ordering, regardless of within-tier signals.
{
  const order = sortIds([
    row({ id: 'nr', priority: 'needs_research', momentum: 'positive', stage: 'evaluating' }),
    row({ id: 'low', priority: 'low', momentum: 'positive', stage: 'evaluating' }),
    row({ id: 'high', priority: 'high', momentum: 'negative', stage: 'stalled', icp: 'low' }),
    row({ id: 'med', priority: 'medium', momentum: 'negative', stage: 'stalled', icp: 'low' }),
  ]);
  check('priority is primary: High → Medium → Low → Needs research', order.join(',') === 'high,med,low,nr');
}

// Within a tier: Momentum Positive > Neutral > Insufficient > Negative.
{
  const order = sortIds([
    row({ id: 'neg', momentum: 'negative' }),
    row({ id: 'ins', momentum: 'insufficient_evidence' }),
    row({ id: 'neu', momentum: 'neutral' }),
    row({ id: 'pos', momentum: 'positive' }),
  ]);
  check('within tier: momentum order pos>neu>ins>neg', order.join(',') === 'pos,neu,ins,neg');
}

// Same momentum → Stage Evaluating > Engaged > New > Stalled.
{
  const order = sortIds([
    row({ id: 'stal', stage: 'stalled' }),
    row({ id: 'new', stage: 'new' }),
    row({ id: 'eng', stage: 'engaged' }),
    row({ id: 'eval', stage: 'evaluating' }),
  ]);
  check('within tier: stage order eval>eng>new>stalled', order.join(',') === 'eval,eng,new,stal');
}

// Same momentum + stage → ICP High > Medium > Low > Insufficient > (unresearched).
{
  const order = sortIds([
    row({ id: 'none', icp: null }),
    row({ id: 'ins', icp: 'insufficient_evidence' }),
    row({ id: 'low', icp: 'low' }),
    row({ id: 'med', icp: 'medium' }),
    row({ id: 'high', icp: 'high' }),
  ]);
  check('within tier: icp order high>med>low>ins>unresearched', order.join(',') === 'high,med,low,ins,none');
}

// All quality signals equal → most recent interaction first.
{
  const order = sortIds([
    row({ id: 'old', latestAt: '2026-08-15T00:00:00Z' }),
    row({ id: 'new', latestAt: '2026-09-20T00:00:00Z' }),
    row({ id: 'mid', latestAt: '2026-09-10T00:00:00Z' }),
  ]);
  check('within tier: newest interaction first', order.join(',') === 'new,mid,old');
}

// Everything equal (incl. timestamp) → deterministic stable id tie-breaker.
{
  const order = sortIds([
    row({ id: 'c' }),
    row({ id: 'a' }),
    row({ id: 'b' }),
  ]);
  check('deterministic final tie-breaker on id', order.join(',') === 'a,b,c');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
