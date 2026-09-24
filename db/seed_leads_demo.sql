-- ─────────────────────────────────────────────────────────────────────────────
-- Demo leads — REAL companies, FICTIONAL people. Run AFTER migration_004_leads.sql
-- (contacts/interactions already exist). Adds 5 varied demo contacts so the live
-- AI research feature has meaningful real public companies to investigate.
--
-- PRIVACY: fictional names, RFC-reserved / clearly-fictional phone numbers, and
-- @example.com emails. NO real employees, no real personal contact info.
-- NO AI research is seeded here — ICP Fit, maturity, stack, signals, sales motion,
-- LinkedIn, etc. are ALL discovered live by the research pipeline (lead_research).
-- Idempotent (fixed ids, on conflict do nothing).
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.contacts (id, full_name, company, phone, normalized_phone, email) values
  ('d0000001-0000-0000-0000-000000000001', 'Dana Whitfield', 'Etsy',        '+1 202 555 0100',  '+12025550100',  'dana.whitfield@example.com'),
  ('d0000002-0000-0000-0000-000000000002', 'Lukas Brandt',   'Zalando',     '+49 30 5550 1002', '+493055501002', 'lukas.brandt@example.com'),
  ('d0000003-0000-0000-0000-000000000003', 'Sofia Almeida',  'Booking.com', '+31 20 555 0103',  '+31205550103',  'sofia.almeida@example.com'),
  ('d0000004-0000-0000-0000-000000000004', 'Marcus Bennett', 'Wise',        '+44 20 7946 0104', '+442079460104', 'marcus.bennett@example.com'),
  ('d0000005-0000-0000-0000-000000000005', 'Aisha Karim',    'Shopify',     '+1 416 555 0105',  '+14165550105',  'aisha.karim@example.com')
on conflict (id) do nothing;

insert into public.interactions (id, contact_id, conference_id, company_name_at_time, note, occurred_at) values
  -- Etsy — first meeting, limited notes (NEW, sparse).
  ('dd000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', null, 'Etsy', 'Quick hello.', '2026-09-15T14:00:00Z'),

  -- Zalando — repeated encounters, a pain point, no clear progression (ENGAGED, neutral).
  ('dd000002-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000002', null, 'Zalando', 'Intro at trade event; brief chat.', '2026-06-10T09:30:00Z'),
  ('dd000002-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002', null, 'Zalando', 'Discussed multi-market payout complexity and FX reconciliation across EU currencies.', '2026-08-20T11:00:00Z'),

  -- Booking.com — explicit demo interest (EVALUATING, positive).
  ('dd000003-0000-0000-0000-000000000001', 'd0000003-0000-0000-0000-000000000003', null, 'Booking.com', 'Intro call about travel payment flows.', '2026-08-05T10:00:00Z'),
  ('dd000003-0000-0000-0000-000000000002', 'd0000003-0000-0000-0000-000000000003', null, 'Booking.com', 'Asked for a demo of multi-currency reconciliation for their travel payments.', '2026-09-10T15:30:00Z'),

  -- Wise — previously engaged, gone cold, deprioritized (STALLED, negative).
  ('dd000004-0000-0000-0000-000000000001', 'd0000004-0000-0000-0000-000000000004', null, 'Wise', 'Met at conference; strong technical discussion on cross-currency infrastructure.', '2025-11-05T13:00:00Z'),
  ('dd000004-0000-0000-0000-000000000002', 'd0000004-0000-0000-0000-000000000004', null, 'Wise', 'Follow-up on cross-currency infrastructure and settlement.', '2026-01-15T13:00:00Z'),
  ('dd000004-0000-0000-0000-000000000003', 'd0000004-0000-0000-0000-000000000004', null, 'Wise', 'Said cross-border optimization is not a priority this year.', '2026-03-02T13:00:00Z'),

  -- Shopify — clear pain point raised in a recent conversation (ENGAGED, recent).
  ('dd000005-0000-0000-0000-000000000001', 'd0000005-0000-0000-0000-000000000005', null, 'Shopify', 'Intro call.', '2026-07-01T16:00:00Z'),
  ('dd000005-0000-0000-0000-000000000002', 'd0000005-0000-0000-0000-000000000005', null, 'Shopify', 'Flagged reconciliation pain across multi-currency merchant payouts on Shopify Payments.', '2026-09-12T16:00:00Z')
on conflict (id) do nothing;
