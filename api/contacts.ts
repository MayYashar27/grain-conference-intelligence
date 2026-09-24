import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpdateContact } from '../server/updateContact.js';
import { handleUpdateInteraction } from '../server/updateInteraction.js';

/**
 * POST /api/contacts — edit a lead entity by id + patch.
 *
 * Handles BOTH a contact's factual fields (default) and, when the body carries
 * `target: 'interaction'`, an interaction's note / conference association. These
 * two were previously separate functions; they are consolidated here so the
 * project stays within the Vercel Hobby 12-function limit. Behavior is unchanged:
 * each request is forwarded to the same server handler as before.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const body = req.body as { target?: unknown } | null | undefined;
  const result =
    body && typeof body === 'object' && body.target === 'interaction'
      ? await handleUpdateInteraction(req.body)
      : await handleUpdateContact(req.body);
  return res.status(result.status).json(result.body);
}
