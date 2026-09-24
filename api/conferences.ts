import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCreateConference } from '../server/createConference.js';

/**
 * POST /api/conferences — create a conference.
 * Runs as a Vercel serverless function. Reads are handled directly by the
 * browser via the anon key; only writes come through here so the service-role
 * key stays server-side.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const result = await handleCreateConference(req.body);
  return res.status(result.status).json(result.body);
}
