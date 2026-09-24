import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleDraftEmail } from '../server/draftEmail';

/** POST /api/draft-email — draft a grounded follow-up email (fires on click only). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const result = await handleDraftEmail(req.body);
  return res.status(result.status).json(result.body);
}
