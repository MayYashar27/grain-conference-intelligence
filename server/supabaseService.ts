/**
 * Server-side Supabase client using the service-role key. Used only in server
 * contexts (Vercel functions / dev middleware) — never imported by client code.
 * The key is read from process.env and bypasses RLS for privileged operations.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class ServiceConfigError extends Error {}

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ServiceConfigError('Server is missing Supabase configuration (service role).');
  }
  if (!cached) cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
