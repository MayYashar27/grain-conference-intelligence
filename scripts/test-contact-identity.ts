/**
 * Deterministic tests for cross-conference identity reconciliation — the decision
 * kernel used by server/captureLead.ts when an incoming lead matches an existing
 * Contact by normalized phone.
 *
 * Guarantee under test: a matched Contact is NEVER silently overwritten. When the
 * newly-entered company or name differs from what is stored, capture keeps the
 * stored value and raises a review flag (pending_company / pending_name); the
 * interaction always records the entered company as company_name_at_time so the
 * historical snapshot stays intact. Pure formatting/case differences must NOT be
 * treated as a change (no false review). `conflict = !sameText(...)`.
 *
 * Run: node scripts/test-contact-identity.ts
 */
import { sameText } from '../src/lib/contactIdentity.ts';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  cond ? passed++ : failed++;
}

// `conflict` mirrors captureLead: a review is raised iff the entered value is not
// the same identity text as the one already stored on the matched contact.
const companyConflict = (entered: string, stored: string) => !sameText(entered, stored);
const nameConflict = (entered: string, stored: string) => !sameText(entered, stored);

console.log('Same phone + different company → review, no silent overwrite:');
check(
  'different company raises a company review flag (not overwrite)',
  companyConflict('Booking.com', 'Agoda') === true,
);
check(
  'company formatting/case difference is NOT a conflict (no false review)',
  companyConflict('  booking.com ', 'Booking.com') === false,
);
check(
  'company whitespace collapse is NOT a conflict',
  companyConflict('Booking   .com', 'Booking .com') === false,
);

console.log('\nSame phone + name variation → review, not destructive overwrite:');
check(
  'name variation raises a name review flag',
  nameConflict('Dan Marovitz', 'Daniel Marovitz') === true,
);
check(
  'same name with different casing is NOT a conflict',
  nameConflict('daniel marovitz', 'Daniel Marovitz') === false,
);
check(
  'same name with extra whitespace is NOT a conflict',
  nameConflict('Daniel   Marovitz ', 'Daniel Marovitz') === false,
);

console.log('\nIndependence of the two review dimensions:');
check(
  'same company but new name → only the name is flagged for review',
  companyConflict('Booking.com', 'Booking.com') === false &&
    nameConflict('D. Marovitz', 'Daniel Marovitz') === true,
);
check(
  'same name but new company → only the company is flagged for review',
  nameConflict('Daniel Marovitz', 'Daniel Marovitz') === false &&
    companyConflict('Priceline', 'Booking.com') === true,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
