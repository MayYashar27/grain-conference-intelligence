-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005 — persisted AI lead research (Phase 4B).
--
-- One row per contact (latest research). Refresh replaces it (upsert on
-- contact_id). Structured JSON so the schema can evolve. Non-destructive, safe to
-- re-run, and it does NOT alter contacts/interactions (Phase 4A data preserved).
--
-- Security / RLS: reads are public (the Lead Profile shows research); writes have
-- NO anon policy, so research is written only by the server endpoint using the
-- service-role key — same pattern as conferences/contacts. Existing RLS unchanged.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.lead_research (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid not null unique references public.contacts(id) on delete cascade,
  research      jsonb not null,
  researched_at timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists lead_research_contact_id_idx on public.lead_research (contact_id);

alter table public.lead_research enable row level security;

drop policy if exists "Public read lead_research" on public.lead_research;
create policy "Public read lead_research" on public.lead_research for select using (true);
