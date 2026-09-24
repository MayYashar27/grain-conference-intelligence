/**
 * Resolve a pending identity-review on a Contact (server-side, service key).
 * A capture that reused a Contact by phone but saw a different company/name
 * stashed the new value in pending_company / pending_name. Here the salesperson
 * either KEEPs the current value (clear the flag) or UPDATEs the Contact to the
 * new value. Historical interaction.company_name_at_time is NEVER touched.
 */
import { getServiceClient, ServiceConfigError } from './supabaseService';

export interface HandlerResult {
  status: number;
  body: unknown;
}

function str(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export async function handleResolveContactReview(rawBody: unknown): Promise<HandlerResult> {
  const b = (typeof rawBody === 'object' && rawBody ? rawBody : {}) as Record<string, unknown>;
  const id = str(b.id, 80);
  const field = str(b.field, 16); // 'company' | 'name'
  const action = str(b.action, 16); // 'keep' | 'update'

  if (!id) return { status: 400, body: { error: 'Contact id is required.' } };
  if (field !== 'company' && field !== 'name') {
    return { status: 400, body: { error: 'Invalid review field.' } };
  }
  if (action !== 'keep' && action !== 'update') {
    return { status: 400, body: { error: 'Invalid review action.' } };
  }

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    if (e instanceof ServiceConfigError) return { status: 503, body: { error: e.message } };
    throw e;
  }

  const cur = await client.from('contacts').select('*').eq('id', id).maybeSingle();
  if (cur.error) {
    console.error('[contact-review] load failed:', cur.error);
    return { status: 500, body: { error: 'Could not load the contact.' } };
  }
  if (!cur.data) return { status: 404, body: { error: 'Contact not found.' } };
  const row = cur.data as { pending_company: string | null; pending_name: string | null };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (field === 'company') {
    if (action === 'update' && row.pending_company) patch.company = row.pending_company;
    patch.pending_company = null;
  } else {
    if (action === 'update' && row.pending_name) patch.full_name = row.pending_name;
    patch.pending_name = null;
  }

  const upd = await client.from('contacts').update(patch).eq('id', id).select('*').single();
  if (upd.error) {
    console.error('[contact-review] update failed:', upd.error);
    return { status: 500, body: { error: 'Could not resolve the review.' } };
  }
  return { status: 200, body: upd.data };
}
