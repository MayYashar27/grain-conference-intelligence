import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleResolveContactReview } from '../server/resolveContactReview';

/** POST /api/resolve-contact-review — Keep/Update a pending company/name review. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const result = await handleResolveContactReview(req.body);
  return res.status(result.status).json(result.body);
}
