/**
 * Phase 4A lead model.
 *  - Contact: the person (deduped by normalized phone).
 *  - Interaction: one meeting/contact event, optionally tied to a conference.
 * A contact has many interactions across conferences and non-conference contexts.
 */
export interface Contact {
  id: string;
  fullName: string;
  company: string;
  phone: string;
  normalizedPhone: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  /** A newly-entered company that differs from `company`, pending review; null = nothing to review. */
  pendingCompany: string | null;
  /** A newly-entered name that differs from `fullName`, pending review; null = nothing to review. */
  pendingName: string | null;
}

export interface Interaction {
  id: string;
  contactId: string;
  /** null => a direct / non-conference interaction. */
  conferenceId: string | null;
  /** The contact's company at the time of this interaction (historical snapshot). */
  companyNameAtTime: string;
  note: string | null;
  occurredAt: string;
  createdAt: string;
}
