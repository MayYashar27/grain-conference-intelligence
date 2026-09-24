-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002 — add a `sources` column (public-web source URLs).
--
-- Backs AI-discovered conferences so their grounding sources are preserved on
-- approval. Non-destructive and safe to re-run. Run once in the Supabase SQL
-- Editor. Fresh setups already include this via schema.sql.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.conferences
  add column if not exists sources jsonb not null default '[]'::jsonb;
