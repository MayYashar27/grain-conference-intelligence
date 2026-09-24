import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCaptureLead } from '../server/captureLead.js';

/** POST /api/leads — capture a lead (dedupe contact by phone, add interaction). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const result = await handleCaptureLead(req.body);
  return res.status(result.status).json(result.body);
}
