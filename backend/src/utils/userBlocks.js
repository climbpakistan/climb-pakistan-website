import UserBlock from '../models/UserBlock.js';

/**
 * Load the set of users a viewer shouldn't see content from:
 * - blockedIds   — users the viewer fully blocked (content hidden everywhere)
 * - mutedIds     — users the viewer muted (posts hidden from feeds only)
 * - blockedByIds — users who fully blocked the viewer (their content hidden)
 */
export async function loadHiddenUserIds(userId) {
  if (!userId) return { blockedIds: [], mutedIds: [], blockedByIds: [] };

  const docs = await UserBlock.find({
    $or: [{ blockerId: userId }, { blockedId: userId }],
  }).select('blockerId blockedId mute').lean();

  const blockedIds = [];
  const mutedIds = [];
  const blockedByIds = [];

  for (const d of docs) {
    if (String(d.blockerId) === String(userId)) {
      if (d.mute) mutedIds.push(d.blockedId);
      else blockedIds.push(d.blockedId);
    } else if (!d.mute) {
      // They blocked the viewer — hide their content from the viewer too.
      blockedByIds.push(d.blockerId);
    }
  }

  return { blockedIds, mutedIds, blockedByIds };
}