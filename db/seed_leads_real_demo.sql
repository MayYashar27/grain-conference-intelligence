-- ─────────────────────────────────────────────────────────────────────────────
-- OPTIONAL replacement: swap the 5 FICTIONAL demo people for REAL, publicly-
-- documented senior professionals at the SAME real companies, so live Person
-- Research returns useful results instead of "insufficient evidence".
--
-- ⚠️  STRICT DEMO-DATA SEPARATION:
--   • Only PUBLIC professional facts are used here: the person's real name and
--     their current, publicly-documented company. Nothing else is seeded.
--   • Role / seniority / LinkedIn / company profile are DISCOVERED LIVE by the
--     research pipeline (this file seeds NO research).
--   • The interaction history stays 100% FICTIONAL DEMO DATA. These notes are
--     illustrative CRM samples — Grain has NOT actually met or spoken with these
--     people.
--   • NO personal contact data: phones remain reserved demo numbers, emails are
--     blanked. (Do not add real personal phones or emails.)
--
-- This UPDATEs the 5 existing demo contacts by their fixed ids (keeps their
-- reserved demo phones and varied interaction histories / Follow-up Priority
-- spread). Run AFTER db/seed_leads_demo.sql. Existing non-demo data is untouched.
--
-- Verified current roles (re-verified Sep 2026):
--   Etsy        — Lanny Baker,        CFO (since Jan 2025)                    [cfodive.com; SEC 10-Q filings list legal name "Charles Baker"]
--   Zalando     — Anna Dimitrova,     CFO (Management Board since 1 Jan 2026)  [corporate.zalando.com press release]
--   Booking.com — Daniel Marovitz,    SVP of Fintech (leads Booking.com payments/fintech) [news.booking.com/daniel-marovitz]
--   Wise        — Emmanuel Thomassin, CFO (since Oct 2024)                    [owners.wise.com; bankingdive.com]
--   Shopify     — Jeff Hoffmeister,   CFO (since Oct 2022)                    [SEC; cfodive.com]
--
-- Note: Chirag Patel (proposed "VP & GM, Money") could NOT be confidently
-- verified from credible CURRENT sources (professional-profile aggregators only),
-- so Shopify uses its clearly-verifiable CFO, Jeff Hoffmeister, per instruction.
-- Role mix: 1 payments/fintech leader (Booking.com) + 4 CFOs — CFO kept only
-- where it is the strongest verifiable option.
-- ─────────────────────────────────────────────────────────────────────────────

update public.contacts set full_name = 'Lanny Baker',        email = null
  where id = 'd0000001-0000-0000-0000-000000000001'; -- Etsy
update public.contacts set full_name = 'Anna Dimitrova',     email = null
  where id = 'd0000002-0000-0000-0000-000000000002'; -- Zalando
update public.contacts set full_name = 'Daniel Marovitz',    email = null
  where id = 'd0000003-0000-0000-0000-000000000003'; -- Booking.com
update public.contacts set full_name = 'Emmanuel Thomassin', email = null
  where id = 'd0000004-0000-0000-0000-000000000004'; -- Wise
update public.contacts set full_name = 'Jeff Hoffmeister',   email = null
  where id = 'd0000005-0000-0000-0000-000000000005'; -- Shopify

-- To revert to the fictional names:
--   d0000001 → Dana Whitfield, d0000002 → Lukas Brandt, d0000003 → Sofia Almeida,
--   d0000004 → Marcus Bennett, d0000005 → Aisha Karim  (and restore *.example emails).
