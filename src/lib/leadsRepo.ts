import type { Contact, Interaction } from '../types/lead';
import type { LeadResearch } from '../types/research';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  rowToContact,
  rowToInteraction,
  type ContactRow,
  type InteractionRow,
} from './leadMappers';

interface LeadResearchRow {
  contact_id: string;
  research: LeadResearch;
}

const NOT_CONFIGURED = 'The app is not connected to its database.';

export interface CaptureLeadInput {
  fullName: string;
  company: string;
  phone: string;
  email?: string | null;
  note?: string | null;
  conferenceId?: string | null;
}

export interface CaptureLeadResult {
  contact: Contact;
  interaction: Interaction;
  isExisting: boolean;
  /** Same phone reused, but the entered company differs from the contact's current company. */
  companyConflict: boolean;
  /** Same phone reused, but the entered name differs from the contact's current name. */
  nameConflict: boolean;
}

/** Load all contacts + interactions + persisted research (public read). */
export async function fetchLeads(): Promise<{
  contacts: Contact[];
  interactions: Interaction[];
  research: Record<string, LeadResearch>;
}> {
  if (!supabase) throw new Error(NOT_CONFIGURED);

  const [c, i, r] = await Promise.all([
    supabase.from('contacts').select('*'),
    supabase.from('interactions').select('*'),
    supabase.from('lead_research').select('contact_id, research'),
  ]);
  if (c.error) {
    console.error('[leads] load contacts failed:', c.error);
    throw new Error(c.error.message || 'Could not load contacts.');
  }
  if (i.error) {
    console.error('[leads] load interactions failed:', i.error);
    throw new Error(i.error.message || 'Could not load interactions.');
  }
  // Research is optional (table may be absent pre-migration): tolerate its error.
  const research: Record<string, LeadResearch> = {};
  if (!r.error) {
    for (const row of (r.data as LeadResearchRow[]) ?? []) research[row.contact_id] = row.research;
  }
  return {
    contacts: ((c.data as ContactRow[]) ?? []).map(rowToContact),
    interactions: ((i.data as InteractionRow[]) ?? []).map(rowToInteraction),
    research,
  };
}

/** Run/refresh AI research for a contact (server-side; persists). */
export async function researchLead(contactId: string): Promise<LeadResearch> {
  const json = (await postJson('/api/research', { contactId })) as unknown as {
    research: LeadResearch;
  };
  return json.research;
}

/** Delete a contact (cascades interactions + research) via the secure endpoint. */
export async function deleteLead(contactId: string): Promise<void> {
  await postJson('/api/delete-lead', { contactId });
}

/** Draft a grounded follow-up email (server-side Gemini; fires on explicit click). */
export async function draftFollowUpEmail(
  contactId: string,
): Promise<{ subject: string; body: string }> {
  const json = (await postJson('/api/draft-email', { contactId })) as unknown as {
    subject?: string;
    body?: string;
  };
  return { subject: json.subject ?? '', body: json.body ?? '' };
}

async function postJson(url: string, body: Record<string, unknown>) {
  if (!isSupabaseConfigured) throw new Error(NOT_CONFIGURED);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Network error — could not reach the server.');
  }
  const json = (await res.json().catch(() => null)) as
    | { error?: string; [k: string]: unknown }
    | null;
  if (!res.ok) throw new Error(json?.error || 'Request failed. Please try again.');
  return json;
}

export async function captureLead(input: CaptureLeadInput): Promise<CaptureLeadResult> {
  const json = (await postJson('/api/leads', { ...input })) as {
    contact: ContactRow;
    interaction: InteractionRow;
    isExisting: boolean;
    companyConflict?: boolean;
    nameConflict?: boolean;
  };
  return {
    contact: rowToContact(json.contact),
    interaction: rowToInteraction(json.interaction),
    isExisting: !!json.isExisting,
    companyConflict: !!json.companyConflict,
    nameConflict: !!json.nameConflict,
  };
}

/** Resolve a pending identity review (company/name) on a contact. */
export async function resolveContactReview(
  id: string,
  field: 'company' | 'name',
  action: 'keep' | 'update',
): Promise<Contact> {
  const json = (await postJson('/api/resolve-contact-review', { id, field, action })) as unknown as ContactRow;
  return rowToContact(json);
}

export async function updateContact(
  id: string,
  patch: Partial<Pick<Contact, 'fullName' | 'company' | 'phone' | 'email'>>,
): Promise<Contact> {
  const json = (await postJson('/api/contacts', { id, ...patch })) as unknown as ContactRow;
  return rowToContact(json);
}

export async function updateInteraction(
  id: string,
  patch: { note?: string | null; conferenceId?: string | null },
): Promise<Interaction> {
  // Interaction edits share the /api/contacts function (Vercel Hobby 12-function
  // limit); `target` selects the interaction handler. Behavior is unchanged.
  const json = (await postJson('/api/contacts', { target: 'interaction', id, ...patch })) as unknown as InteractionRow;
  return rowToInteraction(json);
}
