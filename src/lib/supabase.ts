import { createClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client, using the anon/publishable key. This key is safe to
 * ship to the client: Row Level Security permits reads only. All writes go
 * through the server-side endpoint (see src/lib/conferenceRepo.ts → /api).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: false },
    })
  : null;
