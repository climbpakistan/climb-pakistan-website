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
 * Admin-protected (via auth middleware). Returns detailed analytics data.
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    // ── Total & today ──
    const [total, todayCount] = await Promise.all([
      PageView.countDocuments(),
      PageView.countDocuments({ timestamp: { $gte: todayStart } }),
    ]);

    // ── Daily breakdown for last 7 days ──
    const dailyAgg = await PageView.aggregate([
      { $match: { timestamp: { $gte: weekStart } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ── Top 10 pages ──
    const topPagesAgg = await PageView.aggregate([
      { $match: { timestamp: { $gte: weekStart } } },
      { $group: { _id: '$path', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // ── Recent 20 page views (with timestamps) ──
    const recent = await PageView.find()
      .sort({ timestamp: -1 })
      .limit(20)
      .select('path timestamp')
      .lean();

    // ── Active visitors in last 15 minutes ──
    const activeThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const activeVisitors = await PageView.countDocuments({
      timestamp: { $gte: activeThreshold },
    });

    // ── Unique pages today ──
    const uniquePagesTodayAgg = await PageView.distinct('path', {
      timestamp: { $gte: todayStart },
    });

    res.json({
      total,
      today: todayCount,
      activeVisitors,
      uniquePagesToday: uniquePagesTodayAgg.length,
      daily: dailyAgg.map(d => ({
        date: d._id,
        count: d.count,
      })),
      topPages: topPagesAgg.map(p => ({
        path: p._id,
        count: p.count,
      })),
      recent: recent.map(r => ({
        path: r.path,
        timestamp: r.timestamp,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
