/**
 * Server-side interaction edit (Phase 4A): the note and/or the conference
 * association. Setting conferenceId to null makes it a non-conference interaction.
 */
import { getServiceClient, ServiceConfigError } from './supabaseService.js';

export interface HandlerResult {
  status: number;
  body: unknown;
}

function str(v: unknown, max = 2000): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
function has(o: Record<string, unknown>, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k);
}

const FK_VIOLATION = '23503';

export async function handleUpdateInteraction(rawBody: unknown): Promise<HandlerResult> {
  const b = (typeof rawBody === 'object' && rawBody ? rawBody : {}) as Record<string, unknown>;
  const id = str(b.id, 80);
  if (!id) return { status: 400, body: { error: 'Interaction id is required.' } };

  const patch: Record<string, unknown> = {};
  if (has(b, 'note')) patch.note = str(b.note, 2000) || null;
  if (has(b, 'conferenceId')) {
    const v = b.conferenceId;
    patch.conference_id = typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : null;
  }
  if (Object.keys(patch).length === 0) {
    return { status: 400, body: { error: 'No changes provided.' } };
  }

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    if (e instanceof ServiceConfigError) return { status: 503, body: { error: e.message } };
    throw e;
  }

  const upd = await client
    .from('interactions')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (upd.error) {
    if (upd.error.code === FK_VIOLATION) {
      return { status: 400, body: { error: 'Unknown conference for this interaction.' } };
    }
    console.error('[interactions] update failed:', upd.error);
    return { status: 500, body: { error: 'Could not update the interaction.' } };
  }
  if (!upd.data) return { status: 404, body: { error: 'Interaction not found.' } };

  return { status: 200, body: upd.data };
}
