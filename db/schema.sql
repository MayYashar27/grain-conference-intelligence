-- ─────────────────────────────────────────────────────────────────────────────
-- Grain Conference Intelligence — database schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: it drops and recreates the conferences table.
-- ─────────────────────────────────────────────────────────────────────────────

drop table if exists public.conferences cascade;

create table public.conferences (
  id                 text primary key,
  name               text        not null,
  start_date         date        not null,
  end_date           date        not null,
  city               text        not null,
  country            text        not null,
  region             text,                          -- null = not specified
  vertical           text,                          -- null = not specified
  audience_size      integer,                       -- null = unknown
  url                text,
  description        text        not null default '',
  status             text        not null default 'approved'
                       check (status in ('discovered', 'approved', 'dismissed')),
  -- Planning attendance (separate from Fit/Tier). Existing rows default to undecided.
  attendance_status  text        not null default 'undecided'
                       check (attendance_status in ('undecided', 'attending', 'not_attending')),
  source             text,
  -- Public-web source URLs backing the record (from AI discovery grounding).
  sources            jsonb       not null default '[]'::jsonb,
  -- null = not yet scored (e.g. a manually added conference awaiting enrichment)
  evidence_confidence text       check (evidence_confidence in ('high', 'medium', 'low')),
  -- Per-dimension scoring, incl. unknown (null) scores, key signals and evidence.
  -- Shape: { companyFit: {score, signals[], evidence}, buyerFit: {...}, ... }
  -- The normalized score and tier are DERIVED by the app's scoring engine
  -- (single source of truth), so they are intentionally not stored here.
  dimensions         jsonb       not null,
  is_seed            boolean     not null default false,
  added_manually     boolean     not null default false,
  created_at         timestamptz not null default now()
);

-- Ordering by date is the common access pattern.
create index conferences_start_date_idx on public.conferences (start_date);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Reads are public (anon key). Writes are NOT allowed via the anon key — there
-- is deliberately no INSERT/UPDATE/DELETE policy, so the public demo database
-- cannot be written to directly. All writes go through the server-side endpoint
-- using the service_role key, which bypasses RLS.
alter table public.conferences enable row level security;

drop policy if exists "Public read access" on public.conferences;
create policy "Public read access"
  on public.conferences
  for select
  using (true);
