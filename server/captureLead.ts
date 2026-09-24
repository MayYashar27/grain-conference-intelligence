/**
 * Server-side lead capture (Phase 4A). Runs only on the server with the
 * service-role key. Deterministically dedupes a Contact by normalized phone,
 * reuses it when present (adding a new Interaction), and creates it otherwise —
 * safely against the normalized_phone UNIQUE constraint so two near-simultaneous
 * submissions never create duplicate contacts.
 */
import { getServiceClient, ServiceConfigError } from './supabaseService';
import { normalizePhone, isUsablePhone } from '../src/lib/phone';
import { sameText } from '../src/lib/contactIdentity';

export interface HandlerResult {
  status: number;
  body: unknown;
}

function str(v: unknown, max = 300): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

const UNIQUE_VIOLATION = '23505';
const FK_VIOLATION = '23503';

/** True when the write failed only because the pending_* review columns are not
 * migrated yet (Postgres 42703, or PostgREST's schema-cache PGRST204). */
function isMissingPendingColumn(err: { code?: string; message?: string }): boolean {
  if (err.code === '42703' || err.code === 'PGRST204') return true;
  return /pending_(company|name)/.test(err.message ?? '');
}

export async function handleCaptureLead(rawBody: unknown): Promise<HandlerResult> {
  const b = (typeof rawBody === 'object' && rawBody ? rawBody : {}) as Record<string, unknown>;

  const fullName = str(b.fullName, 160);
  const company = str(b.company, 160);
  const phone = str(b.phone, 40);
  const email = str(b.email, 200) || null;
  const note = str(b.note, 2000) || null;
  const conferenceId = str(b.conferenceId, 80) || null;

  if (!fullName) return { status: 400, body: { error: 'Full name is required.' } };
  if (!company) return { status: 400, body: { error: 'Company is required.' } };
  if (!phone) return { status: 400, body: { error: 'Phone number is required.' } };
  if (!isUsablePhone(phone)) {
    return { status: 400, body: { error: 'Please enter a valid phone number.' } };
  }
  const normalized = normalizePhone(phone);

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    if (e instanceof ServiceConfigError) return { status: 503, body: { error: e.message } };
    throw e;
  }

  // ── Resolve the contact (reuse existing, else create; race-safe) ────────────
  let contact: Record<string, unknown> | null = null;
  let isExisting = false;
  // Phone is the identity key. When we reuse a contact whose name/company differ
  // from what was just entered, we NEVER overwrite the contact silently — we flag
  // the difference for lightweight review on the Lead Profile.
  let companyConflict = false;
  let nameConflict = false;

  const existing = await client
    .from('contacts')
    .select('*')
    .eq('normalized_phone', normalized)
    .maybeSingle();
  if (existing.error) {
    console.error('[leads] lookup failed:', existing.error);
    return { status: 500, body: { error: 'Could not look up the contact.' } };
  }

  if (existing.data) {
    isExisting = true;
    const ex = existing.data as { id: string; full_name: string; company: string; email: string | null };
    companyConflict = !sameText(company, ex.company);
    nameConflict = !sameText(fullName, ex.full_name);

    // Reuse the contact WITHOUT overwriting its current name or company. Only the
    // review flags (and an email, if newly supplied and absent) are touched.
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      pending_company: companyConflict ? company : null,
      pending_name: nameConflict ? fullName : null,
    };
    if (email && !ex.email) patch.email = email;

    let upd = await client.from('contacts').update(patch).eq('id', ex.id).select('*').single();
    // Graceful degradation if the review columns aren't migrated yet: retry
    // without them so capture is never blocked. (Run migration_006 to enable the
    // profile review prompt.) PostgREST reports this as 42703 or PGRST204.
    if (upd.error && isMissingPendingColumn(upd.error)) {
      const { pending_company: _pc, pending_name: _pn, ...safe } = patch;
      void _pc;
      void _pn;
      upd = await client.from('contacts').update(safe).eq('id', ex.id).select('*').single();
    }
    if (upd.error) {
      console.error('[leads] contact update failed:', upd.error);
      return { status: 500, body: { error: 'Could not update the contact.' } };
    }
    contact = upd.data;
  } else {
    const ins = await client
      .from('contacts')
      .insert({ full_name: fullName, company, phone, normalized_phone: normalized, email })
      .select('*')
      .single();
    if (ins.error) {
      // Lost a race to another concurrent insert → reuse the winner.
      if (ins.error.code === UNIQUE_VIOLATION) {
        isExisting = true;
        const refetch = await client
          .from('contacts')
          .select('*')
          .eq('normalized_phone', normalized)
          .single();
        if (refetch.error || !refetch.data) {
          return { status: 500, body: { error: 'Could not resolve the contact.' } };
        }
        contact = refetch.data;
      } else {
        console.error('[leads] contact insert failed:', ins.error);
        return { status: 500, body: { error: 'Could not create the contact.' } };
      }
    } else {
      contact = ins.data;
    }
  }

  // ── Create the interaction ──────────────────────────────────────────────────
  const interaction = await client
    .from('interactions')
    .insert({
      contact_id: (contact as { id: string }).id,
      conference_id: conferenceId,
      company_name_at_time: company,
      note,
    })
    .select('*')
    .single();

  if (interaction.error) {
    if (interaction.error.code === FK_VIOLATION) {
      return { status: 400, body: { error: 'Unknown conference for this interaction.' } };
    }
    console.error('[leads] interaction insert failed:', interaction.error);
    return { status: 500, body: { error: 'Could not record the interaction.' } };
  }

  return {
    status: 201,
    body: { contact, interaction: interaction.data, isExisting, companyConflict, nameConflict },
  };
}
