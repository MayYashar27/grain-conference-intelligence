import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  Pencil,
  Check,
  X,
  Loader2,
  Calendar,
  MessageSquare,
  PhoneCall,
  Sparkles,
  AlertTriangle,
  Trash2,
  Flag,
  ChevronDown,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { DraftEmailModal } from '../components/leads/DraftEmailModal';
import type { Conference } from '../types/conference';
import type { Contact, Interaction } from '../types/lead';
import type { LeadResearch, RelationshipAssessment } from '../types/research';
import { useConferences } from '../store/conferences';
import { useLeads } from '../store/leads';
import { formatDateRange } from '../lib/format';
import { analyzeRelationship } from '../lib/relationship';
import { composeLeadBrief } from '../lib/leadBrief';
import { computeFollowUpPriority, type FollowUpPriority } from '../lib/followUpPriority';
import { STAGE_STYLE, MOMENTUM_STYLE, PRIORITY_STYLE } from '../lib/researchLabels';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { HubSpotPreviewModal } from '../components/leads/HubSpotPreviewModal';

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const inputClass =
  'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none';

/** Render brief copy, turning **bold** spans into <strong>. */
function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-ink-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function LeadProfilePage() {
  const { contactId } = useParams<{ contactId: string }>();
  const { conferences } = useConferences();
  const { contacts, interactions, research, researchStatus, loading, error, editInteraction } =
    useLeads();

  const contact = contacts.find((c) => c.id === contactId) ?? null;
  const history = useMemo(
    () =>
      interactions
        .filter((i) => i.contactId === contactId)
        .sort((a, b) => (b.occurredAt || '').localeCompare(a.occurredAt || '')),
    [interactions, contactId],
  );

  // Live relationship (internal, no Gemini) + deterministic priority.
  const relationship = useMemo(
    () =>
      analyzeRelationship(
        history.map((i) => ({ occurredAt: i.occurredAt, note: i.note })),
        new Date().toISOString(),
      ),
    [history],
  );

  if (!contact && (loading || error)) {
    return (
      <AppShell>
        <BackLink />
        <div className="mx-auto mt-4 max-w-3xl">
          {error ? (
            <EmptyState title="Couldn't load this lead" message={error} />
          ) : (
            <div className="h-64 animate-pulse rounded-xl border border-ink-200 bg-white" />
          )}
        </div>
      </AppShell>
    );
  }

  if (!contact) {
    return (
      <AppShell>
        <BackLink />
        <div className="mx-auto mt-4 max-w-3xl">
          <EmptyState title="Lead not found" message="This contact may have been removed." />
        </div>
      </AppShell>
    );
  }

  const existing = research[contact.id] ?? null;
  const priority = computeFollowUpPriority({
    research: existing,
    relationship,
    interactions: history.map((i) => ({ occurredAt: i.occurredAt, note: i.note })),
    nowISO: new Date().toISOString(),
  }).priority;

  return (
    <AppShell>
      <BackLink />
      <div className="mx-auto mt-4 max-w-3xl space-y-5">
        {/* A — Contact header */}
        <ProfileHeader
          contact={contact}
          research={existing}
          relationship={relationship}
          priority={priority}
          interactionCount={history.length}
        />

        {/* Identity review (only when a phone-matched capture entered different details) */}
        <ContactReview contact={contact} />

        {/* B + C — AI brief and the recommended next step */}
        <SalesBrief contact={contact} history={history} relationship={relationship} />

        {/* D — Relationship history (unchanged) */}
        <RelationshipHistory
          history={history}
          conferences={conferences}
          editInteraction={editInteraction}
        />

        {/* E — Research sources (secondary, expandable) */}
        {existing && <ResearchSources research={existing} status={researchStatus[contact.id]} />}
      </div>
    </AppShell>
  );
}

/* ─── A. Contact header ──────────────────────────────────────────────────── */

function ProfileHeader({
  contact,
  research,
  relationship,
  priority,
  interactionCount,
}: {
  contact: Contact;
  research: LeadResearch | null;
  relationship: RelationshipAssessment;
  priority: FollowUpPriority;
  interactionCount: number;
}) {
  const { editContact } = useLeads();
  const [editing, setEditing] = useState(false);
  const [showHubspot, setShowHubspot] = useState(false);

  const role = research?.person.title ?? null;
  // Verified LinkedIn ONLY when research confidently matched this person.
  const verifiedLinkedin =
    research?.person.linkedinUrl && research.person.linkedinStatus === 'confident'
      ? research.person.linkedinUrl
      : null;
  const enriched = !!role || !!verifiedLinkedin;

  return (
    <section className="rounded-xl border border-ink-200 bg-white p-5">
      {!editing ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-grain-700">{contact.fullName}</h1>
              <p className="mt-0.5 text-sm text-ink-500">
                {role ? (
                  <>
                    {role} · <span className="text-ink-600">{contact.company}</span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 size={13} className="text-ink-400" />
                    {contact.company}
                  </span>
                )}
              </p>
              {enriched && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {verifiedLinkedin && (
                    <a
                      href={verifiedLinkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
                    >
                      <Link2 size={12} />
                      LinkedIn
                      <ExternalLink size={10} className="text-brand-400" />
                    </a>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
                    <Sparkles size={11} className="text-brand-400" />
                    Enriched from public sources
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
            >
              <Pencil size={12} />
              Edit
            </button>
          </div>

          {/* Small status indicators — Priority, Stage, Momentum. */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${PRIORITY_STYLE[priority].cls}`}
              title="Follow-up priority"
            >
              <Flag size={11} />
              {PRIORITY_STYLE[priority].label}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STAGE_STYLE[relationship.stage].cls}`}>
              {STAGE_STYLE[relationship.stage].label}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${MOMENTUM_STYLE[relationship.momentum].cls}`}>
              {MOMENTUM_STYLE[relationship.momentum].label}
            </span>
          </div>

          {/* Contact line + secondary actions. */}
          <div className="mt-4 flex flex-col gap-3 border-t border-ink-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
              <span className="inline-flex items-center gap-1">
                <Phone size={12} className="text-ink-400" />
                {contact.phone}
              </span>
              {contact.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail size={12} className="text-ink-400" />
                  {contact.email}
                </span>
              )}
              <span className="text-ink-400">
                {interactionCount} interaction{interactionCount === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowHubspot(true)}
                className="text-xs font-medium text-ink-500 transition-colors hover:text-ink-800"
              >
                Sync to HubSpot
              </button>
              <DeleteLead contactId={contact.id} />
            </div>
          </div>
        </>
      ) : (
        <ContactEditForm contact={contact} editContact={editContact} onDone={() => setEditing(false)} />
      )}

      {showHubspot && <HubSpotPreviewModal onClose={() => setShowHubspot(false)} />}
    </section>
  );
}

function ContactEditForm({
  contact,
  editContact,
  onDone,
}: {
  contact: Contact;
  editContact: (
    id: string,
    patch: Partial<Pick<Contact, 'fullName' | 'company' | 'phone' | 'email'>>,
  ) => Promise<Contact>;
  onDone: () => void;
}) {
  const [fullName, setFullName] = useState(contact.fullName);
  const [company, setCompany] = useState(contact.company);
  const [phone, setPhone] = useState(contact.phone);
  const [email, setEmail] = useState(contact.email ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      await editContact(contact.id, {
        fullName: fullName.trim(),
        company: company.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
      });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-600">Full name</span>
        <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-600">Current company</span>
        <input className={inputClass} value={company} onChange={(e) => setCompany(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-600">Phone</span>
        <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-600">Email</span>
        <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
      </label>
      {err && <p className="text-xs text-rose-600 sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          Save
        </Button>
        <Button variant="secondary" onClick={onDone} disabled={saving}>
          <X size={15} />
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ─── Identity review (phone-matched capture with differing details) ─────── */

function ContactReview({ contact }: { contact: Contact }) {
  const { resolveReview } = useLeads();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!contact.pendingCompany && !contact.pendingName) return null;

  async function resolve(field: 'company' | 'name', action: 'keep' | 'update') {
    setErr(null);
    setBusy(`${field}:${action}`);
    try {
      await resolveReview(contact.id, field, action);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not resolve the review.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {contact.pendingCompany && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-amber-900">Company details need review</h3>
              <p className="mt-0.5 text-xs text-amber-800">
                Latest interaction was logged under{' '}
                <span className="font-semibold">{contact.pendingCompany}</span>, while this contact is
                currently listed at <span className="font-semibold">{contact.company}</span>.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => resolve('company', 'keep')}
                  disabled={!!busy}
                >
                  {busy === 'company:keep' ? <Loader2 size={14} className="animate-spin" /> : null}
                  Keep {contact.company}
                </Button>
                <Button onClick={() => resolve('company', 'update')} disabled={!!busy}>
                  {busy === 'company:update' ? <Loader2 size={14} className="animate-spin" /> : null}
                  Update to {contact.pendingCompany}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {contact.pendingName && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-amber-900">Name needs review</h3>
              <p className="mt-0.5 text-xs text-amber-800">
                A recent capture used <span className="font-semibold">{contact.pendingName}</span>,
                while this contact is listed as <span className="font-semibold">{contact.fullName}</span>.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => resolve('name', 'keep')} disabled={!!busy}>
                  {busy === 'name:keep' ? <Loader2 size={14} className="animate-spin" /> : null}
                  Keep {contact.fullName}
                </Button>
                <Button onClick={() => resolve('name', 'update')} disabled={!!busy}>
                  {busy === 'name:update' ? <Loader2 size={14} className="animate-spin" /> : null}
                  Update to {contact.pendingName}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {err && <p className="text-xs text-rose-600">{err}</p>}
    </div>
  );
}

/* ─── B + C. AI brief + recommended next step ────────────────────────────── */

function SalesBrief({
  contact,
  history,
  relationship,
}: {
  contact: Contact;
  history: Interaction[];
  relationship: RelationshipAssessment;
}) {
  const { research, researchStatus, runResearch } = useLeads();
  const existing = research[contact.id] ?? null;
  const status = researchStatus[contact.id];
  const researching = status === 'researching';
  const failed = status === 'failed';
  const [retrying, setRetrying] = useState(false);

  const [showDraft, setShowDraft] = useState(false);
  const { paragraphs } = useMemo(
    () => composeLeadBrief({ research: existing, relationship, fullName: contact.fullName, company: contact.company }),
    [existing, relationship, contact.fullName, contact.company],
  );

  async function run() {
    setRetrying(true);
    try {
      await runResearch(contact.id);
    } catch {
      /* status handled by store */
    } finally {
      setRetrying(false);
    }
  }
  const busy = researching || retrying;

  return (
    <>
      {/* B — Brief */}
      <section className="rounded-xl border border-ink-200 bg-white p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand-600" />
            <h2 className="text-sm font-bold text-ink-900">Brief</h2>
          </div>
          {existing && (
            <Button variant="secondary" onClick={run} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Refresh research
            </Button>
          )}
        </div>

        {existing ? (
          paragraphs.length > 0 ? (
            <div className="space-y-3">
              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={`text-sm leading-relaxed ${
                    p.emphasis ? 'border-l-2 border-brand-500 pl-3 text-ink-800' : 'text-ink-700'
                  }`}
                >
                  {renderBold(p.text)}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-500">
              Public research didn't surface enough about {contact.company} yet. Use your next
              conversation to learn more.
            </p>
          )
        ) : researching ? (
          <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600">
            <Loader2 size={15} className="animate-spin text-brand-500" />
            Preparing the brief — researching public context. You can keep working; it appears here
            when ready.
          </div>
        ) : failed ? (
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2 text-sm text-ink-600">
              <AlertTriangle size={15} className="text-rose-500" />
              Research didn't complete. Your lead and its history are safe.
            </div>
            <Button onClick={run} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Retry research
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-ink-500">
              Not yet researched. Public research runs automatically for new leads — you can also run
              it now.
            </p>
            <Button onClick={run} disabled={busy}>
              <Sparkles size={14} />
              Research lead
            </Button>
          </div>
        )}

        {/* C — the actionable follow-up: draft an email grounded in known context */}
        {history.length > 0 && (
          <div className="mt-4 border-t border-ink-100 pt-4">
            <Button onClick={() => setShowDraft(true)}>
              <Mail size={15} />
              Draft follow-up email
            </Button>
          </div>
        )}
      </section>

      {showDraft && (
        <DraftEmailModal
          contactId={contact.id}
          contactName={contact.fullName}
          contactEmail={contact.email}
          onClose={() => setShowDraft(false)}
        />
      )}
    </>
  );
}

/* ─── E. Research sources (secondary, expandable) ────────────────────────── */

function ResearchSources({ research, status }: { research: LeadResearch; status?: string }) {
  const [open, setOpen] = useState(false);

  const links: { url: string; label: string }[] = [];
  if (research.person.linkedinUrl && research.person.linkedinStatus === 'confident') {
    links.push({ url: research.person.linkedinUrl, label: 'LinkedIn profile' });
  }
  if (research.company.website) {
    links.push({ url: research.company.website, label: 'Company website' });
  }
  for (const s of research.sources) {
    if (!links.some((l) => l.url === s.url)) {
      links.push({ url: s.url, label: s.title || hostOf(s.url) });
    }
  }

  if (links.length === 0) return null;

  return (
    <section className="rounded-xl border border-ink-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-5 py-3 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          Research sources ({links.length})
        </span>
        <ChevronDown
          size={16}
          className={`text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-ink-100 px-5 py-3">
          <ul className="space-y-1.5">
            {links.map((l) => (
              <li key={l.url}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
                >
                  {l.label}
                  <ExternalLink size={11} className="text-brand-400" />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-ink-400">
            Researched {new Date(research.researchedAt).toLocaleDateString('en-GB')}
            {status === 'researching' ? ' · refreshing…' : ''}. Sources are for verification.
          </p>
        </div>
      )}
    </section>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/* ─── Delete (unchanged behavior) ────────────────────────────────────────── */

function DeleteLead({ contactId }: { contactId: string }) {
  const { removeLead } = useLeads();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function del() {
    setErr(null);
    setDeleting(true);
    try {
      await removeLead(contactId);
      navigate('/leads', { state: { deleted: true } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete the lead.');
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 transition-colors hover:text-rose-600"
      >
        <Trash2 size={13} />
        Delete lead
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setConfirming(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-ink-900">Delete lead?</h3>
            <p className="mt-2 text-sm text-ink-600">
              This will permanently delete this contact, their <span className="font-medium">interaction
              history</span>, and their <span className="font-medium">saved research</span> — those
              records cascade from the contact.
            </p>
            {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button onClick={del} disabled={deleting} className="!bg-rose-600 hover:!bg-rose-700">
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Delete lead
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BackLink() {
  return (
    <Link
      to="/leads"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-800"
    >
      <ArrowLeft size={16} />
      Leads
    </Link>
  );
}

/* ─── D. Relationship history (unchanged) ────────────────────────────────── */

function RelationshipHistory({
  history,
  conferences,
  editInteraction,
}: {
  history: Interaction[];
  conferences: Conference[];
  editInteraction: (
    id: string,
    patch: { note?: string | null; conferenceId?: string | null },
  ) => Promise<Interaction>;
}) {
  return (
    <section className="rounded-xl border border-ink-200 bg-white">
      <div className="border-b border-ink-100 px-5 py-4">
        <h2 className="text-sm font-bold text-ink-900">Relationship history</h2>
        <p className="text-xs text-ink-500">Every interaction, newest first.</p>
      </div>
      {history.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-400">No interactions recorded.</p>
      ) : (
        <ol className="divide-y divide-ink-100">
          {history.map((it) => (
            <InteractionRow
              key={it.id}
              interaction={it}
              conference={it.conferenceId ? conferences.find((c) => c.id === it.conferenceId) ?? null : null}
              conferences={conferences}
              editInteraction={editInteraction}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function InteractionRow({
  interaction,
  conference,
  conferences,
  editInteraction,
}: {
  interaction: Interaction;
  conference: Conference | null;
  conferences: Conference[];
  editInteraction: (
    id: string,
    patch: { note?: string | null; conferenceId?: string | null },
  ) => Promise<Interaction>;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(interaction.note ?? '');
  const [confId, setConfId] = useState(interaction.conferenceId ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isConf = !!interaction.conferenceId;

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      await editInteraction(interaction.id, {
        note: note.trim() || null,
        conferenceId: confId || null,
      });
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                isConf ? 'bg-brand-50 text-brand-600' : 'bg-ink-100 text-ink-500'
              }`}
            >
              {isConf ? <Calendar size={13} /> : <PhoneCall size={13} />}
            </span>
            <span className="text-sm font-semibold text-ink-900">
              {isConf ? conference?.name ?? 'Conference (removed)' : 'Direct / non-conference'}
            </span>
          </div>
          <div className="mt-1 pl-8 text-xs text-ink-500">
            {formatDay(interaction.occurredAt)}
            {isConf && conference && (
              <span> · {formatDateRange(conference.startDate, conference.endDate)}</span>
            )}
            <span> · {interaction.companyNameAtTime}</span>
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setNote(interaction.note ?? '');
              setConfId(interaction.conferenceId ?? '');
              setErr(null);
              setEditing(true);
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
          >
            <Pencil size={12} />
            Edit
          </button>
        )}
      </div>

      {!editing ? (
        interaction.note && (
          <p className="mt-2 flex items-start gap-1.5 pl-8 text-sm text-ink-600">
            <MessageSquare size={13} className="mt-0.5 shrink-0 text-ink-400" />
            {interaction.note}
          </p>
        )
      ) : (
        <div className="mt-3 space-y-2 pl-8">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-600">Note</span>
            <textarea
              className={`${inputClass} min-h-[56px] resize-y`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-600">Conference</span>
            <select className={inputClass} value={confId} onChange={(e) => setConfId(e.target.value)}>
              <option value="">Direct / non-conference</option>
              {[...conferences]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          {err && <p className="text-xs text-rose-600">{err}</p>}
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
