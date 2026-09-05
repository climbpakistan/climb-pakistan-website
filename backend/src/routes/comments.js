import { Router } from 'express';
import { Types } from 'mongoose';
import rateLimit from 'express-rate-limit';
import Comment, { MAX_COMMENT_LENGTH } from '../models/Comment.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import Vote from '../models/Vote.js';
import UserBlock from '../models/UserBlock.js';
import { requireUser, optionalUser } from '../middleware/auth.js';
import { loadUserAndRestriction, restrictionError } from '../utils/userStatus.js';
import { loadHiddenUserIds } from '../utils/userBlocks.js';
import { createNotification, notifyMentions } from '../utils/notifications.js';
import { refreshPostScore } from './posts.js';

const router = Router();

// ── Rate limiting ──
const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  message: { error: 'Too many comments. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Validation helpers ──
// Comments are plain text: trim, cap length, strip control characters.
function sanitizeBody(raw) {
  const body = String(raw ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, MAX_COMMENT_LENGTH);
  return body;
}

function validateBody(raw) {
  const body = sanitizeBody(raw);
  if (!body) return { ok: false, error: 'Comments cannot be empty.' };
  if (body.length > MAX_COMMENT_LENGTH) {
    return { ok: false, error: `Comments must be ${MAX_COMMENT_LENGTH} characters or fewer.` };
  }
  return { ok: true, body };
}

function isValidObjectId(value) {
  return typeof value === 'string' && Types.ObjectId.isValid(value);
}

const AUTHOR_POPULATE = 'username name profileImageUrl verification';

export { commentJSON, AUTHOR_POPULATE, isValidObjectId };

function commentJSON(comment) {
  const authorDoc = comment.authorId && typeof comment.authorId === 'object' && comment.authorId.username !== undefined
    ? comment.authorId
    : null;
  return {
    id: comment._id,
    postId: comment.postId,
    parentCommentId: comment.parentCommentId || null,
    body: comment.body,
    upvoteCount: comment.upvoteCount,
    downvoteCount: comment.downvoteCount,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
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

// ── Routes ──

// GET /api/comments/user/:username — a user's comments (for profile pages).
// Must be declared BEFORE /:postId so 'user' isn't mistaken for a post id.
router.get('/user/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').trim().toLowerCase().replace(/^@/, '');
    const author = await User.findOne({ username });
    if (!author) return res.json({ comments: [] });
    const comments = await Comment.find({
      authorId: author._id,
      removed: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('authorId', AUTHOR_POPULATE);

    // Attach post titles so profile pages can show comment context.
    const postIds = [...new Set(comments.map((c) => c.postId))].filter(Boolean);
    const posts = postIds.length
      ? await Post.find({ _id: { $in: postIds } }).select('title').lean()
      : [];
    const titleByPost = new Map(posts.map((p) => [String(p._id), p.title || 'a post']));

    res.json({
      comments: comments.map((c) => ({
        ...commentJSON(c),
        post: { title: titleByPost.get(String(c.postId)) || 'a post' },
      })),
    });
  } catch (err) {
    console.error('User comments error:', err);
    res.status(500).json({ error: 'Could not load comments.' });
  }
});

// GET /api/comments/:postId — all comments for a post (public). Replies are
// returned flat with parentCommentId; the client builds the tree. Moderator-
// removed comments are hidden from normal users.
router.get('/:postId', optionalUser, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.postId)) {
      return res.status(400).json({ error: 'Invalid post id.' });
    }
    let comments = await Comment.find({
      postId: req.params.postId,
      removed: { $ne: true },
    })
      .sort({ createdAt: 1 })
      .populate('authorId', AUTHOR_POPULATE);

    // Hide comments from users the viewer blocked or who blocked the viewer.
    if (req.user) {
      const hidden = await loadHiddenUserIds(req.user.id);
      const hiddenIds = new Set([...hidden.blockedIds, ...hidden.blockedByIds].map(String));
      if (hiddenIds.size > 0) {
        comments = comments.filter((c) => {
          const authorId = c.authorId && typeof c.authorId === 'object' ? c.authorId._id : c.authorId;
          return !hiddenIds.has(String(authorId));
        });
      }
    }

    res.json({ comments: comments.map(commentJSON) });
  } catch (err) {
    console.error('List comments error:', err);
    res.status(500).json({ error: 'Could not load comments.' });
  }
});

// POST /api/comments — create a comment or reply (logged-in users only).
// Body: { postId, body, parentCommentId? }
router.post('/', commentLimiter, requireUser, async (req, res) => {
  try {
    // Suspended/banned accounts cannot comment or reply.
    const { restriction } = await loadUserAndRestriction(req.user.id);
    if (restriction) return res.status(403).json({ error: restrictionError(restriction) });

    const { postId, parentCommentId } = req.body;

    if (!isValidObjectId(postId)) {
      return res.status(400).json({ error: 'Invalid post id.' });
    }
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.removed) return res.status(404).json({ error: 'Post not found.' });

    // Users blocked by the post author cannot comment on it.
    if (post.authorId) {
      const blocked = await UserBlock.findOne({ blockerId: post.authorId, blockedId: req.user.id, mute: false });
      if (blocked) return res.status(403).json({ error: 'You cannot comment on this post.' });
    }

    const bodyResult = validateBody(req.body.body);
    if (!bodyResult.ok) return res.status(400).json({ error: bodyResult.error });

    let parent = null;
    if (parentCommentId) {
      if (!isValidObjectId(parentCommentId)) {
        return res.status(400).json({ error: 'Invalid parent comment id.' });
      }
      parent = await Comment.findById(parentCommentId);
      if (!parent || String(parent.postId) !== String(postId)) {
        return res.status(400).json({ error: 'The comment you are replying to no longer exists.' });
      }
    }

    const comment = await Comment.create({
      postId,
      parentCommentId: parent ? parent._id : null,
      authorId: req.user.id,
      body: bodyResult.body,
      // upvoteCount / downvoteCount default to 0
    });

    // Keep the post's denormalized comment count in sync (comments + replies)
    // and refresh its popularity score so engagement shows up in the feed.
    await Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });
    await refreshPostScore(postId);

    // Notify: a reply alerts the parent comment's author; a top-level comment
    // alerts the post author. Mentioned users are notified either way.
    if (parent) {
      await createNotification({
        userId: parent.authorId,
        type: 'reply',
        actorId: req.user.id,
        postId,
        commentId: comment._id,
      });
    } else {
      await createNotification({
        userId: post.authorId,
        type: 'comment',
        actorId: req.user.id,
        postId,
        commentId: comment._id,
      });
    }
    await notifyMentions({ text: bodyResult.body, actorId: req.user.id, postId, commentId: comment._id });

    const fresh = await Comment.findById(comment._id).populate('authorId', AUTHOR_POPULATE);
    res.status(201).json({ comment: commentJSON(fresh) });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Could not add your comment.' });
  }
});


// PUT /api/comments/:id — edit a comment (owner only).
router.put('/:id', requireUser, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid comment id.' });
    }
    const { restriction } = await loadUserAndRestriction(req.user.id);
    if (restriction) return res.status(403).json({ error: restrictionError(restriction) });

    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });
    if (comment.removed) {
      return res.status(403).json({ error: 'This comment has been removed and cannot be edited.' });
    }

    // Only the comment owner may edit.
    if (String(comment.authorId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You can only edit your own comments.' });
    }

    const bodyResult = validateBody(req.body.body);
    if (!bodyResult.ok) return res.status(400).json({ error: bodyResult.error });
    comment.body = bodyResult.body;

    // timestamps: true bumps updatedAt automatically on save.
    await comment.save();

    const fresh = await Comment.findById(comment._id).populate('authorId', AUTHOR_POPULATE);
    res.json({ comment: commentJSON(fresh) });
  } catch (err) {
    console.error('Edit comment error:', err);
    res.status(500).json({ error: 'Could not update your comment.' });
  }
});

// DELETE /api/comments/:id — delete a comment and all of its replies
// (owner only). The post's commentCount is decremented by the total removed.
router.delete('/:id', requireUser, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid comment id.' });
    }
    const { restriction } = await loadUserAndRestriction(req.user.id);
    if (restriction) return res.status(403).json({ error: restrictionError(restriction) });

    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    if (String(comment.authorId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You can only delete your own comments.' });
    }

    // Collect all descendants (replies of replies included) with a BFS walk.
    const toDelete = [comment._id];
    let frontier = [comment._id];
    while (frontier.length > 0) {
      const children = await Comment.find({ parentCommentId: { $in: frontier } }).select('_id');
      frontier = children.map((c) => c._id);
      toDelete.push(...frontier);
    }

    await Comment.deleteMany({ _id: { $in: toDelete } });
    await Vote.deleteMany({ commentId: { $in: toDelete } });
    await Post.updateOne(
      { _id: comment.postId },
      { $inc: { commentCount: -toDelete.length } },
    );
    await refreshPostScore(comment.postId);

    res.json({ message: 'Comment deleted.', deletedCount: toDelete.length });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Could not delete your comment.' });
  }
});

export default router;

