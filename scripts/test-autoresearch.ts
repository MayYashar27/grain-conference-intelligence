/**
 * Deterministic tests for the auto-research policy (change #4). No Gemini calls.
 *  - shouldAutoResearch: auto-run public research ONLY when none is persisted yet.
 *  - Relationship intelligence reflects the NEWEST interaction with zero Gemini
 *    cost, because analyzeRelationship is pure over the live interaction list.
 * Run: node scripts/test-autoresearch.ts
 */
import { shouldAutoResearch } from '../src/lib/researchPolicy.ts';
import { analyzeRelationship, type RelInteraction } from '../src/lib/relationship.ts';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  cond ? passed++ : failed++;
}

const NOW = '2027-01-10T00:00:00Z';
function I(occurredAt: string, note: string | null): RelInteraction {
  return { occurredAt, note };
}

console.log('Auto-research policy:');
// New/existing contact with no persisted research → auto-run.
check('no persisted research → auto-run', shouldAutoResearch(false) === true);
// Existing contact that already has research → do NOT auto-rerun on new interaction.
check('already researched → skip auto-run', shouldAutoResearch(true) === false);

console.log('\nRelationship reflects newest interaction (no Gemini):');
// A lead that has gone quiet reads as stalled/negative...
{
  const history: RelInteraction[] = [
    I('2026-06-01T10:00:00Z', 'Met at conference; good technical chat.'),
    I('2026-06-20T10:00:00Z', 'Said this is not a priority this year.'),
  ];
  const before = analyzeRelationship(history, NOW);
  check('quiet/negative history → momentum negative', before.momentum === 'negative');

  // ...and the instant a fresh positive interaction is captured, the SAME pure
  // function returns a warmer read — no persisted research, no model call.
  const after = analyzeRelationship(
    [...history, I('2027-01-08T10:00:00Z', 'Asked for a demo and pricing to evaluate.')],
    NOW,
  );
  check('new positive interaction → momentum positive', after.momentum === 'positive');
  check('new interaction advances stage to evaluating', after.stage === 'evaluating');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
