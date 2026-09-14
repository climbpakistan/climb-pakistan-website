// ============================================================================
// Persistence for parsed @mentions and #hashtags.
//
// Works for both posts and comments: the caller passes either `postId` or
// `commentId` and the matching join collections are used. Everything is
// diff-based, so re-running it (e.g. after an edit) only adds/removes what
// actually changed — and notifications are only sent for newly added mentions.
// ============================================================================

import Hashtag from '../models/Hashtag.js';
import PostHashtag from '../models/PostHashtag.js';
import CommentHashtag from '../models/CommentHashtag.js';
import PostMention from '../models/PostMention.js';
import CommentMention from '../models/CommentMention.js';
import User from '../models/User.js';
import { createNotificationOnce } from './notifications.js';
import { extractHashtags, extractMentions } from './socialText.js';

/**
 * Resolve the join models + the foreign-key field for a target. Returns null
 * when neither a post nor a comment was supplied.
 */
// Note: comment calls pass BOTH postId (notification context) and commentId
// (the entity being linked), so commentId takes precedence here.
function resolveTarget({ postId, commentId }) {
  if (commentId) {
    return {
      key: 'commentId',
      id: commentId,
      hashtagLink: CommentHashtag,
      mentionLink: CommentMention,
      isPost: false,
    };
  }
  if (postId) {
    return {
      key: 'postId',
      id: postId,
      hashtagLink: PostHashtag,
      mentionLink: PostMention,
      isPost: true,
    };
  }
  return null;
}

/** Upsert hashtag records (normalized) and return a Map of name → _id. */
async function upsertHashtags(tags) {
  const byName = new Map();
  for (const { name, display } of tags) {
    let doc;
    try {
      doc = await Hashtag.findOneAndUpdate(
        { name },
        // Never overwrite the stored display name — the first capitalization
        // we ever saw wins (hashtags are case-insensitive).
        { $setOnInsert: { name, displayName: display || name } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (err) {
      // Duplicate-key race: another request inserted the same hashtag first.
      if (err?.code === 11000) doc = await Hashtag.findOne({ name });
      else throw err;
    }
    if (doc) byName.set(name, doc._id);
  }
  return byName;
}

/** Refresh the denormalized postCount for the given hashtag ids. */
async function refreshHashtagCounts(hashtagIds) {
  await Promise.all([...hashtagIds].map(async (hashtagId) => {
    const postCount = await PostHashtag.countDocuments({ hashtagId });
    await Hashtag.updateOne({ _id: hashtagId }, { $set: { postCount } });
  }));
}

/**
 * Link the hashtags found in `text` to a post or comment.
 * Idempotent: re-running with the same text makes no changes.
 */
export async function syncHashtags({ text, postId = null, commentId = null }) {
  const target = resolveTarget({ postId, commentId });
  if (!target || !text) return;

  const tags = extractHashtags(text);
  const byName = await upsertHashtags(tags);
  const newIds = new Set([...byName.values()].map(String));

  const existing = await target.hashtagLink
    .find({ [target.key]: target.id })
    .select('hashtagId')
    .lean();
  const existingIds = new Set(existing.map((row) => String(row.hashtagId)));

  const toAdd = [...newIds].filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !newIds.has(id));

  if (toAdd.length > 0) {
    await target.hashtagLink.insertMany(
      toAdd.map((hashtagId) => ({ [target.key]: target.id, hashtagId })),
      { ordered: false },
    ).catch((err) => {
      if (err?.code !== 11000) throw err;
    });
  }
  if (toRemove.length > 0) {
    await target.hashtagLink.deleteMany({ [target.key]: target.id, hashtagId: { $in: toRemove } });
  }

  // Only post hashtags feed the (post) counts shown on hashtag pages.
  if (target.isPost && (toAdd.length > 0 || toRemove.length > 0)) {
    await refreshHashtagCounts([...new Set([...toAdd, ...toRemove])]);
  }
}

/**
 * Link the @mentions found in `text` to a post or comment.
 *
 * - Only existing users are linked (invalid usernames are ignored).
 * - Notifications are created only for NEWLY added mentions (never duplicates,
 *   never the actor themselves).
 * - Mentions removed during an edit are unlinked without any notification.
 */
export async function syncMentions({
  text,
  actorId,
  postId = null,
  commentId = null,
  type = 'mention',
  // Backfills set this to false so replaying old content never spams users
  // with notifications for mentions that already happened.
  notify = true,
}) {
  const target = resolveTarget({ postId, commentId });
  if (!target) return;

  const usernames = extractMentions(text);

  let users = [];
  if (usernames.length > 0) {
    users = await User.find({ username: { $in: usernames } })
      .select('_id username accountStatus')
      .lean();
  }
  const validIds = new Set(users.map((u) => String(u._id)));

  const existing = await target.mentionLink
    .find({ [target.key]: target.id })
    .select('mentionedUserId')
    .lean();
  const existingIds = new Set(existing.map((row) => String(row.mentionedUserId)));

  const toAdd = [...validIds].filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !validIds.has(id));

  if (toAdd.length > 0) {
    await target.mentionLink.insertMany(
      toAdd.map((mentionedUserId) => ({ [target.key]: target.id, mentionedUserId })),
      { ordered: false },
    ).catch((err) => {
      if (err?.code !== 11000) throw err;
    });
  }
  if (toRemove.length > 0) {
    await target.mentionLink.deleteMany({ [target.key]: target.id, mentionedUserId: { $in: toRemove } });
  }

  if (!notify) return;

  // Notify only the newly mentioned, active accounts. createNotificationOnce
  // drops self-mentions, so a user is never told about their own post/comment,
  // and its identity de-dupe is a second safeguard on top of the link diff
  // above (e.g. a mention removed and re-added while editing).
  const toNotify = users.filter((u) => toAdd.includes(String(u._id)) && u.accountStatus === 'active');
  await Promise.all(toNotify.map((u) => createNotificationOnce({
    userId: u._id,
    type,
    actorId,
    postId,
    commentId,
  })));
}

/**
 * Remove every hashtag/mention link for a post or comment (used when content
 * is deleted). Keeps the join tables and hashtag post counts tidy.
 */
export async function removeSocialLinks({ postId = null, commentId = null }) {
  const target = resolveTarget({ postId, commentId });
  if (!target) return;

  const existing = await target.hashtagLink
    .find({ [target.key]: target.id })
    .select('hashtagId')
    .lean();

  await Promise.all([
    target.hashtagLink.deleteMany({ [target.key]: target.id }),
    target.mentionLink.deleteMany({ [target.key]: target.id }),
  ]);

  if (target.isPost && existing.length > 0) {
    await refreshHashtagCounts(existing.map((row) => row.hashtagId));
  }
}
