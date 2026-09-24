/**
 * Runs the deterministic test suite: every scripts/test-*.ts file, in its own
 * Node process (type-stripped, no build step). Exits non-zero if any file fails.
 * Usage: npm test   (or: node scripts/run-tests.mjs)
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir)
  .filter((f) => /^test-.*\.ts$/.test(f))
  .sort();

let failed = 0;
for (const f of files) {
  console.log(`\n──────── ${f} ────────`);
  const res = spawnSync(process.execPath, [join(dir, f)], { stdio: 'inherit' });
  if (res.status !== 0) failed++;
}

console.log(`\n════════ ${files.length - failed}/${files.length} test files passed ════════`);
process.exit(failed > 0 ? 1 : 0);
