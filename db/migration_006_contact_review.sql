-- ─────────────────────────────────────────────────────────────────────────────
-- Contact identity review (Phase: capture match/merge feedback).
-- Phone stays the unique identity key. When a capture reuses an existing Contact
-- (same normalized phone) but the entered company or name differs, we do NOT
-- silently overwrite the Contact — we stash the newly-entered value here so the
-- Lead Profile can surface a lightweight "needs review" prompt (Keep / Update).
-- Both are null when there is nothing to review. Additive + idempotent.
-- Existing data is untouched.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.contacts
  add column if not exists pending_company text,
  add column if not exists pending_name text;
