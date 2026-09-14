import { Router } from 'express';
import Hashtag from '../models/Hashtag.js';
import PostHashtag from '../models/PostHashtag.js';
import Post from '../models/Post.js';
import { optionalUser } from '../middleware/auth.js';
import { attachPollPayloads } from './posts.js';
import { normalizeHashtag } from '../utils/socialText.js';

const router = Router();

function hashtagJSON(doc) {
  return {
    name: doc.name,
    displayName: doc.displayName || doc.name,
    postCount: doc.postCount ?? 0,
  };
}

// Escape a user-supplied string for use inside a RegExp (prefix matching).
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/hashtags — most-used hashtags (used by the sitemap + discovery).
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const hashtags = await Hashtag.find({ postCount: { $gt: 0 } })
      .sort({ postCount: -1, name: 1 })
      .limit(limit)
      .lean();
    res.json({ hashtags: hashtags.map(hashtagJSON) });
  } catch (err) {
    console.error('List hashtags error:', err);
    res.status(500).json({ error: 'Could not load hashtags.' });
  }
});

// GET /api/hashtags/suggest?q= — prefix autocomplete for the composer.
// Public; registered before /:name so 'suggest' is not treated as a tag.
router.get('/suggest', async (req, res) => {
  try {
    const raw = String(req.query.q || '').trim().replace(/^#/, '');
    const prefix = normalizeHashtag(raw).slice(0, 30);
    if (!prefix) return res.json({ hashtags: [] });

    const re = new RegExp(`^${escapeRegex(prefix)}`);
    const hashtags = await Hashtag.find({ name: re })
      .sort({ postCount: -1, name: 1 })
      .limit(8)
      .lean();
    res.json({ hashtags: hashtags.map(hashtagJSON) });
  } catch (err) {
    console.error('Hashtag suggest error:', err);
    res.status(500).json({ error: 'Could not load hashtag suggestions.' });
  }
});

// GET /api/hashtags/:name — hashtag details + the posts that use it.
// Public. Paginated so the hashtag results page can use the same
// "Load more" behaviour as the feed.
router.get('/:name', optionalUser, async (req, res) => {
  try {
    const name = normalizeHashtag(req.params.name);
    if (!name) return res.status(404).json({ error: 'Hashtag not found.' });

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

    const hashtag = await Hashtag.findOne({ name }).lean();
    if (!hashtag) {
      return res.json({
        hashtag: { name, displayName: name, postCount: 0 },
        posts: [],
        page,
        limit,
        total: 0,
        hasMore: false,
      });
    }

    const [links, total] = await Promise.all([
      PostHashtag.find({ hashtagId: hashtag._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('postId')
        .lean(),
      PostHashtag.countDocuments({ hashtagId: hashtag._id }),
    ]);

    // Load visible posts only; moderator-removed content stays hidden.
    const topLevel = { removed: { $ne: true } };
    const isAdmin = req.user?.role === 'admin';
    const filter = isAdmin ? {} : topLevel;
    const docs = await Post.find({ _id: { $in: links.map((l) => l.postId) }, ...filter })
      .populate('authorId', 'username name profileImageUrl verification');

    // Preserve the join order (newest post first).
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    const ordered = links.map((l) => byId.get(String(l.postId))).filter(Boolean);
    const posts = await attachPollPayloads(ordered, req.user?.id || null, isAdmin);

    res.json({
      hashtag: hashtagJSON(hashtag),
      posts,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (err) {
    console.error('Hashtag posts error:', err);
    res.status(500).json({ error: 'Could not load hashtag.' });
  }
});

export default router;
