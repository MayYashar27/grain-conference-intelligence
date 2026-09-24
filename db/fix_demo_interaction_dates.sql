-- ─────────────────────────────────────────────────────────────────────────────
-- Demo-data cleanup: historical interactions must have occurred BEFORE today
-- (2026-09-23). Three seeded interactions referenced conferences that are still
-- in the future (Sibos, Money20/20 USA, EuroFinance — all Oct 2026), which is
-- logically impossible for a completed interaction.
--
-- Fix: point them at REAL, verified PAST conference editions (in the note; the
-- conference_id is set to null so we do NOT add past events to the upcoming
-- conference database) and move occurred_at into the past. The sales story and
-- momentum of each contact are preserved.
--
-- Verified past editions (public sources):
--   • Merchant Payments Ecosystem 2026 — 17–19 Mar 2026, Berlin   [merchantriskcouncil.org]
--   • Money20/20 Europe 2026           — 2–4 Jun 2026, Amsterdam  [europe.money2020.com]
--   • EuroFinance Int'l Treasury Mgmt 2025 — 15–17 Oct 2025, Budapest [eurofinance.com] (context only)
--
-- ALREADY APPLIED to the live database via the service role. This file is kept
-- for re-seed / reproducibility. Idempotent (targets fixed interaction ids).
-- company_name_at_time (historical snapshot) is intentionally NOT changed.
-- ─────────────────────────────────────────────────────────────────────────────

-- Sarah Cohen — warming relationship (kept Evaluating / Positive).
update public.interactions
  set conference_id = null,
      occurred_at   = '2026-03-18T10:00:00Z',
      note          = 'Met at Merchant Payments Ecosystem 2026 (Berlin); followed up on FX hedging appetite.'
  where id = 'aaaaaaa1-0000-0000-0000-000000000001';

update public.interactions
  set conference_id = null,
      occurred_at   = '2026-06-03T14:00:00Z',
      note          = 'Met again at Money20/20 Europe 2026 (Amsterdam); interested in multi-currency settlement and asked for a demo.'
  where id = 'aaaaaaa2-0000-0000-0000-000000000002';

-- Miguel Santos — early-stage lead (kept New / needs-research: no note added).
update public.interactions
  set conference_id = null,
      occurred_at   = '2026-09-01T09:00:00Z'
  where id = 'bbbbbbb1-0000-0000-0000-000000000001';
