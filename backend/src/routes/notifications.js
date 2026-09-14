import { Router } from 'express';
import { Types } from 'mongoose';
import Notification from '../models/Notification.js';
import { requireUser } from '../middleware/auth.js';

const router = Router();

const ACTOR_SELECT = 'username name profileImageUrl verification';

function notificationJSON(notification) {
  const actor = notification.actorId && typeof notification.actorId === 'object' && notification.actorId.username !== undefined
    ? notification.actorId
    : null;
  const post = notification.postId && typeof notification.postId === 'object' && notification.postId.title !== undefined
    ? notification.postId
    : null;

  return {
    id: notification._id,
    type: notification.type,
    read: notification.read,
    createdAt: notification.createdAt,
    actor: actor
      ? {
          username: actor.username,
          name: actor.name,
          profileImageUrl: actor.profileImageUrl,
          verification: actor.verification || 'none',
        }
      : null,
    postId: post ? String(post._id) : (notification.postId ? String(notification.postId) : null),
    postTitle: post ? post.title : null,
    commentId: notification.commentId ? String(notification.commentId) : null,
  };
}

// GET /api/notifications — the viewer's notifications, newest first.
router.get('/', requireUser, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 30));

    const [notifications, total] = await Promise.all([
      Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('actorId', ACTOR_SELECT)
        .populate('postId', 'title'),
      Notification.countDocuments({ userId: req.user.id }),
    ]);

    res.json({
      notifications: notifications.map(notificationJSON),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (err) {
    console.error('List notifications error:', err);
    res.status(500).json({ error: 'Could not load notifications.' });
  }
});

// GET /api/notifications/unread-count — badge count for the navbar bell.
router.get('/unread-count', requireUser, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, read: false });
    res.json({ count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Could not load unread count.' });
  }
});

// POST /api/notifications/read — mark notifications as read (when the bell is
// opened). Body is optional:
//   { notificationIds: [...] } → only those notifications are marked, so
//                                anything that arrived after the list was
//                                fetched stays unread.
//   { ids: [...] } (alias)     → accepted for backward compatibility.
//   no body                    → everything the viewer owns is marked (kept for
//                                backward compatibility with older clients).
router.post('/read', requireUser, async (req, res) => {
  try {
    const filter = { userId: req.user.id, read: false };

    const requestedIds = Array.isArray(req.body?.notificationIds)
      ? req.body.notificationIds
      : (Array.isArray(req.body?.ids) ? req.body.ids : null);
    if (requestedIds) {
      const ids = requestedIds.filter((id) => typeof id === 'string' && Types.ObjectId.isValid(id));
      if (ids.length === 0) return res.json({ ok: true, updated: 0 });
      filter._id = { $in: ids };
    }

    const result = await Notification.updateMany(filter, { $set: { read: true } });
    res.json({ ok: true, updated: result.modifiedCount ?? 0 });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Could not update notifications.' });
  }
});

export default router;