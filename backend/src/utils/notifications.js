import Notification from '../models/Notification.js';

/**
 * Create a notification for `userId`, triggered by `actorId`. Users are never
 * notified about their own actions, and failures are swallowed (notification
 * delivery is best-effort — it must never break the main action).
 */
export async function createNotification({ userId, type, actorId, postId = null, commentId = null }) {
  if (!userId || !actorId || String(userId) === String(actorId)) return null;
  try {
    return await Notification.create({ userId, type, actorId, postId, commentId });
  } catch (err) {
    console.warn('Could not create notification:', err.message);
    return null;
  }
}

/**
 * Like createNotification, but only creates the notification when an identical
 * one (same recipient, type, actor and target) does not already exist.
 *
 * Used for "like" and "mention" notifications so toggling a vote (upvote →
 * remove → upvote) or re-saving the same text never spams the recipient with
 * duplicates, while different actors still each get their own notification.
 * Self-actions are still skipped.
 *
 * The lookup below is a fast path, not the guarantee: the `notification_identity`
 * unique index on the model is what makes this atomic. A duplicate-key error
 * means the notification already exists — exactly the desired outcome — so it
 * is swallowed rather than surfaced as a failure.
 */
export async function createNotificationOnce({ userId, type, actorId, postId = null, commentId = null }) {
  if (!userId || !actorId || String(userId) === String(actorId)) return null;
  try {
    const existing = await Notification.findOne({ userId, type, actorId, postId, commentId })
      .select('_id')
      .lean();
    if (existing) return null;
    return await Notification.create({ userId, type, actorId, postId, commentId });
  } catch (err) {
    // Lost the race against the unique index (or the index caught a duplicate
    // the lookup missed) — the notification is already there, so do nothing.
    if (err?.code === 11000) return null;
    console.warn('Could not create notification:', err.message);
    return null;
  }
}
