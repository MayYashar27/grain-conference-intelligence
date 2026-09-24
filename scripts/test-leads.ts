/**
 * Deterministic tests for the pure Phase 4A logic (no DB, no API):
 * phone normalization/identity and today's conference context.
 * DB-dependent scenarios (contact reuse, interactions, race, phone-edit
 * collision) are verified end-to-end after the migration is run.
 * Run: node scripts/test-leads.ts
 */
import { normalizePhone, isUsablePhone } from '../src/lib/phone.ts';
import { conferencesToday, type ContextConference } from '../src/lib/leadContext.ts';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  cond ? passed++ : failed++;
}

console.log('Phone normalization:');
// 1. Same number, different formatting → identical normalized value.
const variants = ['+972 50 123 4567', '+972-50-123-4567', '+972501234567', '00972501234567', '+972 (50) 123-4567'];
const normed = variants.map(normalizePhone);
check('all +972 variants normalize equal', new Set(normed).size === 1 && normed[0] === '+972501234567');

check('00 prefix treated as +', normalizePhone('0044 20 7946 0123') === '+442079460123');
check('parentheses/dashes stripped', normalizePhone('(050) 123-4567') === '0501234567');
check(
  'no country code invented (local ≠ international)',
  normalizePhone('050 123 4567') !== normalizePhone('+972501234567'),
);
check('empty/garbage → empty', normalizePhone('  --  ') === '' && normalizePhone('') === '');
check('isUsablePhone: valid true', isUsablePhone('+972 50 123 4567') === true);
check('isUsablePhone: too short false', isUsablePhone('123') === false);
check('isUsablePhone: empty false', isUsablePhone('') === false);

console.log("\nToday's conference context:");
const TODAY = '2027-04-10';
function c(id: string, attendanceStatus: string, startDate: string, endDate: string): ContextConference {
  return { id, attendanceStatus, startDate, endDate };
}

// 5. Exactly one attending conference today.
{
  const r = conferencesToday(
    [
      c('a', 'attending', '2027-04-08', '2027-04-12'), // spans today
      c('past', 'attending', '2027-04-01', '2027-04-05'), // attending but not today
      c('u', 'undecided', '2027-04-09', '2027-04-11'), // today but not attending
    ],
    TODAY,
  );
  check('exactly one attending today', r.length === 1 && r[0].id === 'a');
}

// 6. No attending conference today.
{
  const r = conferencesToday(
    [
      c('past', 'attending', '2027-04-01', '2027-04-05'),
      c('future', 'attending', '2027-05-01', '2027-05-03'),
      c('u', 'undecided', '2027-04-10', '2027-04-10'),
    ],
    TODAY,
  );
  check('no conference today → empty', r.length === 0);
}

// 7. Two attending conferences today.
{
  const r = conferencesToday(
    [
      c('a', 'attending', '2027-04-10', '2027-04-10'), // single day = today
      c('b', 'attending', '2027-04-08', '2027-04-11'), // spans today
    ],
    TODAY,
  );
  check('two attending today', r.length === 2);
}

// 8. Not-attending / undecided today do NOT count.
{
  const r = conferencesToday(
    [
      c('u', 'undecided', '2027-04-08', '2027-04-12'),
      c('n', 'not_attending', '2027-04-08', '2027-04-12'),
    ],
    TODAY,
  );
  check('undecided/not-attending today excluded', r.length === 0);
}

// Boundary: today exactly on start or end date is included.
{
  const r = conferencesToday(
    [
      c('start', 'attending', '2027-04-10', '2027-04-14'),
      c('end', 'attending', '2027-04-06', '2027-04-10'),
    ],
    TODAY,
  );
  check('date-range boundaries inclusive', r.length === 2);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
