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
