/**
 * Server-side conference edit. Updates normal metadata. If an identity- or
 * research-defining field changes (name, URL, dates, city, country), the stale
 * intelligence is invalidated here (dimensions/sources/confidence reset) and the
 * caller is told to re-enrich — so we never leave scoring/evidence that describes
 * a different event.
 */
import { getServiceClient, ServiceConfigError } from './supabaseService';

export interface HandlerResult {
  status: number;
  body: unknown;
}

const REGIONS = ['North America', 'Europe', 'Middle East', 'Asia-Pacific', 'Latin America', 'Africa'];
const VERTICALS = ['Payments', 'Fintech', 'Treasury & Finance', 'Travel', 'E-commerce & Marketplaces', 'Technology & SaaS'];

function str(v: unknown, max = 300): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
function has(o: Record<string, unknown>, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k);
}
function sameText(a: unknown, b: unknown): boolean {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
}

const UNSCORED_DIMENSIONS = {
  companyFit: { score: null, signals: [], evidence: '' },
  buyerFit: { score: null, signals: [], evidence: '' },
  agendaRelevance: { score: null, signals: [], evidence: '' },
  networking: { score: null, signals: [], evidence: '' },
};

export async function handleUpdateConference(rawBody: unknown): Promise<HandlerResult> {
  const b = (typeof rawBody === 'object' && rawBody ? rawBody : {}) as Record<string, unknown>;
  const id = str(b.id, 120);
  if (!id) return { status: 400, body: { error: 'Conference id is required.' } };

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    if (e instanceof ServiceConfigError) return { status: 503, body: { error: e.message } };
    throw e;
  }

  const cur = await client.from('conferences').select('*').eq('id', id).maybeSingle();
  if (cur.error) {
    console.error('[conference-update] load failed:', cur.error);
    return { status: 500, body: { error: 'Could not load the conference.' } };
  }
  if (!cur.data) return { status: 404, body: { error: 'Conference not found.' } };
  const existing = cur.data as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;

  if (has(b, 'name')) {
    const v = str(b.name, 160);
    if (!v) return { status: 400, body: { error: 'Name cannot be empty.' } };
    patch.name = v;
  }
  if (has(b, 'startDate')) {
    const v = str(b.startDate, 10);
    if (!dateRe.test(v)) return { status: 400, body: { error: 'A valid start date is required.' } };
    patch.start_date = v;
  }
  if (has(b, 'endDate')) {
    const v = str(b.endDate, 10);
    if (!dateRe.test(v)) return { status: 400, body: { error: 'A valid end date is required.' } };
    patch.end_date = v;
  }
  const finalStart = (patch.start_date as string) ?? (existing.start_date as string);
  const finalEnd = (patch.end_date as string) ?? (existing.end_date as string);
  if (finalEnd < finalStart) {
    return { status: 400, body: { error: 'End date cannot be before the start date.' } };
  }
  if (has(b, 'city')) {
    const v = str(b.city, 80);
    if (!v) return { status: 400, body: { error: 'City cannot be empty.' } };
    patch.city = v;
  }
  if (has(b, 'country')) {
    const v = str(b.country, 80);
    if (!v) return { status: 400, body: { error: 'Country cannot be empty.' } };
    patch.country = v;
  }
  if (has(b, 'region')) {
    const v = str(b.region, 40);
    if (v && !REGIONS.includes(v)) return { status: 400, body: { error: 'Invalid region.' } };
    patch.region = v || null;
  }
  if (has(b, 'vertical')) {
    const v = str(b.vertical, 40);
    if (v && !VERTICALS.includes(v)) return { status: 400, body: { error: 'Invalid vertical.' } };
    patch.vertical = v || null;
  }
  if (has(b, 'url')) {
    const v = str(b.url, 300);
    if (v && !/^https?:\/\//i.test(v)) return { status: 400, body: { error: 'URL must start with http(s)://.' } };
    patch.url = v || null;
  }
  if (has(b, 'audienceSize')) {
    const raw = b.audienceSize;
    if (raw === null || raw === undefined || raw === '') {
      patch.audience_size = null;
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 10_000_000) {
        return { status: 400, body: { error: 'Audience size is invalid.' } };
      }
      patch.audience_size = Math.round(n);
    }
  }
  if (has(b, 'description')) {
    patch.description = str(b.description, 2000);
  }

  if (Object.keys(patch).length === 0) {
    return { status: 400, body: { error: 'No changes provided.' } };
  }

  // Did an identity / research-defining field actually change?
  const identityChanged =
    (has(patch, 'name') && !sameText(patch.name, existing.name)) ||
    (has(patch, 'url') && !sameText(patch.url, existing.url)) ||
    (has(patch, 'start_date') && patch.start_date !== existing.start_date) ||
    (has(patch, 'end_date') && patch.end_date !== existing.end_date) ||
    (has(patch, 'city') && !sameText(patch.city, existing.city)) ||
    (has(patch, 'country') && !sameText(patch.country, existing.country));

  if (identityChanged) {
    // Invalidate stale intelligence — it described the old identity.
    patch.dimensions = UNSCORED_DIMENSIONS;
    patch.sources = [];
    patch.evidence_confidence = null;
    patch.source = null;
  }

  const upd = await client.from('conferences').update(patch).eq('id', id).select('*').single();
  if (upd.error) {
    console.error('[conference-update] update failed:', upd.error);
    return { status: 500, body: { error: 'Could not update the conference.' } };
  }
  return { status: 200, body: { conference: upd.data, reenrich: identityChanged } };
}
