-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004 — Leads (contacts + interactions) for Phase 4A.
--
-- Contact = the person (deduped by normalized_phone, which is UNIQUE).
-- Interaction = one meeting/contact event, optionally tied to a conference.
-- Non-destructive, safe to re-run. Run once in the Supabase SQL Editor.
--
-- Security: RLS enabled. Reads are public (intentionally exposed for the demo's
-- Leads screen; seed data is fictional). Writes have NO anon policy, so they go
-- only through the server endpoints using the service-role key — same pattern as
-- conferences. This does not weaken existing RLS.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

create table if not exists public.contacts (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  company          text not null,
  phone            text not null,                 -- display / original
  normalized_phone text not null unique,          -- deterministic identity key
  email            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.interactions (
  id                   uuid primary key default gen_random_uuid(),
  contact_id           uuid not null references public.contacts(id) on delete cascade,
  conference_id        text references public.conferences(id) on delete set null,  -- null = non-conference
  company_name_at_time text not null,             -- historical snapshot
  note                 text,
  occurred_at          timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

create index if not exists interactions_contact_id_idx on public.interactions (contact_id);
create index if not exists interactions_occurred_at_idx on public.interactions (occurred_at desc);

alter table public.contacts enable row level security;
alter table public.interactions enable row level security;

drop policy if exists "Public read contacts" on public.contacts;
create policy "Public read contacts" on public.contacts for select using (true);

drop policy if exists "Public read interactions" on public.interactions;
create policy "Public read interactions" on public.interactions for select using (true);
