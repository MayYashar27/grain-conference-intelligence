import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleEnrichConference } from '../server/enrichConference.js';

/** POST /api/conference-enrich — research + persist evidence/scoring inputs. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const result = await handleEnrichConference(req.body);
  return res.status(result.status).json(result.body);
}
