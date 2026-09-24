import type { AttendanceStatus, Conference } from '../types/conference';
import { supabase, isSupabaseConfigured } from './supabase';
import { rowToConference } from './mappers';

/** Fields a user supplies when manually adding a conference. */
export type NewConferenceInput = Omit<
  Conference,
  'id' | 'status' | 'isSeed' | 'addedManually' | 'attendanceStatus'
>;

const NOT_CONFIGURED =
  'The app is not connected to its database. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';

/** Load all conferences from the shared database, ordered by start date. */
export async function fetchConferences(): Promise<Conference[]> {
  if (!supabase) throw new Error(NOT_CONFIGURED);

  const { data, error } = await supabase
    .from('conferences')
    .select('*')
    .order('start_date', { ascending: true });

  if (error) {
    // Surface a clean message; log the detail for debugging.
    console.error('[conferences] load failed:', error);
    throw new Error(error.message || 'Could not load conferences.');
  }

  return (data ?? []).map(rowToConference);
}

/**
 * Create a conference via the server-side endpoint (which holds the service key
 * and validates input). The anon client cannot write directly.
 */
/** Shared POST to the secure write endpoint; returns the created conference. */
async function postConference(body: Record<string, unknown>): Promise<Conference> {
  if (!isSupabaseConfigured) throw new Error(NOT_CONFIGURED);

  let res: Response;
  try {
    res = await fetch('/api/conferences', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Network error — could not reach the server.');
  }

  const json = (await res.json().catch(() => null)) as
    | { error?: string; [k: string]: unknown }
    | null;

  if (!res.ok) {
    throw new Error(json?.error || 'Could not save the conference. Please try again.');
  }
  return rowToConference(json as never);
}

export async function createConference(input: NewConferenceInput): Promise<Conference> {
  return postConference({ ...input });
}

/**
 * Approve an AI-discovered candidate into the Conferences database. Uses the same
 * secure server write path, preserving evidence, signals and sources, and flags
 * the record as discovery-origin (not manually added).
 */
export async function approveDiscovery(candidate: Conference): Promise<Conference> {
  return postConference({
    name: candidate.name,
    url: candidate.url,
    startDate: candidate.startDate,
    endDate: candidate.endDate,
    city: candidate.city,
    country: candidate.country,
    region: candidate.region,
    vertical: candidate.vertical,
    audienceSize: candidate.audienceSize,
    description: candidate.description,
    source: candidate.source,
    sources: candidate.sources,
    evidenceConfidence: candidate.evidenceConfidence,
    dimensions: candidate.dimensions,
    addedManually: false,
  });
}

/** Shared POST helper for the secure conference write endpoints. */
async function postConfEndpoint(url: string, body: Record<string, unknown>) {
  if (!isSupabaseConfigured) throw new Error(NOT_CONFIGURED);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Network error — could not reach the server.');
  }
  const json = (await res.json().catch(() => null)) as { error?: string; [k: string]: unknown } | null;
  if (!res.ok) throw new Error(json?.error || 'Request failed. Please try again.');
  return json;
}

/** Fields a user may edit on an existing conference. */
export interface ConferenceEditInput {
  name?: string;
  url?: string | null;
  startDate?: string;
  endDate?: string;
  city?: string;
  country?: string;
  region?: string | null;
  vertical?: string | null;
  audienceSize?: number | null;
  description?: string;
}

/** Run/refresh conference enrichment (public-web research → evidence + scoring inputs). */
export async function enrichConference(id: string): Promise<Conference> {
  const json = await postConfEndpoint('/api/conference-enrich', { id });
  return rowToConference(json as never);
}

/** Edit conference metadata. Returns the updated record and whether it needs re-enrichment. */
export async function updateConferenceMeta(
  id: string,
  patch: ConferenceEditInput,
): Promise<{ conference: Conference; reenrich: boolean }> {
  const json = (await postConfEndpoint('/api/conference-update', { id, ...patch })) as {
    conference: unknown;
    reenrich?: boolean;
  };
  return { conference: rowToConference(json.conference as never), reenrich: !!json.reenrich };
}

/** Delete a conference (service-role path; interactions' conference_id is nulled). */
export async function deleteConference(id: string): Promise<void> {
  await postConfEndpoint('/api/conference-delete', { id });
}

/**
 * Update a conference's planning attendance status via the secure server
 * endpoint. Only attendance_status is changed — Fit/Tier are untouched.
 */
export async function updateAttendance(
  id: string,
  status: AttendanceStatus,
): Promise<Conference> {
  if (!isSupabaseConfigured) throw new Error(NOT_CONFIGURED);

  let res: Response;
  try {
    res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
  } catch {
    throw new Error('Network error — could not reach the server.');
  }

  const json = (await res.json().catch(() => null)) as
    | { error?: string; [k: string]: unknown }
    | null;

  if (!res.ok) {
    throw new Error(json?.error || 'Could not update attendance. Please try again.');
  }
  return rowToConference(json as never);
}
