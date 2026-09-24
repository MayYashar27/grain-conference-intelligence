import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleDeleteLead } from '../server/deleteLead.js';

/** POST /api/delete-lead — delete a contact (cascades interactions + research). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const result = await handleDeleteLead(req.body);
  return res.status(result.status).json(result.body);
}
