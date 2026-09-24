import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpdateConference } from '../server/updateConference';

/** POST /api/conference-update — edit metadata; may invalidate + flag re-enrich. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const result = await handleUpdateConference(req.body);
  return res.status(result.status).json(result.body);
}
