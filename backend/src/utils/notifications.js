import Notification from '../models/Notification.js';
import User from '../models/User.js';

// Usernames are lowercase, 3–20 chars, starting with a letter then letters /
// digits / underscores (see the register validation). The negative lookbehind
// stops us from matching email addresses (foo@bar.com) where @ is preceded by
// a letter or digit.
const MENTION_RE = /(?<![a-z0-9_])@([a-z][a-z0-9_]{2,19})/g;

/** Pull unique @username mentions out of a plain-text string. */
export function extractMentions(text) {
  if (!text) return [];
  const seen = new Set();
  const mentions = [];
  let match;
  MENTION_RE.lastIndex = 0;
  while ((match = MENTION_RE.exec(String(text))) !== null) {
    const username = match[1].toLowerCase();
    if (!seen.has(username)) {
      seen.add(username);
      mentions.push(username);
    }
  }
  return mentions;
}

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
 * Notify every active user mentioned in `text` about a post or comment.
 * The actor themselves is skipped inside createNotification.
 */
export async function notifyMentions({ text, actorId, postId = null, commentId = null, type = 'mention' }) {
  const usernames = extractMentions(text);
  if (usernames.length === 0) return;
  const users = await User.find({ username: { $in: usernames }, accountStatus: 'active' }).select('_id');
  await Promise.all(users.map((u) => createNotification({
    userId: u._id,
    type,
    actorId,
    postId,
    commentId,
  })));
}