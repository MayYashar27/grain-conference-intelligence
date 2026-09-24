import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleDeleteConference } from '../server/deleteConference';

/** POST /api/conference-delete — delete a conference (service-role only). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const result = await handleDeleteConference(req.body);
  return res.status(result.status).json(result.body);
}
