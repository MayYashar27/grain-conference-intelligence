import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleDiscover } from '../server/handleDiscover.js';

/**
 * POST /api/discover — AI-powered conference discovery.
 * Runs server-side so GEMINI_API_KEY (and the Supabase service key used for
 * dedup) stay off the client.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const result = await handleDiscover(req.body);
  return res.status(result.status).json(result.body);
}
