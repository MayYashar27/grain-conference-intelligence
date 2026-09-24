/**
 * Deterministic tests for the follow-up email GROUNDING context (no Gemini).
 * Verifies the model is only ever handed facts we actually have, and that with
 * limited context we degrade to identity + relationship (never invented specifics).
 * Run: node scripts/test-email-draft.ts
 */
import { buildDraftContext, type DraftInteraction } from '../src/lib/emailDraft.ts';
import type { LeadResearch, RelationshipAssessment } from '../src/types/research.ts';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  cond ? passed++ : failed++;
}

function rel(stage: RelationshipAssessment['stage'], momentum: RelationshipAssessment['momentum']): RelationshipAssessment {
  return { stage, momentum, explanation: '' };
}
function research(over: Partial<LeadResearch> = {}): LeadResearch {
  return {
    researchedAt: '2026-09-22T00:00:00Z',
    person: { title: null, linkedinUrl: null, linkedinStatus: 'not_confidently_identified', context: null },
    company: { website: null, whatItDoes: null, category: null, markets: null },
    grainSignals: [], financialTechMaturity: { level: 'insufficient_evidence', explanation: '' },
    existingStack: [], buyingSignals: [], icpFit: { level: 'insufficient_evidence', explanation: '' },
    relationship: rel('new', 'insufficient_evidence'), salesMotion: { type: 'insufficient_evidence', explanation: '' },
    suggestedNextStep: null, sources: [], ...over,
  };
}
function I(occurredAt: string, note: string | null, conferenceName: string | null = null): DraftInteraction {
  return { occurredAt, note, conferenceName };
}

// Rich context → facts include role, company, stack, conference, note; hasRichContext.
{
  const ctx = buildDraftContext({
    fullName: 'Sofia Almeida',
    company: 'Booking.com',
    research: research({
      person: { title: 'Head of Payments', linkedinUrl: null, linkedinStatus: 'not_confidently_identified', context: null },
      company: { website: null, whatItDoes: 'Global travel platform with cross-border payments.', category: null, markets: null },
      existingStack: [{ name: 'Adyen', usedFor: null, relation: 'adjacent_complementary', source: 'https://x.com' }],
    }),
    relationship: rel('evaluating', 'positive'),
    interactions: [I('2026-09-10T00:00:00Z', 'Asked for a demo of multi-currency reconciliation.', 'Money20/20 USA')],
  });
  const joined = ctx.facts.join(' | ');
  check('rich: hasRichContext', ctx.hasRichContext);
  check('rich: role included', joined.includes('Head of Payments'));
  check('rich: company context included', joined.includes('cross-border payments'));
  check('rich: stack included', joined.includes('Adyen'));
  check('rich: conference context included', joined.includes('Money20/20 USA'));
  check('rich: latest note quoted verbatim', joined.includes('Asked for a demo of multi-currency reconciliation.'));
}

// Limited context → ONLY identity + relationship; nothing invented.
{
  const ctx = buildDraftContext({
    fullName: 'Dana Lee',
    company: 'Etsy',
    research: null,
    relationship: rel('new', 'insufficient_evidence'),
    interactions: [I('2026-09-15T00:00:00Z', null)],
  });
  check('limited: not rich', !ctx.hasRichContext);
  check('limited: exactly identity + relationship (2 facts)', ctx.facts.length === 2);
  check('limited: recipient fact present', ctx.facts[0].includes('Dana Lee') && ctx.facts[0].includes('Etsy'));
  check('limited: no fabricated note/company/tools', !/note|tools|Company context|Conference/.test(ctx.facts.join(' ')));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
