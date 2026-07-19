import { Router } from 'express';
import { triggerVercelRebuild } from '../utils/rebuild.js';

const router = Router();

/**
 * POST /api/rebuild
 *
 * Triggers a Vercel deployment so the pre-rendered static site picks up
 * content changes that were made via the admin panel.
 *
 * Protected by the same admin JWT middleware as other mutations.
 * The actual HTTP call to Vercel is fire-and-forget.
 *
 * Response always 200 — the rebuild runs asynchronously.
 */
router.post('/', async (req, res) => {
  triggerVercelRebuild(); // fire & forget
  res.json({ message: 'Rebuild triggered. Changes will appear on the live site in 1–3 minutes.' });
});

export default router;
