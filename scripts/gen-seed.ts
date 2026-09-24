/**
 * Generates db/seed.sql from the canonical seed dataset in src/data/conferences.ts,
 * so the demo conferences live in the shared database rather than the browser.
 *
 * Run with Node's native TypeScript support:
 *   node scripts/gen-seed.ts > db/seed.sql
 */
import { SEED_CONFERENCES } from '../src/data/conferences.ts';

function lit(v: string | null): string {
  if (v === null) return 'null';
  return `'${v.replace(/'/g, "''")}'`;
}

const columns =
  'id, name, start_date, end_date, city, country, region, vertical, ' +
  'audience_size, url, description, status, source, evidence_confidence, ' +
  'dimensions, is_seed, added_manually';

const rows = SEED_CONFERENCES.map((c) => {
  const dims = JSON.stringify(c.dimensions).replace(/'/g, "''");
  return (
    '  (' +
    [
      lit(c.id),
      lit(c.name),
      lit(c.startDate),
      lit(c.endDate),
      lit(c.city),
      lit(c.country),
      lit(c.region),
      lit(c.vertical),
      c.audienceSize === null ? 'null' : String(c.audienceSize),
      lit(c.url),
      lit(c.description),
      lit(c.status),
      lit(c.source),
      lit(c.evidenceConfidence),
      `'${dims}'::jsonb`,
      c.isSeed ? 'true' : 'false',
      c.addedManually ? 'true' : 'false',
    ].join(', ') +
    ')'
  );
});

const out = `-- ─────────────────────────────────────────────────────────────────────────────
-- Grain Conference Intelligence — seed data (GENERATED, do not edit by hand)
-- Regenerate with: node scripts/gen-seed.ts > db/seed.sql
-- Run this AFTER schema.sql, in the Supabase SQL Editor.
-- These use real conference names with ILLUSTRATIVE, unverified details (is_seed).
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.conferences
  (${columns})
values
${rows.join(',\n')}
on conflict (id) do nothing;
`;

process.stdout.write(out);
