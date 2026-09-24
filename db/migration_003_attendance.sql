-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003 — planning attendance status.
--
-- Adds a constrained `attendance_status` to conferences for the Planning feature.
-- Separate from Fit/Tier. Existing rows default to 'undecided'. Non-destructive
-- and safe to re-run. Run once in the Supabase SQL Editor. RLS is unchanged —
-- reads stay public; status changes go through the server-side write endpoint
-- using the service-role key (the anon key still cannot write).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.conferences
  add column if not exists attendance_status text not null default 'undecided'
    check (attendance_status in ('undecided', 'attending', 'not_attending'));
