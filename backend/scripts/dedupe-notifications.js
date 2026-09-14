// One-time cleanup for the notification identity index.
//
//   npm run migrate:notifications           # dry run — reports only
//   npm run migrate:notifications -- --apply  # actually deletes duplicates
//
// Why this exists: `Notification` now has a unique index on
// (userId, type, actorId, postId, commentId) so the same event can never be
// recorded twice. If a collection already contains duplicates — possible from
// the older "upvote → remove → upvote" bug — MongoDB refuses to build the
// unique index and Mongoose logs an index-build failure. Run this once, then
// the index builds normally.
//
// Notes:
//   - Only *notifications* are touched. Posts, comments, users, votes and
//     follows are never modified or deleted.
//   - The oldest notification in each duplicate group is kept, so timestamps of
//     the events users already saw stay accurate. If any copy in the group had
//     been read, the survivor is marked read.
//   - Follow notifications (no postId) are skipped: the index does not cover
//     them, and unfollow → follow is a legitimate second event.
//   - Idempotent: re-running after a clean pass reports zero groups.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/db.js';
import Notification from '../src/models/Notification.js';

const APPLY = process.argv.includes('--apply');

async function run() {
  await connectDB();

  const groups = await Notification.aggregate([
    { $match: { postId: { $ne: null } } },
    // Oldest first, so the survivor is the notification users saw first.
    { $sort: { createdAt: 1, _id: 1 } },
    {
      $group: {
        _id: {
          userId: '$userId',
          type: '$type',
          actorId: '$actorId',
          postId: '$postId',
          commentId: '$commentId',
        },
        ids: { $push: '$_id' },
        anyRead: { $max: { $cond: ['$read', 1, 0] } },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  const duplicateCount = groups.reduce((total, group) => total + group.ids.length - 1, 0);
  console.log(`[notifications] ${groups.length} duplicate group(s), ${duplicateCount} redundant row(s)`);

  if (groups.length === 0) {
    console.log(`[notifications] nothing to do${APPLY ? '' : ' (dry run)'}.`);
  } else if (!APPLY) {
    console.log('[notifications] dry run — re-run with `-- --apply` to delete them.');
  } else {
    for (const group of groups) {
      const [keep, ...redundant] = group.ids;
      if (group.anyRead) {
        await Notification.updateOne({ _id: keep, read: false }, { $set: { read: true } });
      }
      await Notification.deleteMany({ _id: { $in: redundant } });
    }
    console.log(`[notifications] ✓ removed ${duplicateCount} redundant row(s).`);
  }

  // Build the unique identity index now that the data is clean. Safe to call
  // repeatedly; a failure here is logged instead of aborting the script.
  try {
    await Notification.createIndexes();
    console.log('[notifications] ✓ indexes ensured (notification_identity).');
  } catch (err) {
    console.warn('[notifications] could not build indexes:', err.message);
  }

  await mongoose.disconnect();
  console.log('[notifications] done.');
}

run().catch(async (err) => {
  console.error('[notifications] failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
