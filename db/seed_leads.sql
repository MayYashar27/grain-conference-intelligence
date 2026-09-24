-- ─────────────────────────────────────────────────────────────────────────────
-- Seed leads — CLEARLY FICTIONAL demo data. Run AFTER migration_004_leads.sql.
-- Uses reserved/fictional phone ranges and .example emails. No real people.
-- Idempotent (fixed ids, on conflict do nothing). All interactions are historical
-- (occurred_at is in the past relative to the 2026-09-23 demo "today"); conference
-- context is referenced in the notes with conference_id null, so no past events are
-- added to the upcoming conference database.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.contacts (id, full_name, company, phone, normalized_phone, email) values
  ('11111111-1111-1111-1111-111111111111', 'Sarah Cohen', 'Nexora Payments', '+972 50 123 4567', '+972501234567', 'sarah.cohen@nexora.example'),
  ('22222222-2222-2222-2222-222222222222', 'Miguel Santos', 'Andes Cross-Border', '+44 20 7946 0123', '+442079460123', 'miguel.santos@andescb.example'),
  ('33333333-3333-3333-3333-333333333333', 'Priya Nair', 'FX Bridge', '+1 415 555 0132', '+14155550132', null)
on conflict (id) do nothing;

insert into public.interactions (id, contact_id, conference_id, company_name_at_time, note, occurred_at) values
  -- Sarah Cohen — warming relationship across two real, verified PAST conferences
  -- (referenced in the notes; conference_id null). Keeps Evaluating / Positive / High.
  ('aaaaaaa1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', null, 'Nexora Payments', 'Met at Merchant Payments Ecosystem 2026 (Berlin); followed up on FX hedging appetite.', '2026-03-18T10:00:00Z'),
  ('aaaaaaa2-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', null, 'Nexora Payments', 'Met again at Money20/20 Europe 2026 (Amsterdam); interested in multi-currency settlement and asked for a demo.', '2026-06-03T14:00:00Z'),
  -- Miguel Santos — early-stage lead (New / needs research: no note).
  ('bbbbbbb1-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', null, 'Andes Cross-Border', null, '2026-09-01T09:00:00Z'),
  -- Priya Nair — non-conference (direct) interaction.
  ('ccccccc1-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', null, 'FX Bridge', 'Inbound call about PSP onboarding.', '2026-09-15T13:00:00Z')
on conflict (id) do nothing;
