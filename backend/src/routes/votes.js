import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Vote, { VOTE_TYPES, VOTE_TARGETS } from '../models/Vote.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import { requireUser } from '../middleware/auth.js';
import { loadUserAndRestriction, restrictionError } from '../utils/userStatus.js';
import { createNotification } from '../utils/notifications.js';
import { refreshPostScore } from './posts.js';

const router = Router();

const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many votes. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function isValidObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

async function loadTarget(target, targetId) {
  return target === 'post' ? Post.findById(targetId) : Comment.findById(targetId);
}

// POST /api/votes — add, remove, or switch the current user's vote on a post
// or comment. Body: { target: 'post'|'comment', targetId, voteType }.
// voteType can be null to remove the existing vote.
router.post('/', voteLimiter, requireUser, async (req, res) => {
  try {
    // Suspended/banned accounts cannot vote.
    const { restriction } = await loadUserAndRestriction(req.user.id);
    if (restriction) return res.status(403).json({ error: restrictionError(restriction) });

    const { target, targetId } = req.body;
    const voteType = req.body.voteType === null ? null : req.body.voteType;

    if (!VOTE_TARGETS.includes(target)) {
      return res.status(400).json({ error: 'Invalid vote target.' });
    }
    if (voteType !== null && !VOTE_TYPES.includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type.' });
    }
    if (!isValidObjectId(targetId)) {
      return res.status(400).json({ error: 'Invalid target id.' });
    }

    // Validate the target actually exists before touching votes.
    const targetDoc = await loadTarget(target, targetId);
    if (!targetDoc) return res.status(404).json({ error: 'Not found.' });

    const filter = target === 'post'
      ? { userId: req.user.id, postId: targetId }
      : { userId: req.user.id, commentId: targetId };
    const existing = await Vote.findOne(filter);

    // Work out the state transition and the count deltas it implies.
    const inc = {};
    if (!existing && voteType) {
      inc[voteType === 'upvote' ? 'upvoteCount' : 'downvoteCount'] = 1;
      await Vote.create({ userId: req.user.id, voteType, ...filter });
    } else if (existing && voteType === null) {
      // Remove the existing vote.
      inc[existing.voteType === 'upvote' ? 'upvoteCount' : 'downvoteCount'] = -1;
      await existing.deleteOne();
    } else if (existing && voteType && existing.voteType !== voteType) {
      // Switch: down → up or up → down.
      inc[existing.voteType === 'upvote' ? 'upvoteCount' : 'downvoteCount'] = -1;
      inc[voteType === 'upvote' ? 'upvoteCount' : 'downvoteCount'] = 1;
      existing.voteType = voteType;
      await existing.save();
    }
    // (existing && voteType === existing.voteType) → no-op; counts unchanged.

    // Atomically apply the deltas to the denormalized counters.
    if (Object.keys(inc).length > 0) {
      await (target === 'post' ? Post : Comment).updateOne({ _id: targetId }, { $inc: inc });
    }

    // Notify the target's author when the vote results in an upvote that was
    // not already in place (new upvote or a down→up switch).
    if (voteType === 'upvote' && !(existing && existing.voteType === 'upvote')) {
      const targetAuthorId = targetDoc.authorId;
      if (targetAuthorId) {
        await createNotification({
          userId: targetAuthorId,
          type: 'like',
          actorId: req.user.id,
          postId: target === 'post' ? targetId : null,
          commentId: target === 'comment' ? targetId : null,
        });
      }
    }

    // Keep the post's cached popularity score fresh so the Popular feed stays
    // current as votes land. (Comments refresh their own score on the post.)
    if (target === 'post') {
      await refreshPostScore(targetId);
    }

    // Re-read the counters for an authoritative response.
    const fresh = await loadTarget(target, targetId);
    res.json({
      upvoteCount: fresh.upvoteCount ?? 0,
      downvoteCount: fresh.downvoteCount ?? 0,
      myVote: voteType,
    });
  } catch (err) {
    // Duplicate-vote race lost against the unique index — not an error for the user.
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You have already voted on this.' });
    }
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Could not record your vote.' });
  }
});

// GET /api/votes/mine — batch lookup of the current user's votes.
// Query: ?posts=id1,id2&comments=id3,id4  → { posts: {id: type}, comments: {...} }
// Used by the feed so highlighting works without loading every vote doc.
router.get('/mine', requireUser, async (req, res) => {
  try {
    const result = { posts: {}, comments: {} };
    const parse = (v) => String(v || '').split(',').map((s) => s.trim()).filter(isValidObjectId);

    const postIds = parse(req.query.posts);
    if (postIds.length > 0) {
      const votes = await Vote.find({ userId: req.user.id, postId: { $in: postIds } }).select('postId voteType');
      for (const v of votes) result.posts[String(v.postId)] = v.voteType;
    }

    const commentIds = parse(req.query.comments);
    if (commentIds.length > 0) {
      const votes = await Vote.find({ userId: req.user.id, commentId: { $in: commentIds } }).select('commentId voteType');
      for (const v of votes) result.comments[String(v.commentId)] = v.voteType;
    }

    res.json(result);
  } catch (err) {
    console.error('My votes error:', err);
    res.status(500).json({ error: 'Could not load your votes.' });
  }
});

export default router;
