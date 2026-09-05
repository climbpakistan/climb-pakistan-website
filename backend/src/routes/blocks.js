import { Router } from 'express';
import { Types } from 'mongoose';
import UserBlock from '../models/UserBlock.js';
import Follow from '../models/Follow.js';
import User from '../models/User.js';
import { requireUser } from '../middleware/auth.js';
import { loadUserAndRestriction, restrictionError } from '../utils/userStatus.js';

const router = Router();

function isValidObjectId(value) {
  return typeof value === 'string' && Types.ObjectId.isValid(value);
}

// POST /api/blocks/:userId — block or mute another user.
// Body: { mute: true } mutes; { mute: false } (or omitted) fully blocks.
// A full block also removes any existing follow relationship (both ways) so
// the blocked user cannot keep following the blocker.
router.post('/:userId', requireUser, async (req, res) => {
  try {
    const { restriction } = await loadUserAndRestriction(req.user.id);
    if (restriction) return res.status(403).json({ error: restrictionError(restriction) });

    const blockedId = req.params.userId;
    if (!isValidObjectId(blockedId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }
    if (String(blockedId) === String(req.user.id)) {
      return res.status(400).json({ error: 'You cannot block yourself.' });
    }
    const target = await User.findById(blockedId);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const mute = req.body.mute === true;
    try {
      await UserBlock.updateOne(
        { blockerId: req.user.id, blockedId },
        { $set: { mute } },
        { upsert: true },
      );
    } catch (err) {
      if (err.code === 11000) {
        await UserBlock.updateOne({ blockerId: req.user.id, blockedId }, { $set: { mute } });
      } else {
        throw err;
      }
    }

    // A full block severs the follow relationship in both directions.
    if (!mute) {
      const removedFollower = await Follow.findOneAndDelete({ followerId: blockedId, followingId: req.user.id });
      const removedFollowing = await Follow.findOneAndDelete({ followerId: req.user.id, followingId: blockedId });
      if (removedFollower) {
        await User.updateOne({ _id: blockedId }, { $inc: { followingCount: -1 } });
        await User.updateOne({ _id: req.user.id }, { $inc: { followerCount: -1 } });
      }
      if (removedFollowing) {
        await User.updateOne({ _id: req.user.id }, { $inc: { followingCount: -1 } });
        await User.updateOne({ _id: blockedId }, { $inc: { followerCount: -1 } });
      }
    }

    res.json({ blocked: !mute, muted: mute });
  } catch (err) {
    console.error('Block error:', err);
    res.status(500).json({ error: 'Could not update this user.' });
  }
});

// DELETE /api/blocks/:userId — unblock or unmute.
router.delete('/:userId', requireUser, async (req, res) => {
  try {
    const blockedId = req.params.userId;
    if (!isValidObjectId(blockedId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }
    await UserBlock.deleteOne({ blockerId: req.user.id, blockedId });
    res.json({ blocked: false, muted: false });
  } catch (err) {
    console.error('Unblock error:', err);
    res.status(500).json({ error: 'Could not update this user.' });
  }
});

// GET /api/blocks/status/:userId — whether the viewer has blocked/muted a user.
router.get('/status/:userId', requireUser, async (req, res) => {
  try {
    const blockedId = req.params.userId;
    if (!isValidObjectId(blockedId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }
    const doc = await UserBlock.findOne({ blockerId: req.user.id, blockedId });
    res.json({
      blocked: !!doc && !doc.mute,
      muted: !!doc && doc.mute,
    });
  } catch (err) {
    console.error('Block status error:', err);
    res.status(500).json({ error: 'Could not load block status.' });
  }
});

export default router;