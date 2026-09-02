import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Types } from 'mongoose';
import Report, { REPORT_REASONS, REPORT_STATUSES } from '../models/Report.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import { requireUser } from '../middleware/auth.js';
import { loadUserAndRestriction, restrictionError } from '../utils/userStatus.js';

const router = Router();

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { error: 'Too many reports. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function isValidObjectId(value) {
  return typeof value === 'string' && Types.ObjectId.isValid(value);
}

// POST /api/reports — submit a report on a post or comment (logged-in users).
// Body: { postId } OR { commentId }, plus reason + optional details.
// Duplicate reports for the same content by the same user are rejected.
router.post('/', reportLimiter, requireUser, async (req, res) => {
  try {
    // Suspended/banned accounts cannot report content.
    const { restriction } = await loadUserAndRestriction(req.user.id);
    if (restriction) return res.status(403).json({ error: restrictionError(restriction) });

    const { postId, commentId } = req.body;
    const reason = String(req.body.reason || '').trim();
    const details = String(req.body.details || '').trim().slice(0, 2000);

    // Exactly one target is required.
    const hasPost = !!postId;
    const hasComment = !!commentId;
    if (hasPost === hasComment) {
      return res.status(400).json({ error: 'Report a post or a comment (not both).' });
    }
    if (hasPost && !isValidObjectId(postId)) {
      return res.status(400).json({ error: 'Invalid post id.' });
    }
    if (hasComment && !isValidObjectId(commentId)) {
      return res.status(400).json({ error: 'Invalid comment id.' });
    }
    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'Please choose a valid report reason.' });
    }
    // If reason is "Other", details are required.
    if (reason === 'Other' && !details) {
      return res.status(400).json({ error: 'Please provide additional details for this report.' });
    }

    // The target must exist and not already be removed.
    const target = hasPost ? await Post.findById(postId) : await Comment.findById(commentId);
    if (!target || target.removed) {
      return res.status(404).json({ error: 'The content you are reporting no longer exists.' });
    }

    // Prevent duplicate reports: a user cannot report the same content twice.
    const dupFilter = hasPost
      ? { reporterId: req.user.id, postId }
      : { reporterId: req.user.id, commentId };
    const existing = await Report.findOne(dupFilter);
    if (existing) {
      return res.status(409).json({ error: 'You have already reported this content.' });
    }

    const report = await Report.create({
      reporterId: req.user.id,
      ...(hasPost ? { postId } : { commentId }),
      reason,
      details,
      status: 'pending',
    });

    res.status(201).json({ message: 'Report submitted. Thank you for keeping the community safe.', report });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You have already reported this content.' });
    }
    console.error('Report error:', err);
    res.status(500).json({ error: 'Could not submit your report.' });
  }
});

export { REPORT_REASONS, REPORT_STATUSES };
export default router;
