/**
 * Deterministic tests for trip clustering (no API, no dates-relative-to-today —
 * clustering itself is date-agnostic). Run: node scripts/test-trips.ts
 */
import { buildTripClusters, type TripInput } from '../src/lib/trips.ts';

type Att = TripInput['attendance'];
function t(
  id: string,
  startDate: string,
  endDate: string,
  travelRegion: string | null,
  attendance: Att,
): TripInput {
  return { id, startDate, endDate, travelRegion, attendance };
}

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (cond) passed++;
  else failed++;
}

// 1. Exactly 7-day gap → same trip (A ends Apr 3, B starts Apr 10).
{
  const c = buildTripClusters([
    t('a', '2027-04-01', '2027-04-03', 'Europe', 'attending'),
    t('b', '2027-04-10', '2027-04-11', 'Europe', 'attending'),
  ]);
  check('7-day gap → one trip of 2', c.length === 1 && c[0].stops.length === 2);
  check('7-day gap → recorded gapDays = 7', c[0]?.stops[1]?.gapDays === 7);
}

// 2. 8-day gap → NOT merged (A ends Apr 3, B starts Apr 11).
{
  const c = buildTripClusters([
    t('a', '2027-04-01', '2027-04-03', 'Europe', 'attending'),
    t('b', '2027-04-11', '2027-04-12', 'Europe', 'attending'),
  ]);
  check('8-day gap → separate (no 2-stop trip)', c.length === 0);
}

// 3. Overlapping conferences → same trip.
{
  const c = buildTripClusters([
    t('a', '2027-04-01', '2027-04-10', 'Europe', 'attending'),
    t('b', '2027-04-05', '2027-04-07', 'Europe', 'undecided'),
  ]);
  check('overlapping → one trip', c.length === 1 && c[0].stops.length === 2);
  check('overlap gap negative', (c[0]?.stops[1]?.gapDays ?? 0) < 0);
}

// 4. Same-day / back-to-back → allowed.
{
  const c = buildTripClusters([
    t('a', '2027-04-01', '2027-04-03', 'Europe', 'attending'),
    t('b', '2027-04-03', '2027-04-04', 'Europe', 'undecided'),
  ]);
  check('back-to-back (gap 0) → one trip', c.length === 1 && c[0].stops.length === 2);
}

// 5. Chain of 3, mixed attendance → one trip, insight for the single undecided.
{
  const c = buildTripClusters([
    t('a', '2027-04-01', '2027-04-03', 'Europe', 'attending'),
    t('b', '2027-04-08', '2027-04-10', 'Europe', 'undecided'),
    t('c', '2027-04-16', '2027-04-18', 'Europe', 'attending'),
  ]);
  check('chain of 3 → one trip of 3', c.length === 1 && c[0].stops.length === 3);
  check('gaps 5 then 6', c[0]?.stops[1]?.gapDays === 5 && c[0]?.stops[2]?.gapDays === 6);
  check('single-undecided count', c[0]?.undecidedCount === 1);
}

// 6. All undecided within 7 days → a SUGGESTED trip (no Attending anchor needed).
{
  const c = buildTripClusters([
    t('a', '2027-04-01', '2027-04-03', 'Europe', 'undecided'),
    t('b', '2027-04-05', '2027-04-06', 'Europe', 'undecided'),
  ]);
  check('all-undecided → suggested trip of 2', c.length === 1 && c[0].stops.length === 2);
  check('suggested trip has no attending anchor', c[0]?.attendingCount === 0);
}
// 6b. Not-attending between two undecided still cannot bridge (excluded → 11-day gap).
{
  const c = buildTripClusters([
    t('a', '2027-04-01', '2027-04-03', 'Europe', 'undecided'),
    t('b', '2027-04-08', '2027-04-09', 'Europe', 'not_attending'),
    t('c', '2027-04-14', '2027-04-16', 'Europe', 'undecided'),
  ]);
  check('not-attending cannot bridge undecided → no trip', c.length === 0);
}

// 7. Not-attending must NOT bridge (A..C 11 days apart, only not-attending B between).
{
  const c = buildTripClusters([
    t('a', '2027-04-01', '2027-04-03', 'Europe', 'attending'),
    t('b', '2027-04-08', '2027-04-09', 'Europe', 'not_attending'),
    t('c', '2027-04-14', '2027-04-16', 'Europe', 'attending'),
  ]);
  check('not-attending cannot bridge → no trip', c.length === 0);
}
// 7b. Same shape but the middle is Undecided → bridges into one trip of 3.
{
  const c = buildTripClusters([
    t('a', '2027-04-01', '2027-04-03', 'Europe', 'attending'),
    t('b', '2027-04-08', '2027-04-09', 'Europe', 'undecided'),
    t('c', '2027-04-14', '2027-04-16', 'Europe', 'attending'),
  ]);
  check('undecided middle bridges → trip of 3', c.length === 1 && c[0].stops.length === 3);
}

// 8. Different travel regions → separate (neither reaches 2).
{
  const c = buildTripClusters([
    t('a', '2027-04-01', '2027-04-03', 'Europe', 'attending'),
    t('b', '2027-04-04', '2027-04-05', 'Americas', 'attending'),
  ]);
  check('different regions → not merged', c.length === 0);
}
// 8b. Two Europe + one Americas → only the Europe pair forms a trip.
{
  const c = buildTripClusters([
    t('a', '2027-04-01', '2027-04-03', 'Europe', 'attending'),
    t('b', '2027-04-05', '2027-04-06', 'Europe', 'undecided'),
    t('x', '2027-04-05', '2027-04-06', 'Americas', 'attending'),
  ]);
  check('only same-region group clusters', c.length === 1 && c[0].travelRegion === 'Europe');
}

// 9. Unmappable (null) region → never grouped.
{
  const c = buildTripClusters([
    t('a', '2027-04-01', '2027-04-03', null, 'attending'),
    t('b', '2027-04-04', '2027-04-05', null, 'attending'),
  ]);
  check('null travel region → no trip', c.length === 0);
}

// 10. Cross-month trip.
{
  const c = buildTripClusters([
    t('a', '2027-04-28', '2027-04-30', 'Europe', 'attending'),
    t('b', '2027-05-03', '2027-05-05', 'Europe', 'undecided'),
  ]);
  check(
    'cross-month trip spans Apr→May',
    c.length === 1 && c[0].startDate === '2027-04-28' && c[0].endDate === '2027-05-05',
  );
}

// 11. Cross-year trip.
{
  const c = buildTripClusters([
    t('a', '2027-12-28', '2027-12-30', 'Europe', 'attending'),
    t('b', '2028-01-03', '2028-01-05', 'Europe', 'undecided'),
  ]);
  check(
    'cross-year trip spans Dec→Jan',
    c.length === 1 && c[0].startDate === '2027-12-28' && c[0].endDate === '2028-01-05',
  );
}

// 12. Missing/invalid dates do not break; invalid rows are excluded.
{
  const c = buildTripClusters([
    t('a', '', '', 'Europe', 'attending'),
    t('b', '2027-04-01', '2027-04-03', 'Europe', 'attending'),
    t('c', '2027-04-05', '2027-04-06', 'Europe', 'attending'),
  ]);
  check('invalid-date row excluded, rest cluster', c.length === 1 && c[0].stops.length === 2);
}

// 13. Two-undecided insight wording.
{
  const c = buildTripClusters([
    t('a', '2027-04-01', '2027-04-03', 'Europe', 'attending'),
    t('b', '2027-04-06', '2027-04-07', 'Europe', 'undecided'),
    t('c', '2027-04-11', '2027-04-12', 'Europe', 'undecided'),
  ]);
  check('two-undecided count', c[0]?.undecidedCount === 2);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
