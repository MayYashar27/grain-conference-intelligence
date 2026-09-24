/**
 * Server-side attendance update. Runs only on the server (Vercel function /
 * dev middleware) using the service-role key, since the public anon key cannot
 * write under RLS. Updates ONLY the attendance_status column — never touches
 * Fit/Tier/dimensions.
 */
import { getServiceClient, ServiceConfigError } from './supabaseService.js';

export interface HandlerResult {
  status: number;
  body: unknown;
}

const STATUSES = ['undecided', 'attending', 'not_attending'];

export async function handleUpdateAttendance(rawBody: unknown): Promise<HandlerResult> {
  const b = (typeof rawBody === 'object' && rawBody ? rawBody : {}) as Record<string, unknown>;
  const id = typeof b.id === 'string' ? b.id.trim() : '';
  const status = typeof b.status === 'string' ? b.status.trim() : '';

  if (!id) return { status: 400, body: { error: 'Conference id is required.' } };
  if (!STATUSES.includes(status)) {
    return { status: 400, body: { error: 'Invalid attendance status.' } };
  }

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    if (e instanceof ServiceConfigError) return { status: 503, body: { error: e.message } };
    throw e;
  }

  const { data, error } = await client
    .from('conferences')
    .update({ attendance_status: status })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[attendance] update failed:', error);
    return { status: 500, body: { error: 'Could not update attendance.' } };
  }
  if (!data) return { status: 404, body: { error: 'Conference not found.' } };

  return { status: 200, body: data };
}
