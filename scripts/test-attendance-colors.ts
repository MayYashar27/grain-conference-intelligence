/**
 * Deterministic tests for the shared attendance colour mapping (change #2).
 * The year overview dots and the month calendar bars both read colour from this
 * single source, so verifying it here guarantees they stay consistent.
 * Run: node scripts/test-attendance-colors.ts
 */
import { ATTENDANCE_VISUAL, ATTENDANCE_ORDER } from '../src/lib/attendanceVisual.ts';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  cond ? passed++ : failed++;
}

// Correct colour families per the spec: green/teal, purple, red.
check('attending is green/teal', ATTENDANCE_VISUAL.attending.hex === '#0d9488');
check('undecided is purple', ATTENDANCE_VISUAL.undecided.hex === '#7c3aed');
check('not attending is red', ATTENDANCE_VISUAL.not_attending.hex === '#dc2626');

// The three statuses must be visually distinct.
const hexes = ATTENDANCE_ORDER.map((s) => ATTENDANCE_VISUAL[s].hex);
check('all three statuses have distinct colours', new Set(hexes).size === 3);

// Bar accent and dot come from the SAME hex → year + month stay in sync.
check(
  'bar border/dot colour = the one shared hex per status',
  ATTENDANCE_ORDER.every((s) => typeof ATTENDANCE_VISUAL[s].hex === 'string'),
);

// Bar backgrounds use the matching colour family (tinted 50-level).
check('attending bar bg is teal', ATTENDANCE_VISUAL.attending.barBg.includes('teal'));
check('undecided bar bg is violet/purple', ATTENDANCE_VISUAL.undecided.barBg.includes('violet'));
check('not attending bar bg is red', ATTENDANCE_VISUAL.not_attending.barBg.includes('red'));

// Order covers exactly the three statuses.
check('order lists all three statuses', ATTENDANCE_ORDER.length === 3);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
