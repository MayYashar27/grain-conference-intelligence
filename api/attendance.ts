import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpdateAttendance } from '../server/updateAttendance.js';

/**
 * POST /api/attendance — set a conference's planning attendance status.
 * Server-side only, so the service-role key stays off the client.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const result = await handleUpdateAttendance(req.body);
  return res.status(result.status).json(result.body);
}
