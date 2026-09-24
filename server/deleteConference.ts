/**
 * Server-side conference delete (service-role key only; anon cannot delete).
 * Interactions that referenced this conference have their conference_id set to
 * null by the FK (they become direct / non-conference), so history is preserved.
 */
import { getServiceClient, ServiceConfigError } from './supabaseService.js';

export interface HandlerResult {
  status: number;
  body: unknown;
}

export async function handleDeleteConference(rawBody: unknown): Promise<HandlerResult> {
  const b = (typeof rawBody === 'object' && rawBody ? rawBody : {}) as Record<string, unknown>;
  const id = typeof b.id === 'string' ? b.id.trim().slice(0, 120) : '';
  if (!id) return { status: 400, body: { error: 'Conference id is required.' } };

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    if (e instanceof ServiceConfigError) return { status: 503, body: { error: e.message } };
    throw e;
  }

  const del = await client.from('conferences').delete().eq('id', id).select('id').maybeSingle();
  if (del.error) {
    console.error('[conference-delete] failed:', del.error);
    return { status: 500, body: { error: 'Could not delete the conference.' } };
  }
  if (!del.data) return { status: 404, body: { error: 'Conference not found.' } };
  return { status: 200, body: { id: (del.data as { id: string }).id } };
}
