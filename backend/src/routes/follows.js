import { Router } from 'express';
import { Types } from 'mongoose';
import Follow from '../models/Follow.js';
import User from '../models/User.js';
import { requireUser } from '../middleware/auth.js';
import { loadUserAndRestriction, restrictionError } from '../utils/userStatus.js';
import { createNotification } from '../utils/notifications.js';

const router = Router();

function isValidObjectId(value) {
  return typeof value === 'string' && Types.ObjectId.isValid(value);
}

const AUTHOR_SELECT = 'username name profileImageUrl verification';

// POST /api/follows/:userId — follow another user (logged-in, active users).
router.post('/:userId', requireUser, async (req, res) => {
  try {
    const { restriction } = await loadUserAndRestriction(req.user.id);
    if (restriction) return res.status(403).json({ error: restrictionError(restriction) });

    const targetId = req.params.userId;
    if (!isValidObjectId(targetId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }
    // Cannot follow yourself.
    if (String(targetId) === String(req.user.id)) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }
    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const existing = await Follow.findOne({ followerId: req.user.id, followingId: targetId });
    if (existing) return res.status(409).json({ error: 'You already follow this user.' });

    try {
      await Follow.create({ followerId: req.user.id, followingId: targetId });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: 'You already follow this user.' });
      throw err;
    }
    // Keep denormalized counters in sync.
    await User.updateOne({ _id: req.user.id }, { $inc: { followingCount: 1 } });
    await User.updateOne({ _id: targetId }, { $inc: { followerCount: 1 } });

    // Notify the followed user (createNotification skips self-follows).
    await createNotification({ userId: targetId, type: 'follow', actorId: req.user.id });

    const fresh = await User.findById(targetId).select('followerCount followingCount username');
    res.status(201).json({ following: true, followerCount: fresh.followerCount ?? 0, followingCount: fresh.followingCount ?? 0 });
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ error: 'Could not follow this user.' });
  }
});

// DELETE /api/follows/:userId — unfollow (users can only remove their own follows).
router.delete('/:userId', requireUser, async (req, res) => {
  try {
    const targetId = req.params.userId;
    if (!isValidObjectId(targetId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }
    const existing = await Follow.findOneAndDelete({ followerId: req.user.id, followingId: targetId });
    if (!existing) {
      return res.status(404).json({ error: 'You are not following this user.' });
    }
    await User.updateOne({ _id: req.user.id }, { $inc: { followingCount: -1 } });
    await User.updateOne({ _id: targetId }, { $inc: { followerCount: -1 } });

    const target = await User.findById(targetId).select('followerCount followingCount');
    res.json({ following: false, followerCount: Math.max(0, target?.followerCount ?? 0) });
  } catch (err) {
    console.error('Unfollow error:', err);
    res.status(500).json({ error: 'Could not unfollow this user.' });
  }
});

// GET /api/follows/status/:userId — whether the current user follows a target.
router.get('/status/:userId', requireUser, async (req, res) => {
  try {
    const targetId = req.params.userId;
    if (!isValidObjectId(targetId)) return res.status(400).json({ error: 'Invalid user id.' });
    const existing = await Follow.findOne({ followerId: req.user.id, followingId: targetId });
    res.json({ following: !!existing });
  } catch {
    res.status(500).json({ error: 'Could not load follow status.' });
  }
});

// GET /api/follows/:username/followers — list of users following a profile.
router.get('/:username/followers', async (req, res) => {
  try {
    const profile = await User.findOne({ username: String(req.params.username || '').trim().toLowerCase().replace(/^@/, '') });
    if (!profile) return res.status(404).json({ error: 'User not found.' });
    const follows = await Follow.find({ followingId: profile._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('followerId', AUTHOR_SELECT);
    res.json({ followers: follows.map((f) => f.followerId).filter(Boolean) });
  } catch (err) {
    console.error('Followers error:', err);
    res.status(500).json({ error: 'Could not load followers.' });
  }
});

// GET /api/follows/:username/following — list of users a profile follows.
router.get('/:username/following', async (req, res) => {
  try {
    const profile = await User.findOne({ username: String(req.params.username || '').trim().toLowerCase().replace(/^@/, '') });
    if (!profile) return res.status(404).json({ error: 'User not found.' });
    const follows = await Follow.find({ followerId: profile._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('followingId', AUTHOR_SELECT);
    res.json({ following: follows.map((f) => f.followingId).filter(Boolean) });
  } catch (err) {
    console.error('Following error:', err);
    res.status(500).json({ error: 'Could not load following.' });
  }
});

export default router;
