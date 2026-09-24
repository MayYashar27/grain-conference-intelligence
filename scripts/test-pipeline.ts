/**
 * Deterministic verification of the post-Gemini pipeline (no API needed):
 * validate → dedup → score. Run: node scripts/test-pipeline.ts
 */
import { validateCandidates } from '../server/discovery/validate.ts';
import { filterDuplicates, isDuplicate } from '../server/discovery/dedup.ts';
import { scoreConference } from '../src/lib/scoring.ts';

const nextYear = new Date().getFullYear() + 1;

/** ISO date N days from today (for run-date-independent future/past fixtures). */
function dISO(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Shared future date for the exact-duplicate fixture (same year on both sides). */
const DUP_DATE = dISO(45);

const raw = [
  {
    // 1. Strong, fully-scored, real sources.
    name: 'Cross-Border Payments Summit',
    start_date: `${nextYear}-05-10`,
    end_date: `${nextYear}-05-11`,
    location: { city: 'London', country: 'United Kingdom', region: 'Europe' },
    vertical: 'Payments',
    audience_size: { value: 1200, evidence: 'Official site states 1,200 attendees.' },
    official_url: 'https://cbps-summit.events/summit',
    dimensions: {
      company_fit: { score: 100, signals: ['PSPs', 'Cross-border platforms'], evidence: 'Exhibitors are PSPs.' },
      buyer_fit: { score: 75, signals: ['Treasury leaders'], evidence: 'Treasury track.' },
      agenda_relevance: { score: 100, signals: ['FX', 'Money movement'], evidence: 'FX is central.' },
      networking_opportunity: { score: 50, signals: ['Receptions'], evidence: 'Evening receptions.' },
    },
    evidence_confidence: 'high',
    sources: ['https://fintechnews.co/cbps'],
  },
  {
    // 2. Unknown dimensions must stay null; odd score 60 must snap to 50.
    name: 'Regional Treasury Days',
    start_date: `${nextYear}-09-02`,
    end_date: null,
    location: { city: 'Singapore', country: 'Singapore', region: 'Asia-Pacific' },
    vertical: 'Treasury & Finance',
    audience_size: null,
    official_url: 'https://treasurydays.co',
    dimensions: {
      company_fit: { score: 60, signals: ['Corporates'], evidence: 'Corporate treasuries.' },
      buyer_fit: { score: null, signals: [], evidence: null },
      agenda_relevance: { score: 75, signals: ['Treasury'], evidence: 'Treasury sessions.' },
      networking_opportunity: { score: null, signals: [], evidence: null },
    },
    evidence_confidence: 'high', // should be OVERRIDDEN by derived rule → medium
    sources: ['https://treasurydays.co/about'],
  },
  {
    // 3. Duplicate of an existing seed conference → removed by dedup.
    name: 'Money20/20 USA',
    start_date: DUP_DATE,
    end_date: DUP_DATE,
    location: { city: 'Las Vegas', country: 'United States', region: 'North America' },
    vertical: 'Payments',
    audience_size: { value: 11500, evidence: 'Official recap: 11,500 attendees.' },
    official_url: 'https://us.money2020.com',
    dimensions: {
      company_fit: { score: 100, signals: ['PSPs'], evidence: 'x' },
      buyer_fit: { score: 100, signals: [], evidence: 'x' },
      agenda_relevance: { score: 75, signals: [], evidence: 'x' },
      networking_opportunity: { score: 100, signals: [], evidence: 'x' },
    },
    evidence_confidence: 'high',
    sources: ['https://us.money2020.com'],
  },
  {
    // 4. Placeholder name → dropped.
    name: 'Example Conference',
    start_date: `${nextYear}-03-03`,
    end_date: `${nextYear}-03-04`,
    location: { city: 'X', country: 'Y', region: 'Europe' },
    vertical: 'Payments',
    audience_size: 100,
    official_url: 'https://example.com',
    dimensions: {
      company_fit: { score: 50, signals: [], evidence: null },
      buyer_fit: { score: null, signals: [], evidence: null },
      agenda_relevance: { score: null, signals: [], evidence: null },
      networking_opportunity: { score: null, signals: [], evidence: null },
    },
    evidence_confidence: 'low',
    sources: ['https://example.com'],
  },
  {
    // 5. No credible source → dropped.
    name: 'Unsourced Payments Forum',
    start_date: `${nextYear}-07-07`,
    end_date: `${nextYear}-07-08`,
    location: { city: 'Berlin', country: 'Germany', region: 'Europe' },
    vertical: 'Payments',
    audience_size: 500,
    official_url: null,
    dimensions: {
      company_fit: { score: 75, signals: [], evidence: null },
      buyer_fit: { score: 50, signals: [], evidence: null },
      agenda_relevance: { score: 50, signals: [], evidence: null },
      networking_opportunity: { score: null, signals: [], evidence: null },
    },
    evidence_confidence: 'medium',
    sources: ['not-a-url', 'ftp://bad'],
  },
  {
    // 6. Missing/invalid start date → dropped.
    name: 'Dateless FX Expo',
    start_date: null,
    end_date: null,
    location: { city: 'Dubai', country: 'UAE', region: 'Middle East' },
    vertical: 'Payments',
    audience_size: 3000,
    official_url: 'https://fxexpo.example.com',
    dimensions: {
      company_fit: { score: 75, signals: [], evidence: null },
      buyer_fit: { score: 50, signals: [], evidence: null },
      agenda_relevance: { score: 50, signals: [], evidence: null },
      networking_opportunity: { score: 50, signals: [], evidence: null },
    },
    evidence_confidence: 'medium',
    sources: ['https://fxexpo.example.com'],
  },
  {
    // 7. Evidence present but one dimension unclassified (null) → evidence preserved;
    //    unsupported audience (invalid value) → null.
    name: 'Evidence Retention Forum',
    start_date: `${nextYear}-06-15`,
    end_date: `${nextYear}-06-16`,
    location: { city: 'Paris', country: 'France', region: 'Europe' },
    vertical: 'Payments',
    audience_size: { value: 5000, evidence: null }, // estimated, no source → must become null
    official_url: 'https://evidence-retention.events',
    dimensions: {
      company_fit: { score: 75, signals: ['PSPs'], evidence: 'PSPs and processors attend.' },
      buyer_fit: { score: null, signals: [], evidence: 'Some finance leaders noted but role mix unclear.' },
      agenda_relevance: { score: 50, signals: ['FX'], evidence: 'FX appears in one track.' },
      networking_opportunity: { score: 25, signals: [], evidence: 'Standard breaks only.' },
    },
    evidence_confidence: 'medium',
    sources: ['https://evidence-retention.events'],
  },
  {
    // 8. Past event (ended before today) → removed by future-date backstop.
    name: 'Past Payments Expo',
    start_date: dISO(-40),
    end_date: dISO(-39),
    location: { city: 'Madrid', country: 'Spain', region: 'Europe' },
    vertical: 'Payments',
    audience_size: { value: 900, evidence: 'Organizer reported 900 attendees.' },
    official_url: 'https://past-payments-expo.events',
    dimensions: {
      company_fit: { score: 75, signals: ['PSPs'], evidence: 'PSPs attend.' },
      buyer_fit: { score: 50, signals: [], evidence: 'Some finance roles.' },
      agenda_relevance: { score: 50, signals: [], evidence: 'Payments track.' },
      networking_opportunity: { score: 50, signals: [], evidence: 'Receptions.' },
    },
    evidence_confidence: 'medium',
    sources: ['https://past-payments-expo.events'],
  },
  {
    // 9. Event currently in progress (started, not yet ended) → allowed.
    name: 'In-Progress Payments Week',
    start_date: dISO(-1),
    end_date: dISO(1),
    location: { city: 'Dublin', country: 'Ireland', region: 'Europe' },
    vertical: 'Payments',
    audience_size: { value: 2000, evidence: 'Official site: 2,000 delegates.' },
    official_url: 'https://in-progress-payments.events',
    dimensions: {
      company_fit: { score: 75, signals: ['PSPs'], evidence: 'PSPs attend.' },
      buyer_fit: { score: 75, signals: ['Treasury'], evidence: 'Treasury leaders.' },
      agenda_relevance: { score: 75, signals: ['FX'], evidence: 'FX track.' },
      networking_opportunity: { score: 50, signals: [], evidence: 'Receptions.' },
    },
    evidence_confidence: 'high',
    sources: ['https://in-progress-payments.events'],
  },
  {
    // 10. Future event with a SOURCED audience figure → audience preserved.
    name: 'Sourced Audience Forum',
    start_date: dISO(60),
    end_date: dISO(61),
    location: { city: 'Vienna', country: 'Austria', region: 'Europe' },
    vertical: 'Payments',
    audience_size: { value: 1200, evidence: 'Official site states 1,200 delegates attend.' },
    official_url: 'https://sourced-audience-forum.events',
    dimensions: {
      company_fit: { score: 75, signals: ['PSPs'], evidence: 'PSPs attend.' },
      buyer_fit: { score: 50, signals: [], evidence: 'Some finance roles.' },
      agenda_relevance: { score: 50, signals: [], evidence: 'Payments track.' },
      networking_opportunity: { score: 50, signals: [], evidence: 'Receptions.' },
    },
    evidence_confidence: 'medium',
    sources: ['https://sourced-audience-forum.events'],
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validated = validateCandidates(raw as any);
const existing = [{ name: 'Money20/20 USA', startDate: DUP_DATE }];
const final = filterDuplicates(validated, existing);

console.log(`\nRaw candidates in: ${raw.length}`);
console.log(`After validation: ${validated.length} (${validated.map((c) => c.name).join(' | ')})`);
console.log(`After dedup: ${final.length} (${final.map((c) => c.name).join(' | ')})\n`);

function check(label: string, pass: boolean) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`);
}

const byName = (n: string) => validated.find((c) => c.name === n);
const strong = byName('Cross-Border Payments Summit');
const treasury = byName('Regional Treasury Days');

check('placeholder "Example Conference" dropped', !byName('Example Conference'));
check('no-source candidate dropped', !byName('Unsourced Payments Forum'));
check('dateless candidate dropped', !byName('Dateless FX Expo'));
check('duplicate removed by dedup (Money20/20 USA)', !final.some((c) => c.name === 'Money20/20 USA'));
check('unknown buyer_fit stays null', treasury?.dimensions.buyerFit.score === null);
check('unknown networking stays null', treasury?.dimensions.networking.score === null);
check('odd score 60 snapped to 50', treasury?.dimensions.companyFit.score === 50);
check(
  'derived confidence for 2-assessed candidate = medium',
  treasury?.evidenceConfidence === 'medium',
);
check('end_date defaults to start_date when missing', treasury?.endDate === treasury?.startDate);
check('missing audience stays null', treasury?.audienceSize === null);

if (strong) {
  const res = scoreConference(strong);
  // 100*.35 + 75*.30 + 100*.20 + 50*.15 = 35+22.5+20+7.5 = 85 → Tier A
  check(`strong candidate scores 85 / Tier A (got ${res.score}/${res.tier})`, res.score === 85 && res.tier === 'A');
}
if (treasury) {
  const res = scoreConference(treasury);
  // assessed: company 50 (.35), agenda 75 (.20) → (17.5+15)/0.55 = 59 → Tier C
  check(`treasury normalizes over 2 dims to 59 / Tier C (got ${res.score}/${res.tier})`, res.score === 59 && res.tier === 'C');
}

// --- Scoring semantics + evidence retention ---
const retention = byName('Evidence Retention Forum');
check('strong evidence keeps its rubric score (company_fit = 75)', retention?.dimensions.companyFit.score === 75);
check('unclassifiable dimension stays null (buyer_fit)', retention?.dimensions.buyerFit.score === null);
check(
  'evidence preserved even when score is null',
  (retention?.dimensions.buyerFit.evidence ?? '').length > 0,
);
check('unsupported audience size becomes null', retention?.audienceSize === null);

// --- Future-event backstop ---
check('past event removed (end date before today)', !byName('Past Payments Expo'));
check('in-progress event allowed (started, not ended)', !!byName('In-Progress Payments Week'));
check('future event allowed', !!byName('Sourced Audience Forum'));

// --- Grounded audience size ---
check(
  'sourced audience figure preserved (1200)',
  byName('Sourced Audience Forum')?.audienceSize === 1200,
);
check(
  'in-progress sourced audience preserved (2000)',
  byName('In-Progress Payments Week')?.audienceSize === 2000,
);
check('missing audience (no object) → null', treasury?.audienceSize === null);

// --- Improved deduplication ---
console.log('\nDedup:');
const afpExisting = { name: 'AFP Annual Conference', startDate: '2026-10-18', city: 'San Diego', country: 'United States', url: 'https://www.afponline.org', sources: [] };
const afpVariant = { name: 'AFP 2026 Finance & Treasury Conference', startDate: '2026-11-08', city: 'Las Vegas', country: 'USA', url: 'https://conference.financialprofessionals.org/', sources: [] };
check('AFP name-variant detected as duplicate (acronym + year)', isDuplicate(afpVariant, afpExisting) === true);

const money26 = { name: 'Money20/20 USA', startDate: '2026-10-25', city: 'Las Vegas', country: 'United States', url: 'https://us.money2020.com', sources: [] };
const money27 = { name: 'Money20/20 USA', startDate: '2027-10-25', city: 'Las Vegas', country: 'United States', url: 'https://us.money2020.com', sources: [] };
check('exact same-year duplicate detected', isDuplicate({ ...money26 }, { ...money26 }) === true);
check('cross-year same event NOT a duplicate (different edition)', isDuplicate(money27, money26) === false);

const webSummit = { name: 'Web Summit', startDate: '2026-11-02', city: 'Lisbon', country: 'Portugal', url: 'https://websummit.com', sources: [] };
check('genuinely different same-year conf NOT a duplicate', isDuplicate(money26, webSummit) === false);

const meetup = { name: 'Fintech Meetup', startDate: '2027-02-22', city: 'Las Vegas', country: 'USA', url: 'https://fintechmeetup.com', sources: [] };
const connect = { name: 'Fintech Connect', startDate: '2027-02-24', city: 'London', country: 'UK', url: 'https://fintechconnect.com', sources: [] };
check('similar-but-different names NOT merged (overlap < 0.7)', isDuplicate(meetup, connect) === false);

const brandUsa = { name: 'Money20/20 USA', startDate: '2026-10-25', city: 'Las Vegas', country: 'USA', url: 'https://us.money2020.com', sources: [] };
const brandEu = { name: 'Money20/20 Europe', startDate: '2026-06-04', city: 'Amsterdam', country: 'Netherlands', url: 'https://europe.money2020.com', sources: [] };
check('same brand, different city NOT merged (domain guard)', isDuplicate(brandUsa, brandEu) === false);

console.log('');
