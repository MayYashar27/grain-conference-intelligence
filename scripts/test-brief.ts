/**
 * Deterministic tests for the paragraph-style sales Brief + Recommended Next Step.
 * Confirms: rich grounded intelligence (provider + what it's used for), no section
 * headings, selective bold, an emphasized grounded Sales angle, evidence-first
 * omission (no "no info" filler), and no leaked taxonomy. No AI, no network.
 * Run: node scripts/test-brief.ts
 */
import { composeLeadBrief, recommendedNextStep } from '../src/lib/leadBrief.ts';
import type { LeadResearch, RelationshipAssessment, StackItem } from '../src/types/research.ts';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  cond ? passed++ : failed++;
}

function rel(stage: RelationshipAssessment['stage'], momentum: RelationshipAssessment['momentum']): RelationshipAssessment {
  return { stage, momentum, explanation: '' };
}
function baseResearch(over: Partial<LeadResearch> = {}): LeadResearch {
  return {
    researchedAt: '2026-09-22T00:00:00Z',
    person: { title: null, linkedinUrl: null, linkedinStatus: 'not_confidently_identified', context: null },
    company: { website: null, whatItDoes: null, category: null, markets: null },
    grainSignals: [],
    financialTechMaturity: { level: 'insufficient_evidence', explanation: '' },
    existingStack: [],
    buyingSignals: [],
    icpFit: { level: 'insufficient_evidence', explanation: '' },
    relationship: rel('new', 'insufficient_evidence'),
    salesMotion: { type: 'insufficient_evidence', explanation: '' },
    suggestedNextStep: null,
    sources: [],
    ...over,
  };
}
function stack(name: string, relation: StackItem['relation'], usedFor: string | null = null): StackItem {
  return { name, usedFor, relation, source: 'https://example.com' };
}

const TABOO = [
  'competitor_overlapping', 'adjacent_complementary', 'general_fintech',
  'Adjacent', 'Overlapping', 'General fintech', 'manual_legacy', 'Maturity',
  'maturity', 'Sales motion', 'insufficient_evidence', 'COMPANY', 'EXISTING FINANCIAL STACK',
];

// Rich research → paragraphs with grounded provider PURPOSES + bold, no taxonomy.
{
  const r = baseResearch({
    person: { title: 'SVP of FinTech', linkedinUrl: null, linkedinStatus: 'not_confidently_identified', context: null },
    company: { website: 'https://booking.com', whatItDoes: 'Global online travel agency and marketplace across accommodations, flights, rental cars and experiences.', category: 'Travel', markets: 'Global' },
    financialTechMaturity: { level: 'strong', explanation: '' },
    existingStack: [
      stack('Adyen', 'adjacent_complementary', 'Primary processor for global card processing and local payment methods.'),
      stack('WEX', 'general_fintech', 'Preferred provider for issuing virtual cards used in partner payouts.'),
    ],
    icpFit: { level: 'high', explanation: '' },
    suggestedNextStep: 'Follow up with the requested demo, focusing on multi-currency settlement.',
  });
  const { paragraphs, nextStep } = composeLeadBrief({ research: r, relationship: rel('evaluating', 'positive'), fullName: 'Daniel Marovitz', company: 'Booking.com' });
  const all = paragraphs.map((p) => p.text).join(' | ');
  const angle = paragraphs.find((p) => p.emphasis);
  check('company paragraph present', paragraphs[0].text.includes('travel agency'));
  check('stack keeps provider PURPOSE, not just names', all.includes('**Adyen** for global card processing and local payment methods') && all.includes('**WEX** for issuing virtual cards used in partner payouts'));
  check('role bolded in a paragraph', all.includes('**Daniel is SVP of FinTech**'));
  check('sales angle is emphasized + prefixed + grounded', !!angle && angle.text.startsWith('**Sales angle:**') && /complement or improvement/i.test(angle.text));
  check('relationship bolds the conclusion', all.includes('**positive momentum**'));
  check('no headings / taxonomy leaked', !TABOO.some((t) => all.includes(t)));
  check('next step reuses the researched step', nextStep === r.suggestedNextStep);
}

// Overlapping stack, no usedFor → bold names, grounded complement angle.
{
  const r = baseResearch({
    company: { website: null, whatItDoes: 'A global marketplace.', category: null, markets: null },
    existingStack: [stack('Kyriba', 'competitor_overlapping')],
    financialTechMaturity: { level: 'strong', explanation: '' },
    icpFit: { level: 'high', explanation: '' },
  });
  const { paragraphs } = composeLeadBrief({ research: r, relationship: rel('engaged', 'neutral'), fullName: 'Dana Lee', company: 'Etsy' });
  const all = paragraphs.map((p) => p.text).join(' | ');
  check('stack bolds provider even without usedFor', all.includes('**Kyriba**'));
  check('angle grounded in existing infrastructure', /complement or improvement/i.test(paragraphs.find((p) => p.emphasis)!.text));
}

// Manual/legacy, no stack → NO stack paragraph, modernization angle.
{
  const r = baseResearch({
    company: { website: null, whatItDoes: 'A regional retailer.', category: null, markets: null },
    financialTechMaturity: { level: 'manual_legacy', explanation: '' },
  });
  const { paragraphs } = composeLeadBrief({ research: r, relationship: rel('new', 'insufficient_evidence'), fullName: 'Sam Ray', company: 'Acme' });
  const all = paragraphs.map((p) => p.text).join(' | ');
  check('no stack paragraph when no stack evidence', !all.includes('The company uses'));
  check('modernization angle, not the enum', /modernizing/i.test(all) && !all.includes('manual_legacy'));
}

// No research → only Sales angle + Relationship paragraphs.
{
  const { paragraphs, nextStep } = composeLeadBrief({ research: null, relationship: rel('evaluating', 'positive'), fullName: 'A B', company: 'Co' });
  check('no-research → at most angle + relationship (<=2 paragraphs)', paragraphs.length <= 2 && paragraphs.some((p) => p.emphasis));
  check('positive relationship next step is a follow-up', /follow up/i.test(nextStep));
}

// Fallbacks.
check('negative → re-establish', /re-establish/i.test(recommendedNextStep(null, rel('stalled', 'negative'))));
check('new/insufficient → gather context', /gather more context/i.test(recommendedNextStep(null, rel('new', 'insufficient_evidence'))));
check('no generic "reach out to learn more"', !/reach out to learn more/i.test(recommendedNextStep(null, rel('engaged', 'neutral'))));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
