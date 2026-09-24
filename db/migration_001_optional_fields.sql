-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001 — make region, vertical and evidence_confidence optional.
--
-- Supports manually added conferences that are genuinely unspecified / unscored,
-- without losing existing rows. Run once in the Supabase SQL Editor on a database
-- that was created with the original schema.sql. Fresh setups already include
-- these changes and do not need this migration.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.conferences alter column region drop not null;
alter table public.conferences alter column vertical drop not null;

alter table public.conferences alter column evidence_confidence drop not null;
alter table public.conferences alter column evidence_confidence drop default;
