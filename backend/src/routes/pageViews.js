import { Router } from 'express';
import PageView from '../models/PageView.js';
import requireAdmin from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/page-views
 * Public — record a page view.
 * The frontend calls this on every route change.
 */
router.post('/', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'Path is required' });
    }

    await PageView.create({
      path,
      ip: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    // Silently ignore — page views shouldn't break the page
    res.status(201).json({ ok: true });
  }
});

/**
 * GET /api/page-views/stats
 * Admin-protected (via auth middleware). Returns total and today's page views.
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount] = await Promise.all([
      PageView.countDocuments(),
      PageView.countDocuments({ timestamp: { $gte: today } }),
    ]);

    res.json({ total, today: todayCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
