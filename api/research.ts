import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleResearchLead } from '../server/researchLead.js';

/** POST /api/research — run/refresh AI lead research for a contact (server-only). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const result = await handleResearchLead(req.body);
  return res.status(result.status).json(result.body);
}
