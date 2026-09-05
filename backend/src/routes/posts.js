import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import {
  Types,
} from 'mongoose';
import Post, {
  POST_CATEGORIES,
  POST_TYPES,
  MAX_POLL_OPTIONS,
  POLL_DURATIONS,
} from '../models/Post.js';
import Follow from '../models/Follow.js';
import PollVote from '../models/PollVote.js';
import SavedPost from '../models/SavedPost.js';
import UserModel from '../models/User.js';
import Vote from '../models/Vote.js';
import { requireUser, optionalUser } from '../middleware/auth.js';
import { loadUserAndRestriction, restrictionError } from '../utils/userStatus.js';
import { notifyMentions } from '../utils/notifications.js';
import cloudinary from '../cloudinary.js';

const router = Router();

function isValidObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

// ── Image upload (Multer → Cloudinary) ──
// JPG / JPEG / PNG / WebP only. No video support.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!file) return cb(null, true);
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new Error('Post images must be JPG, PNG, or WebP.'));
    }
    cb(null, true);
  },
});

// Wrap multer so file-upload errors become clean JSON.
function uploadImageField(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Post images must be smaller than 5 MB.' });
      }
      return res.status(400).json({ error: err.message || 'Invalid image upload.' });
    }
    next();
  });
}

// Resize/compress on upload — Cloudinary stores an optimized version.
async function uploadPostImage(buffer) {
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'climb-pakistan/community/posts',
        resource_type: 'image',
        width: 1600,
        height: 1600,
        crop: 'limit',
        quality: 'auto',
        fetch_format: 'auto',
      },
      (err, r) => (err ? reject(err) : resolve(r))
    );
    stream.end(buffer);
  });
  return { url: result.secure_url, publicId: result.public_id };
}

async function deletePostImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('Could not delete post image from storage:', err.message);
  }
}

// ── Validation helpers ──
function validateTitle(raw) {
  const title = String(raw || '').trim();
  if (!title) return { ok: false, error: 'Please enter a title.' };
  if (title.length > 300) return { ok: false, error: 'Title must be 300 characters or fewer.' };
  return { ok: true, title };
}

function validateCategory(raw) {
  const category = String(raw || '').trim();
  if (!POST_CATEGORIES.includes(category)) {
    return { ok: false, error: 'Please choose a valid category.' };
  }
  return { ok: true, category };
}

function validateType(raw) {
  const type = String(raw || '').trim();
  if (!POST_TYPES.includes(type)) return { ok: false, error: 'Please choose a valid post type.' };
  return { ok: true, type };
}

// ── Poll validation ──
function validatePollOptions(raw) {
  // Multipart form-data sends pollOptions as a JSON string; JSON bodies send
  // the array directly.
  let arr = raw;
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch {
      arr = [];
    }
  }
  arr = Array.isArray(arr) ? arr : [];
  if (arr.length < 2) return { ok: false, error: 'Polls need at least 2 options.' };
  if (arr.length > MAX_POLL_OPTIONS) {
    return { ok: false, error: `Polls can have at most ${MAX_POLL_OPTIONS} options.` };
  }
  const seen = new Set();
  const options = [];
  for (const item of arr) {
    const text = typeof item === 'string' ? item : String(item?.text || '');
    const clean = text.trim().slice(0, 120);
    if (!clean) return { ok: false, error: 'Poll options cannot be empty.' };
    if (seen.has(clean)) return { ok: false, error: 'Poll options must be unique.' };
    seen.add(clean);
    options.push({ key: `opt-${Math.random().toString(36).slice(2, 8)}`, text: clean, voteCount: 0 });
  }
  return { ok: true, options };
}

const POLL_DURATION_VALUES = new Set(POLL_DURATIONS.map((d) => d.value));

function validatePollDuration(raw) {
  // Accept "24", "72", "168" or the string 'null' / empty for no expiry.
  if (raw === undefined || raw === null || raw === '' || raw === 'null') {
    return { ok: true, closesAt: null };
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || !POLL_DURATION_VALUES.has(value)) {
    return { ok: false, error: 'Please choose a valid poll duration.' };
  }
  return { ok: true, closesAt: new Date(Date.now() + value * 60 * 60 * 1000) };
}

// A poll is considered open when it has a close time after now, or no expiry.
export function pollIsOpen(post) {
  const closesAt = post?.poll?.closesAt;
  if (!closesAt) return true;
  return new Date(closesAt).getTime() > Date.now();
}

function validateBody(raw) {
  return String(raw || '').trim().slice(0, 5000);
}

// Only http(s) links are allowed — blocks javascript:, data:, vbscript:, etc.
function validateExternalUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return { ok: true, url: '' };
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: 'Please enter a valid URL.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Links must start with http:// or https://.' };
  }
  return { ok: true, url: parsed.href };
}

// Serialize a post for the frontend (never exposes internals). Poll payload
// is attached separately via postJSONWithPoll so the viewer's own vote can be
// included without leaking it in public listing contexts.
function postJSON(post) {
  const authorDoc = post.authorId && typeof post.authorId === 'object' && post.authorId.username !== undefined
    ? post.authorId
    : null;

  return {
    id: post._id,
    type: post.type,
    title: post.title,
    body: post.body,
    category: post.category,
    imageUrl: post.imageUrl,
    externalUrl: post.externalUrl,
    upvoteCount: post.upvoteCount,
    downvoteCount: post.downvoteCount,
    commentCount: post.commentCount,
    score: post.score ?? 0,
    removed: !!post.removed,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: authorDoc
      ? {
          username: authorDoc.username,
          name: authorDoc.name,
          profileImageUrl: authorDoc.profileImageUrl,
          verification: authorDoc.verification || 'none',
        }
      : null,
  };
}

// Build the poll response for a viewer. `myVote` is the viewer's chosen
// option key (or null). Results become visible after the viewer votes, or
// always once the poll is closed.
function pollPayload(post, myVote) {
  const open = pollIsOpen(post);
  const full = myVote != null || !open;
  const totalVotes = post.poll?.totalVotes ?? 0;
  return {
    options: (post.poll?.options || []).map((o) => ({
      key: o.key,
      text: o.text,
      voteCount: full ? (o.voteCount ?? 0) : undefined,
      percent: full && totalVotes > 0
        ? Math.round(((o.voteCount ?? 0) / totalVotes) * 1000) / 10
        : undefined,
    })),
    closesAt: post.poll?.closesAt || null,
    totalVotes: full ? totalVotes : undefined,
    open,
    myVote,
  };
}

async function postJSONWithPoll(post, viewerId) {
  const json = postJSON(post);
  if (post.type === 'poll') {
    let myVote = null;
    if (viewerId) {
      const vote = await PollVote.findOne({ postId: post._id, userId: viewerId })
        .select('optionKey -_id')
        .lean();
      myVote = vote?.optionKey ?? null;
    }
    json.poll = pollPayload(post, myVote);
  }
  return json;
}

// Attach viewer-specific poll payloads to a list of posts (used by the feed so
// poll cards render interactively instead of as bare text). Batches the poll
// vote lookups into a single query per viewer.
async function attachPollPayloads(posts, viewerId) {
  const pollPosts = posts.filter((p) => p.type === 'poll');
  if (pollPosts.length === 0) return posts;

  const myVotes = new Map();
  if (viewerId) {
    const votes = await PollVote.find({
      postId: { $in: pollPosts.map((p) => p._id) },
      userId: viewerId,
    }).select('postId optionKey -_id').lean();
    for (const v of votes) myVotes.set(String(v.postId), v.optionKey);
  }

  return posts.map((p) => {
    const json = postJSON(p);
    if (p.type === 'poll') {
      json.poll = pollPayload(p, myVotes.get(String(p._id)) ?? null);
    }
    return json;
  });
}

// ── Rate limiters ──
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many posts created. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Feed ranking ──
// Popularity decays with post age so recent posts with strong engagement rank
// above old posts with the same engagement. The `score` field is stored on the
// post and refreshed whenever votes/comments change, so the DB just sorts on
// one indexed field.
export function computePopularityScore(upvoteCount, downvoteCount, commentCount, createdAt) {
  const net = (Number(upvoteCount) || 0) - (Number(downvoteCount) || 0);
  const comments = Number(commentCount) || 0;
  const engagement = net + comments * 0.5;
  const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 3.6e6);
  // A post loses half its "heat" roughly every 24 hours.
  const decay = Math.pow(0.5, ageHours / 48);
  return engagement * decay;
}

// Refresh a single post's cached popularity score.
export async function refreshPostScore(postId) {
  const post = await Post.findById(postId).select(
    'upvoteCount downvoteCount commentCount createdAt score'
  );
  if (!post) return post;
  const score = computePopularityScore(
    post.upvoteCount,
    post.downvoteCount,
    post.commentCount,
    post.createdAt
  );
  await Post.updateOne({ _id: postId }, { $set: { score } });
  return { ...post.toObject(), score };
}

// GET /api/posts — paginated feed.
// Query: view=new|popular|top, page, limit, time=today|week|month|all (top only),
// author=username (filter to one author's posts)
router.get('/', optionalUser, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const view = String(req.query.view || 'new');

    // Only ever return content that hasn't been removed by moderators.
    const filter = { removed: { $ne: true } };

    // Optional search filter (searches title and body).
    const search = String(req.query.search || '').trim();
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: re }, { body: re }];
    }

    // Optional category filter for topic pages.
    const category = String(req.query.category || '').trim();
    if (category && POST_CATEGORIES.includes(category)) {
      filter.category = category;
    }

    // Optional author filter for profile pages.
    if (req.query.author) {
      const author = await UserModel.findOne({ username: String(req.query.author).trim().toLowerCase().replace(/^@/, '') });
      if (author) filter.authorId = author._id;
      else return res.json({ posts: [], page, limit, total: 0, hasMore: false });
    }

    let sort = { createdAt: -1 };

    if (view === 'popular') {
      sort = { score: -1, createdAt: -1 };
    } else if (view === 'following') {
      // Personal feed: newest posts from people the viewer follows. Guests and
      // users who follow nobody get an empty feed.
      if (!req.user) {
        return res.json({ posts: [], page, limit, total: 0, hasMore: false });
      }
      const follows = await Follow.find({ followerId: req.user.id }).select('followingId').lean();
      const followingIds = follows.map((f) => f.followingId).filter(Boolean);
      if (followingIds.length === 0) {
        return res.json({ posts: [], page, limit, total: 0, hasMore: false });
      }
      filter.authorId = { $in: followingIds };
      sort = { createdAt: -1 };
    } else if (view === 'top') {
      // Time filter only applies to the Top view.
      const time = String(req.query.time || 'all');
      const netScore = { $subtract: ['$upvoteCount', '$downvoteCount'] };
      if (time === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        filter.createdAt = { $gte: start };
      } else if (time === 'week') {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        filter.createdAt = { $gte: start };
      } else if (time === 'month') {
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        filter.createdAt = { $gte: start };
      }

      // Top sorts by net score first, then newest — done via aggregation so
      // the sort expression is computed in the database.
      const pipeline = [
        { $match: filter },
        { $addFields: { netScore } },
        { $sort: { netScore: -1, createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'authorId',
            foreignField: '_id',
            as: '_author',
          },
        },
        { $unwind: { path: '$_author', preserveNullAndEmptyArrays: true } },
      ];
      const rawPosts = await Post.aggregate(pipeline);
      const posts = rawPosts.map((p) => {
        const author = p._author || null;
        return {
          ...p,
          authorId: author ? {
            username: author.username,
            name: author.name,
            profileImageUrl: author.profileImageUrl,
            verification: author.verification || 'none',
          } : null,
        };
      });
      const json = await attachPollPayloads(posts, req.user?.id || null);
      return res.json({
        posts: json,
        page,
        limit,
        total: undefined,
        hasMore: posts.length === limit,
      });
    }

    // New + Popular share the same fetch strategy (just different sort keys),
    // both of which run against indexed fields — no full-table sort in JS.
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('authorId', 'username name profileImageUrl verification'),
      Post.countDocuments(filter),
    ]);

    const json = await attachPollPayloads(posts, req.user?.id || null);

    res.json({
      posts: json,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load posts.' });
  }
});

// GET /api/posts/counts — post counts per category (public).
// Used by the feed sidebar to show how many posts each topic has. Counts
// exclude removed content; the client caps the displayed number at 100.
// Registered before /:id so 'counts' is not treated as a post id.
router.get('/counts', async (req, res) => {
  try {
    const filter = { removed: { $ne: true } };
    const [total, grouped] = await Promise.all([
      Post.countDocuments(filter),
      Post.aggregate([
        { $match: filter },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);
    const categories = grouped
      .filter((g) => g._id)
      .map((g) => ({ category: g._id, count: g.count }));
    res.json({ total, categories });
  } catch (err) {
    res.status(500).json({ error: 'Could not load topic counts.' });
  }
});

// GET /api/posts/suggest?q= — lightweight title autocomplete (public).
// Returns just id/title/category so the feed search box can show a
// suggestions dropdown without shipping full post payloads.
// Registered before /:id so 'suggest' is not treated as a post id.
router.get('/suggest', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query || query.length < 2) return res.json({ suggestions: [] });

    const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const posts = await Post.find({ removed: { $ne: true }, title: re })
      .select('title category')
      .sort({ score: -1, createdAt: -1 })
      .limit(6)
      .lean();

    res.json({
      suggestions: posts.map((p) => ({
        id: String(p._id),
        title: p.title,
        category: p.category,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load suggestions.' });
  }
});

// GET /api/posts/saved — the viewer's saved posts, newest save first.
// Registered before /:id so 'saved' isn't treated as a post id.
router.get('/saved', requireUser, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

    const [saved, total] = await Promise.all([
      SavedPost.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('postId'),
      SavedPost.countDocuments({ userId: req.user.id }),
    ]);

    const posts = saved.map((s) => s.postId).filter(Boolean);
    const json = await attachPollPayloads(posts, req.user.id);
    res.json({ posts: json, page, limit, total, hasMore: page * limit < total });
  } catch (err) {
    console.error('Saved posts error:', err);
    res.status(500).json({ error: 'Could not load saved posts.' });
  }
});

// GET /api/posts/saved/ids?posts=a,b,c — which of the given posts the viewer
// has saved (batch check for feed highlighting, like /votes/mine).
router.get('/saved/ids', requireUser, async (req, res) => {
  try {
    const ids = String(req.query.posts || '').split(',').map((s) => s.trim()).filter(isValidObjectId);
    if (ids.length === 0) return res.json({ saved: {} });
    const docs = await SavedPost.find({ userId: req.user.id, postId: { $in: ids } }).select('postId').lean();
    const saved = {};
    for (const d of docs) saved[String(d.postId)] = true;
    res.json({ saved });
  } catch (err) {
    console.error('Saved ids error:', err);
    res.status(500).json({ error: 'Could not load saved flags.' });
  }
});

// POST /api/posts/:id/save — bookmark a post for later.
router.post('/:id/save', requireUser, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid post id.' });
    }
    const post = await Post.findById(req.params.id).select('_id removed');
    if (!post || post.removed) return res.status(404).json({ error: 'Post not found.' });
    try {
      await SavedPost.create({ userId: req.user.id, postId: req.params.id });
    } catch (err) {
      // Already saved — treat as success.
      if (err.code === 11000) return res.json({ saved: true });
      throw err;
    }
    res.status(201).json({ saved: true });
  } catch (err) {
    console.error('Save post error:', err);
    res.status(500).json({ error: 'Could not save this post.' });
  }
});

// DELETE /api/posts/:id/save — remove a saved post.
router.delete('/:id/save', requireUser, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid post id.' });
    }
    await SavedPost.deleteOne({ userId: req.user.id, postId: req.params.id });
    res.json({ saved: false });
  } catch (err) {
    console.error('Unsave post error:', err);
    res.status(500).json({ error: 'Could not remove this post from your saved list.' });
  }
});

// GET /api/posts/:id — single post (public; removed posts are hidden unless
// the request carries an admin token).
router.get('/:id', optionalUser, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('authorId', 'username name profileImageUrl verification');

    if (!post) return res.status(404).json({ error: 'Post not found.' });

    // Hide removed content from everyone except admins.
    let isAdmin = false;
    const authHeader = req.headers.authorization;
    if (post.removed) {
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
          isAdmin = decoded.role === 'admin';
        } catch {
          isAdmin = false;
        }
      }
      if (!isAdmin) return res.status(404).json({ error: 'Post not found.' });
    }

    const json = await postJSONWithPoll(post, req.user?.id || null);
    res.json({ post: json });
  } catch {
    res.status(404).json({ error: 'Post not found.' });
  }
});

// POST /api/posts — create a post (logged-in users only).
router.post('/', createLimiter, requireUser, uploadImageField, async (req, res) => {
  try {
    // Suspended/banned accounts cannot create posts.
    const { restriction } = await loadUserAndRestriction(req.user.id);
    if (restriction) return res.status(403).json({ error: restrictionError(restriction) });

    const titleResult = validateTitle(req.body.title);
    if (!titleResult.ok) return res.status(400).json({ error: titleResult.error });

    const categoryResult = validateCategory(req.body.category);
    if (!categoryResult.ok) return res.status(400).json({ error: categoryResult.error });

    // Type: explicit field wins; fall back to image/link detection.
    let type = req.body.type;
    if (type) {
      const typeResult = validateType(type);
      if (!typeResult.ok) return res.status(400).json({ error: typeResult.error });
      type = typeResult.type;
    } else if (req.file) {
      type = 'image';
    } else if (validateExternalUrl(req.body.externalUrl).url) {
      type = 'link';
    } else {
      type = 'text';
    }

    const body = validateBody(req.body.body);

    // Link posts require a safe URL.
    let externalUrl = '';
    if (req.body.externalUrl) {
      const urlResult = validateExternalUrl(req.body.externalUrl);
      if (!urlResult.ok) return res.status(400).json({ error: urlResult.error });
      externalUrl = urlResult.url;
    }
    if (type === 'link' && !externalUrl) {
      return res.status(400).json({ error: 'Link posts need a URL.' });
    }

    // Image posts require an uploaded image.
    let imageUrl = '';
    let imagePublicId = '';
    if (req.file) {
      const uploaded = await uploadPostImage(req.file.buffer);
      imageUrl = uploaded.url;
      imagePublicId = uploaded.publicId;
      if (type === 'text') type = 'image';
    }
    if (type === 'image' && !imageUrl) {
      return res.status(400).json({ error: 'Image posts need an image (JPG, PNG, or WebP).' });
    }

    // Poll posts require validated options + a duration.
    let poll = undefined;
    if (type === 'poll') {
      const optResult = validatePollOptions(req.body.pollOptions);
      if (!optResult.ok) return res.status(400).json({ error: optResult.error });
      const durResult = validatePollDuration(req.body.pollDuration);
      if (!durResult.ok) return res.status(400).json({ error: durResult.error });
      poll = { options: optResult.options, closesAt: durResult.closesAt, totalVotes: 0 };
    }

    const now = new Date();
    const post = await Post.create({
      authorId: req.user.id,
      type,
      title: titleResult.title,
      body,
      category: categoryResult.category,
      imageUrl,
      imagePublicId,
      externalUrl,
      poll,
      // Seed the popularity score so a brand-new post ranks sensibly and the
      // indexed sort field is always populated.
      score: computePopularityScore(0, 0, 0, now),
      // upvoteCount / downvoteCount / commentCount default to 0
    });

    // Notify users mentioned in the title or body.
    await notifyMentions({ text: `${titleResult.title} ${body}`, actorId: req.user.id, postId: post._id });

    const fresh = await Post.findById(post._id).populate('authorId', 'username name profileImageUrl verification');
    const json = await postJSONWithPoll(fresh, req.user.id);
    res.status(201).json({ post: json });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Could not publish your post.' });
  }
});

// PUT /api/posts/:id — edit a post (owner only).
router.put('/:id', requireUser, uploadImageField, async (req, res) => {
  try {
    const { restriction } = await loadUserAndRestriction(req.user.id);
    if (restriction) return res.status(403).json({ error: restrictionError(restriction) });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    // Only the post owner may edit.
    if (String(post.authorId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You can only edit your own posts.' });
    }

    // Removed posts are locked from editing.
    if (post.removed) {
      return res.status(403).json({ error: 'This post has been removed and cannot be edited.' });
    }

    // Poll posts can be edited only in limited ways — options are fixed once
    // published to keep vote tallies valid. Allow text/category changes.
    if (post.type === 'poll') {
      if (req.body.pollOptions !== undefined) {
        return res.status(400).json({ error: 'Poll options cannot be changed after publishing.' });
      }
    }

    if (req.body.title !== undefined) {
      const titleResult = validateTitle(req.body.title);
      if (!titleResult.ok) return res.status(400).json({ error: titleResult.error });
      post.title = titleResult.title;
    }

    if (req.body.body !== undefined) {
      post.body = validateBody(req.body.body);
    }

    if (req.body.category !== undefined) {
      const categoryResult = validateCategory(req.body.category);
      if (!categoryResult.ok) return res.status(400).json({ error: categoryResult.error });
      post.category = categoryResult.category;
    }

    if (req.body.externalUrl !== undefined && post.type !== 'poll') {
      const urlResult = validateExternalUrl(req.body.externalUrl);
      if (!urlResult.ok) return res.status(400).json({ error: urlResult.error });
      post.externalUrl = urlResult.url;
      if (urlResult.url && post.type === 'text') post.type = 'link';
    }

    if (req.file && post.type !== 'poll') {
      const uploaded = await uploadPostImage(req.file.buffer);
      await deletePostImage(post.imagePublicId);
      post.imageUrl = uploaded.url;
      post.imagePublicId = uploaded.publicId;
      post.type = 'image';
    }

    // timestamps: true bumps updatedAt automatically on save. Refresh the
    // popularity score in case engagement counts changed.
    await post.save();

    const fresh = await Post.findById(post._id).populate('authorId', 'username name profileImageUrl verification');
    const json = await postJSONWithPoll(fresh, req.user.id);
    res.json({ post: json });
  } catch (err) {
    console.error('Edit post error:', err);
    res.status(500).json({ error: 'Could not update your post.' });
  }
});

// DELETE /api/posts/:id — delete a post (owner only).
router.delete('/:id', requireUser, async (req, res) => {
  try {
    const { restriction } = await loadUserAndRestriction(req.user.id);
    if (restriction) return res.status(403).json({ error: restrictionError(restriction) });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    if (String(post.authorId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You can only delete your own posts.' });
    }

    await deletePostImage(post.imagePublicId);
    await Vote.deleteMany({ postId: post._id });
    await PollVote.deleteMany({ postId: post._id });
    await post.deleteOne();

    res.json({ message: 'Post deleted.' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Could not delete your post.' });
  }
});

// GET /api/posts/:id/poll — viewer-specific poll payload (results hidden until
// the viewer votes or the poll closes). Logged-in users can include their vote.
router.get('/:id/poll', optionalUser, async (req, res) => {
  try {
    const viewerId = req.user?.id || null;
    const post = await Post.findById(req.params.id);
    if (!post || post.removed || post.type !== 'poll') {
      return res.status(404).json({ error: 'Poll not found.' });
    }
    let myVote = null;
    if (viewerId) {
      const vote = await PollVote.findOne({ postId: post._id, userId: viewerId })
        .select('optionKey -_id')
        .lean();
      myVote = vote?.optionKey ?? null;
    }
    res.json({ poll: pollPayload(post, myVote) });
  } catch {
    res.status(404).json({ error: 'Poll not found.' });
  }
});

// POST /api/posts/:id/poll-vote — submit or change the current user's poll vote.
// Body: { optionKey }. Only one active vote per user per poll (unique index).
router.post('/:id/poll-vote', rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
}), requireUser, async (req, res) => {
  try {
    const { restriction } = await loadUserAndRestriction(req.user.id);
    if (restriction) return res.status(403).json({ error: restrictionError(restriction) });

    const post = await Post.findById(req.params.id);
    if (!post || post.type !== 'poll') {
      return res.status(404).json({ error: 'Poll not found.' });
    }
    if (post.removed) {
      return res.status(404).json({ error: 'Poll not found.' });
    }
    // Cannot vote on a closed poll.
    if (!pollIsOpen(post)) {
      return res.status(400).json({ error: 'This poll has closed.' });
    }

    const optionKey = String(req.body.optionKey || '');
    const optionIndex = (post.poll?.options || []).findIndex((o) => o.key === optionKey);
    if (optionIndex === -1) {
      return res.status(400).json({ error: 'Please choose a valid poll option.' });
    }

    const filter = { postId: post._id, userId: req.user.id };
    const existing = await PollVote.findOne(filter);

    if (!existing) {
      // New vote — increment the chosen option + total.
      await PollVote.create({ ...filter, optionKey });
    } else if (existing.optionKey !== optionKey) {
      // Change vote — decrement the old option, increment the new one. Total
      // stays the same, so only the per-option deltas change.
      const prevIndex = (post.poll?.options || []).findIndex((o) => o.key === existing.optionKey);
      const inc = {};
      if (prevIndex !== -1) inc[`poll.options.${prevIndex}.voteCount`] = -1;
      inc[`poll.options.${optionIndex}.voteCount`] = 1;
      await Post.updateOne({ _id: post._id }, { $inc: inc });
      existing.optionKey = optionKey;
      await existing.save();
      const fresh = await Post.findById(post._id);
      return res.json({ poll: pollPayload(fresh, optionKey) });
    } else {
      // Same option — no-op, but still return the current results.
      const fresh = await Post.findById(post._id);
      return res.json({ poll: pollPayload(fresh, optionKey) });
    }

    // New-vote path: increment option + total.
    await Post.updateOne(
      { _id: post._id },
      {
        $inc: {
          [`poll.options.${optionIndex}.voteCount`]: 1,
          'poll.totalVotes': 1,
        },
      }
    );

    const fresh = await Post.findById(post._id);
    res.status(201).json({ poll: pollPayload(fresh, optionKey) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You have already voted on this poll.' });
    }
    console.error('Poll vote error:', err);
    res.status(500).json({ error: 'Could not record your vote.' });
  }
});

export default router;