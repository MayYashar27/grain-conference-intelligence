/**
 * Deterministic tests for the Planning summary (counts + attention items). No Gemini.
 * Run: node scripts/test-planning-summary.ts
 */
import { buildPlanningSummary, type SummaryInput } from '../src/lib/planningSummary.ts';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  cond ? passed++ : failed++;
}

const NOW = '2026-09-22';
function c(startDate: string, endDate: string, attendance: SummaryInput['attendance'], relevant: boolean): SummaryInput {
  return { startDate, endDate, attendance, relevant };
}

// Counts (upcoming only) + undecided-with-trip item.
{
  const items: SummaryInput[] = [
    c('2026-10-01', '2026-10-02', 'attending', true),
    c('2026-10-06', '2026-10-07', 'undecided', true),
    c('2026-10-10', '2026-10-11', 'undecided', true),
    c('2026-11-01', '2026-11-02', 'undecided', true),
    c('2026-11-10', '2026-11-11', 'not_attending', true),
    c('2026-01-01', '2026-01-02', 'undecided', true), // past → excluded from counts
  ];
  const s = buildPlanningSummary(items, NOW, [3]); // a suggested trip with 3 undecided
  check('counts exclude past', s.counts.attending === 1 && s.counts.undecided === 3 && s.counts.notAttending === 1);
  const u = s.items.find((i) => i.id === 'undecided');
  check('undecided item present with trip combine', !!u && /3 conferences are still undecided/.test(u.text) && /3 of them can be combined into one suggested trip/.test(u.text) && u.hasTrip);
}

// Month with relevant Strong/Good Fit but none attending.
{
  const items: SummaryInput[] = [
    c('2027-02-05', '2027-02-06', 'undecided', true),
    c('2027-02-12', '2027-02-13', 'undecided', true),
    c('2027-02-20', '2027-02-21', 'undecided', true),
  ];
  const s = buildPlanningSummary(items, NOW, []);
  const m = s.items.find((i) => i.id === 'm-2027-02');
  check('month with no attending coverage flagged', !!m && /February 2027 has 3 Strong\/Good Fit conferences, but none are currently marked Attending/.test(m.text));
}

// Quiet: few undecided, some attending → no noisy items.
{
  const items: SummaryInput[] = [
    c('2026-10-01', '2026-10-02', 'attending', true),
    c('2026-10-06', '2026-10-07', 'attending', true),
    c('2026-11-01', '2026-11-02', 'undecided', true),
  ];
  const s = buildPlanningSummary(items, NOW, []);
  check('quiet state → no attention items', s.items.length === 0);
  check('counts still computed', s.counts.attending === 2 && s.counts.undecided === 1);
}

// Low-fit undecided do not create month items (relevance required).
{
  const items: SummaryInput[] = [
    c('2026-10-05', '2026-10-06', 'undecided', false),
    c('2026-10-12', '2026-10-13', 'undecided', false),
    c('2026-10-20', '2026-10-21', 'undecided', false),
  ];
  const s = buildPlanningSummary(items, NOW, []);
  // 3 undecided total → the undecided backlog line appears, but NO month gap item.
  check('low-fit → no month item', !s.items.some((i) => i.id.startsWith('m-')));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
