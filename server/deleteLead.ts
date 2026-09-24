/**
 * Server-side lead deletion (service-role key). Deleting the Contact cascades to
 * its interactions and persisted research via the FK `on delete cascade` rules
 * (see migrations 004 + 005). The anon key cannot delete (no RLS delete policy).
 */
import { getServiceClient, ServiceConfigError } from './supabaseService';

export interface HandlerResult {
  status: number;
  body: unknown;
}

export async function handleDeleteLead(rawBody: unknown): Promise<HandlerResult> {
  const b = (typeof rawBody === 'object' && rawBody ? rawBody : {}) as Record<string, unknown>;
  const contactId = typeof b.contactId === 'string' ? b.contactId.trim() : '';
  if (!contactId) return { status: 400, body: { error: 'Contact id is required.' } };

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    if (e instanceof ServiceConfigError) return { status: 503, body: { error: e.message } };
    throw e;
  }

  const { data, error } = await client
    .from('contacts')
    .delete()
    .eq('id', contactId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[leads] delete failed:', error);
    return { status: 500, body: { error: 'Could not delete the lead.' } };
  }
  if (!data) return { status: 404, body: { error: 'Contact not found.' } };

  return { status: 200, body: { id: contactId } };
}
