# Grain · Conference Intelligence

An internal sales tool for **Grain** (FX / cross-border payment infrastructure). It helps the
sales team answer one question, end to end:

> **Which conferences put us in the same room with relevant companies and decision-makers around
> problems Grain can solve — and how do we turn that into pipeline?**

The app takes a salesperson from *discovering* the right conferences through to a *researched,
ready-to-send follow-up* — with a clear separation between AI (open-ended research) and deterministic
logic (scoring, prioritization, identity, relationship state).

## The business problem

Grain's buyers — Heads of Payments, Treasurers, CFOs at cross-border businesses — cluster at a
handful of industry conferences. But there are hundreds of events, sponsorship and travel are
expensive, and leads captured on a busy expo floor decay fast. This tool makes conference selection
evidence-based, plans efficient trips, captures leads without friction, and enriches them with
grounded research so follow-up is fast and specific.

## Main user flow

**Discover → Prioritize → Plan → Capture → Track relationship → Research / follow-up → CRM**

1. **Discover** — browse the seeded catalog or run AI discovery for new, grounded conferences.
2. **Prioritize** — a transparent **Conference Fit Score** ranks events by how well they match Grain.
3. **Plan** — a year calendar and automatic **trip clustering** turn nearby events into efficient trips.
4. **Capture** — log a lead in seconds (phone-first), at a conference or standalone.
5. **Track relationship** — Stage + Momentum are derived deterministically from your interactions.
6. **Research / follow-up** — on-demand grounded research on person + company, a plain-language
   Brief, a Follow-up Priority, and a drafted email that can't invent facts.
7. **CRM** — a HubSpot sync **preview** (design only; not connected to Grain's real HubSpot).

## Tech stack

| Choice | Why |
| --- | --- |
| **Vite + React + TypeScript** | Fast dev/build; type-safe scoring and matching logic. |
| **Tailwind CSS v4** | Design tokens in `src/index.css`; premium UI quickly. |
| **react-router-dom** | Real routes and shareable deep links. |
| **Supabase (Postgres + RLS)** | Shared source of truth; public reads via the anon key. |
| **Vercel serverless (`api/*`)** | Server-side write/secret boundary; mirrored locally by Vite middleware. |
| **Google Gemini (`@google/genai`)** | Grounded discovery and lead research (server-side only). |

## Architecture (high level)

- **Reads** — the browser queries Supabase directly with the anon key. RLS allows **select only**,
  so the public database cannot be written from the client.
- **Writes & secrets** — every write and every AI call goes through a server endpoint (`api/*.ts`,
  mirrored by a Vite dev middleware). That context holds the **service-role key** and
  `GEMINI_API_KEY`; neither ever reaches the browser bundle. This is the single seam where future
  secrets (HubSpot) also live.
- **AI candidates are never auto-persisted** — discovery and research produce suggestions; a human
  Approve/Save is the only path into the database.
- **Deterministic layers are pure and unit-tested** (`src/lib/*`) — scoring, filtering, follow-up
  priority, relationship analysis, identity comparison, trip clustering, brief/email composition.

```
src/
  types/                 # Domain models (conference, lead)
  lib/scoring.ts         # Conference Fit: weighting, normalization, tiering  ← core
  lib/followUpPriority.ts# Deterministic "who first?" + priority → signals → recency ordering
  lib/relationship.ts    # Stage + Momentum from interaction history (no LLM)
  lib/contactIdentity.ts # Identity-text comparison for capture reconciliation
  lib/trips.ts           # Trip clustering (travel region + date proximity)
  lib/leadBrief.ts       # Deterministic Brief + next step from persisted research
  lib/emailDraft.ts      # Draft-email context (grounded; no fabrication)
  data/ , store/ , pages/ , components/
server/                  # Server-only handlers (service-role key, Gemini)
  discovery/ , research/ # Two-pass grounded flow + deterministic validation
api/*.ts                 # Vercel functions wrapping the handlers
db/                      # schema.sql, migrations, seed*.sql
scripts/                 # Deterministic tests + seed generator + test runner
```

## AI vs deterministic (deliberate split)

| Concern | How | Why |
| --- | --- | --- |
| Conference **discovery**, person/company **research** | Gemini, two-pass (Google-Search grounding → structured JSON) | Open-ended, requires reading the live web. |
| Conference **Fit Score** & tier | Deterministic (`scoring.ts`) | Must be explainable, stable and reproducible from validated evidence. |
| **Follow-up Priority** & list order | Deterministic (`followUpPriority.ts`) | "Who first" must be auditable, never an opaque model score. |
| **Relationship** Stage / Momentum | Deterministic (`relationship.ts`) from interactions | Derived from *your* history, not guessed by an LLM. |
| **Identity / matching** | Deterministic (normalized phone + text compare) | Merging contacts must be predictable and reviewable. |
| Research **validation** | Deterministic filters over the AI output | Drop unsourced claims, gate LinkedIn on a confident match, treat missing evidence as *insufficient*, never as absence. |

**The salesperson sees conclusions, not the analysis** — no chain-of-thought, no raw rubric or
taxonomy. Every AI claim is source-linked, and "insufficient evidence" is a first-class outcome.

## Conference Fit methodology

Four weighted dimensions, each scored 0–100 from evidence, then normalized to a 0–100 score:

- **Company Fit — 35%** · **Buyer Fit — 30%** · **Agenda Relevance — 20%** · **Networking — 15%**

A dimension with **no evidence is excluded** and the remaining weights are **renormalized** — it is
never counted as a zero. **Evidence Confidence** (High/Medium/Low) is shown as a separate signal.
Tiers: **A** 80–100 · **B** 60–79 · **C** 40–59 · **D** 0–39. Tiers measure *fit*, not a decision to
attend. The seed catalog includes 14 varied conferences plus one deliberate missing-evidence case.

## Cross-conference identity & matching

**Normalized phone is the deterministic identity key.** Meeting the same person at another
conference reuses the one Contact and appends an Interaction — no duplicate. Important edge cases,
each with a deterministic test:

- **Same phone, different formatting** → normalizes to the same Contact (`test-leads`).
- **Same phone, different company** → the stored company is **never silently overwritten**; the
  interaction keeps its historical `company_name_at_time`, and the change is flagged for review
  (`test-contact-identity`).
- **Same phone, name variation** → raised for review rather than a destructive overwrite; casing /
  whitespace differences are **not** treated as a change (`test-contact-identity`).
- **Conference deleted** → interactions survive (`conference_id` FK is `on delete set null`), so
  relationship history is preserved.

## Configuration

Copy `.env.example` → `.env` and fill in real values (never commit them). Names only:

| Variable | Where | Secret? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | client + server | no (shipped in bundle) |
| `VITE_SUPABASE_ANON_KEY` | client + server | no (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** (`.env.local` locally) | **yes — never commit** |
| `GEMINI_API_KEY` | **server only** (`.env.local` locally) | **yes — never commit** |
| `GEMINI_MODEL` | server only, optional — model override | no |
| `GEMINI_STRUCTURE_MODEL` | server only, optional — faster model for the pass-2 structuring step | no |

`.env` and `.env.local` are git-ignored; only `.env.example` is tracked. A `HUBSPOT_API_KEY` would
live in the same server-only boundary if the integration were built (see below).

## Run locally

Requires Node.js 18+ (developed on Node 24).

```bash
npm install
npm run dev
```

First-time database setup (once per Supabase project) in the Supabase SQL Editor: run `db/schema.sql`,
then `migration_001` … `migration_006` in order, then the seeds (`db/seed.sql`, `db/seed_leads.sql`,
`db/seed_leads_demo.sql`, and optionally `db/seed_leads_real_demo.sql`). Add `SUPABASE_SERVICE_ROLE_KEY`
and `GEMINI_API_KEY` to `.env.local` to enable writes and AI locally. Open the printed URL (default
http://localhost:5173).

```bash
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
```

## Running the tests

The deterministic logic has a pure, dependency-free test suite (no DB, no network, no build step):

```bash
npm test           # runs every scripts/test-*.ts in its own Node process
```

Each file is also runnable on its own, e.g. `node scripts/test-priority.ts`. The suite covers Fit
scoring & renormalization, discovery validation/dedup, follow-up priority & ordering, relationship
Stage/Momentum, identity reconciliation, trip clustering, the Brief, and draft-email grounding — the
test names describe the edge cases they guard.

## HubSpot integration path (design only — not built)

The prototype is **not connected to Grain's real HubSpot environment**, so there is **no fake
"Connected" state** — the CRM step is a **preview** of what would sync. Internal relationship context
already sits behind one seam (today the `interactions` table, feeding `server/researchLead.ts` and
`src/lib/relationship.ts`). In production, HubSpot would be a **second context source** merged at that
same point (past emails, meetings, pipeline stage), and a **write-back** could push enriched lead
intelligence into HubSpot properties — all behind the existing server-side secret boundary.

## Known limitations / trade-offs

- **Grounded discovery/research latency** — the two-pass Gemini + Google-Search flow is thorough but
  takes several seconds; it is deliberately on-demand and human-approved, not real-time.
- **No live HubSpot / Gmail integration** — CRM sync and email are previews/drafts; nothing is sent
  or written to an external system.
- **Identity matching is phone-based** — robust for the demo, but job changes, shared phones, or
  people met without a phone number are not yet resolved; ambiguous matches are flagged for human
  review rather than auto-merged.
- **Demo data** — leads are illustrative CRM samples, labeled as such in the UI; the optional
  real-person seed uses only public professional facts (name + current company), no personal contact
  data, and never presents the sample interaction notes as real meetings.

## What I'd build next

- **Progressive discovery** — stream/persist grounded results incrementally instead of one blocking pass.
- **Real HubSpot + Gmail integrations** — two-way sync and actual send, reusing the existing secret seam.
- **Stronger identity resolution** — verified LinkedIn/email as additional signals for job-change and
  name-variant handling, with human review for ambiguous merges.
