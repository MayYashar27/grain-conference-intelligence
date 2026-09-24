import type { Contact, Interaction } from '../types/lead';

export interface ContactRow {
  id: string;
  full_name: string;
  company: string;
  phone: string;
  normalized_phone: string;
  email: string | null;
  created_at: string;
  updated_at: string;
  /** Present only after migration_006; tolerated as absent (→ null). */
  pending_company?: string | null;
  pending_name?: string | null;
}

export interface InteractionRow {
  id: string;
  contact_id: string;
  conference_id: string | null;
  company_name_at_time: string;
  note: string | null;
  occurred_at: string;
  created_at: string;
}

export function rowToContact(row: ContactRow): Contact {
  return {
    id: row.id,
    fullName: row.full_name,
    company: row.company,
    phone: row.phone,
    normalizedPhone: row.normalized_phone,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pendingCompany: row.pending_company ?? null,
    pendingName: row.pending_name ?? null,
  };
}

export function rowToInteraction(row: InteractionRow): Interaction {
  return {
    id: row.id,
    contactId: row.contact_id,
    conferenceId: row.conference_id,
    companyNameAtTime: row.company_name_at_time,
    note: row.note,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}
