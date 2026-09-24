/**
 * Server-side contact edit (Phase 4A). Allows factual corrections. If a new
 * phone number would collide with a DIFFERENT existing contact's normalized
 * phone, it returns a 409 conflict instead of silently merging.
 */
import { getServiceClient, ServiceConfigError } from './supabaseService.js';
import { normalizePhone, isUsablePhone } from '../src/lib/phone.js';

export interface HandlerResult {
  status: number;
  body: unknown;
}

function str(v: unknown, max = 300): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
function has(o: Record<string, unknown>, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k);
}

export async function handleUpdateContact(rawBody: unknown): Promise<HandlerResult> {
  const b = (typeof rawBody === 'object' && rawBody ? rawBody : {}) as Record<string, unknown>;
  const id = str(b.id, 80);
  if (!id) return { status: 400, body: { error: 'Contact id is required.' } };

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    if (e instanceof ServiceConfigError) return { status: 503, body: { error: e.message } };
    throw e;
  }

  const patch: Record<string, unknown> = {};

  if (has(b, 'fullName')) {
    const v = str(b.fullName, 160);
    if (!v) return { status: 400, body: { error: 'Full name cannot be empty.' } };
    patch.full_name = v;
  }
  if (has(b, 'company')) {
    const v = str(b.company, 160);
    if (!v) return { status: 400, body: { error: 'Company cannot be empty.' } };
    patch.company = v;
  }
  if (has(b, 'email')) {
    patch.email = str(b.email, 200) || null;
  }
  if (has(b, 'phone')) {
    const display = str(b.phone, 40);
    if (!display || !isUsablePhone(display)) {
      return { status: 400, body: { error: 'Please enter a valid phone number.' } };
    }
    const normalized = normalizePhone(display);
    // Collision check: another contact already owns this normalized phone.
    const other = await client
      .from('contacts')
      .select('id')
      .eq('normalized_phone', normalized)
      .neq('id', id)
      .maybeSingle();
    if (other.error) {
      console.error('[contacts] collision check failed:', other.error);
      return { status: 500, body: { error: 'Could not verify the phone number.' } };
    }
    if (other.data) {
      return {
        status: 409,
        body: {
          error: 'Another contact already uses this phone number. Resolve manually.',
          conflict: true,
        },
      };
    }
    patch.phone = display;
    patch.normalized_phone = normalized;
  }

  if (Object.keys(patch).length === 0) {
    return { status: 400, body: { error: 'No changes provided.' } };
  }
  patch.updated_at = new Date().toISOString();

  const upd = await client.from('contacts').update(patch).eq('id', id).select('*').maybeSingle();
  if (upd.error) {
    console.error('[contacts] update failed:', upd.error);
    return { status: 500, body: { error: 'Could not update the contact.' } };
  }
  if (!upd.data) return { status: 404, body: { error: 'Contact not found.' } };

  return { status: 200, body: upd.data };
}
