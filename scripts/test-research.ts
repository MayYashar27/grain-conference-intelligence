/**
 * Deterministic tests for Phase 4B logic (no Gemini):
 * relationship analysis + research validation (evidence-first rules).
 * Persistence/no-rerun-on-load is verified end-to-end after the migration.
 * Run: node scripts/test-research.ts
 */
import { analyzeRelationship, type RelInteraction } from '../src/lib/relationship.ts';
import { validatePublicResearch } from '../server/research/validate.ts';
import type { RawResearch } from '../server/research/schema.ts';

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

console.log('Relationship analysis:');
// Demo ask on a first meeting → NEW + POSITIVE.
{
  const r = analyzeRelationship([I('2027-01-05T10:00:00Z', 'Asked for a demo of multi-currency settlement.')], NOW);
  check('first meeting demo → stage new, momentum positive', r.stage === 'new' && r.momentum === 'positive');
}
// Interaction COUNT alone (no notes) must NOT be positive → insufficient.
{
  const r = analyzeRelationship(
    [I('2027-01-01T00:00:00Z', null), I('2027-01-03T00:00:00Z', null), I('2027-01-05T00:00:00Z', null), I('2027-01-07T00:00:00Z', null)],
    NOW,
  );
  check('4 interactions, no notes → momentum insufficient (not positive)', r.momentum === 'insufficient_evidence');
}
// Sparse note → insufficient.
{
  const r = analyzeRelationship([I('2027-01-05T00:00:00Z', 'ok')], NOW);
  check('sparse note → momentum insufficient', r.momentum === 'insufficient_evidence');
}
// Several meetings, latest is a blocker → NEGATIVE, stage engaged (recent).
{
  const r = analyzeRelationship(
    [I('2027-01-02T00:00:00Z', 'Good intro chat about cross-border.'), I('2027-01-06T00:00:00Z', 'Said FX is not a priority this year.')],
    NOW,
  );
  check('latest blocker → momentum negative', r.momentum === 'negative');
  check('recent multi-meeting → stage engaged', r.stage === 'engaged');
}
// Repeated encounters gone cold (stale) → STALLED + not positive.
{
  const r = analyzeRelationship(
    [I('2026-01-02T00:00:00Z', 'Chatted at booth.'), I('2026-02-06T00:00:00Z', 'Brief follow up.'), I('2026-03-06T00:00:00Z', 'Another quick hello.')],
    NOW,
  );
  check('stale repeated encounters → stage stalled', r.stage === 'stalled');
  check('stale → momentum not positive', r.momentum !== 'positive');
}

console.log('\nResearch validation:');
function baseRaw(): RawResearch {
  return {
    person: { title: 'Head of Treasury', linkedin_url: null, linkedin_status: 'not_confidently_identified', context: null },
    company: { website: 'https://acme-corp.example', what_it_does: 'Payments', category: null, markets: null },
    grain_signals: [],
    financial_tech_maturity: { level: 'insufficient_evidence', explanation: 'Not enough evidence.' },
    existing_stack: [],
    buying_signals: [],
    icp_fit: { level: 'medium', explanation: 'Payments company with cross-border hints.' },
    sales_motion: { type: 'insufficient_evidence', explanation: '' },
    suggested_next_step: null,
    sources: [{ url: 'https://realsource.co/acme', title: 'Acme' }],
  };
}

// Ambiguous LinkedIn → no association.
{
  const raw = baseRaw();
  raw.person.linkedin_url = 'https://linkedin.com/in/someone';
  raw.person.linkedin_status = 'not_confidently_identified';
  const v = validatePublicResearch(raw);
  check('ambiguous linkedin not associated', v.person.linkedinUrl === null && v.person.linkedinStatus === 'not_confidently_identified');
}
// Confident but non-linkedin URL → rejected.
{
  const raw = baseRaw();
  raw.person.linkedin_url = 'https://twitter.com/someone';
  raw.person.linkedin_status = 'confident';
  const v = validatePublicResearch(raw);
  check('confident + non-linkedin url → rejected', v.person.linkedinUrl === null);
}
// Confident + real linkedin profile → kept.
{
  const raw = baseRaw();
  raw.person.linkedin_url = 'https://www.linkedin.com/in/jane-doe';
  raw.person.linkedin_status = 'confident';
  const v = validatePublicResearch(raw);
  check('confident + real linkedin → kept', v.person.linkedinUrl === 'https://www.linkedin.com/in/jane-doe' && v.person.linkedinStatus === 'confident');
}
// manual_legacy without evidence → insufficient.
{
  const raw = baseRaw();
  raw.financial_tech_maturity = { level: 'manual_legacy', explanation: '' };
  const v = validatePublicResearch(raw);
  check('legacy without evidence → insufficient', v.financialTechMaturity.level === 'insufficient_evidence');
}
// manual_legacy WITH evidence → kept.
{
  const raw = baseRaw();
  raw.financial_tech_maturity = { level: 'manual_legacy', explanation: 'Careers page describes manual spreadsheet-based reconciliation across regional bank portals.' };
  const v = validatePublicResearch(raw);
  check('legacy with evidence → kept', v.financialTechMaturity.level === 'manual_legacy');
}
// Generic next step → null.
{
  const raw = baseRaw();
  raw.suggested_next_step = 'Reach out to learn more about their needs.';
  const v = validatePublicResearch(raw);
  check('generic next step → null', v.suggestedNextStep === null);
}
// Specific next step → kept.
{
  const raw = baseRaw();
  raw.suggested_next_step = 'Follow up on the reconciliation pain raised last meeting; position against their existing FX provider.';
  const v = validatePublicResearch(raw);
  check('specific next step → kept', typeof v.suggestedNextStep === 'string' && v.suggestedNextStep.length > 0);
}
// Placeholder source dropped; stack relation coerced.
{
  const raw = baseRaw();
  raw.sources = [{ url: 'https://example.com/x', title: 'x' }, { url: 'https://real.co/y', title: 'y' }];
  raw.existing_stack = [{ name: 'SomeVendor', used_for: 'payments', relation: 'not-a-real-value', source: 'https://real.co/vendor' }];
  const v = validatePublicResearch(raw);
  check('example.com source dropped, real kept', v.sources.length === 1 && v.sources[0].url === 'https://real.co/y');
  check('invalid stack relation → unclear', v.existingStack[0].relation === 'unclear');
}
// Unsourced public claims are dropped (traceability); sourced ones kept.
{
  const raw = baseRaw();
  raw.grain_signals = [
    { label: 'Cross-border', evidence: 'Operates in many countries.', source: null },
    { label: 'Multi-currency', evidence: 'Supports 20 currencies.', source: 'https://real.co/mc' },
  ];
  raw.existing_stack = [
    { name: 'UnsourcedVendor', used_for: 'payments', relation: 'general_fintech', source: null },
    { name: 'SourcedVendor', used_for: 'treasury', relation: 'adjacent_complementary', source: 'https://real.co/v' },
  ];
  raw.buying_signals = [{ label: 'Expansion', evidence: 'Entering new markets.', source: null }];
  const v = validatePublicResearch(raw);
  check('unsourced grain signal dropped, sourced kept', v.grainSignals.length === 1 && v.grainSignals[0].label === 'Multi-currency');
  check('unsourced vendor dropped, sourced kept', v.existingStack.length === 1 && v.existingStack[0].name === 'SourcedVendor');
  check('unsourced buying signal dropped', v.buyingSignals.length === 0);
}

// No fabrication: empty evidence stays insufficient.
{
  const raw = baseRaw();
  raw.icp_fit = { level: 'insufficient_evidence', explanation: 'Thin evidence.' };
  const v = validatePublicResearch(raw);
  check('insufficient ICP stays insufficient', v.icpFit.level === 'insufficient_evidence');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
