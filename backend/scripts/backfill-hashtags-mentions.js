// One-time (and safely re-runnable) backfill: parse every existing post and
// comment so their hashtags and @mentions become functional.
//
//   npm run migrate:social
//
// Notes:
//   - Original post/comment text is never modified or deleted — we only add
//     rows to the hashtag/mention join collections.
//   - Notifications are intentionally NOT created: this replays historical
//     content, so notifying now would spam every previously-mentioned user.
//   - Idempotent: the sync helpers diff against existing links, so running this
//     again makes no changes. Safe to stop/restart.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/db.js';
import Post from '../src/models/Post.js';
import Comment from '../src/models/Comment.js';
import { syncHashtags, syncMentions } from '../src/utils/socialSync.js';

const BATCH_SIZE = 200;

async function backfillPosts() {
  let processed = 0;
  const cursor = Post.find({}).select('_id authorId title body').lean().cursor();
  let batch = [];

  const flush = async () => {
    for (const post of batch) {
      const text = `${post.title || ''} ${post.body || ''}`;
      await Promise.all([
        syncHashtags({ text, postId: post._id }),
        syncMentions({ text, actorId: post.authorId, postId: post._id, notify: false }),
      ]);
      processed += 1;
    }
    batch = [];
  };

  for await (const post of cursor) {
    batch.push(post);
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();
  return processed;
}

async function backfillComments() {
  let processed = 0;
  const cursor = Comment.find({}).select('_id authorId body').lean().cursor();
  let batch = [];

  const flush = async () => {
    for (const comment of batch) {
      await Promise.all([
        syncHashtags({ text: comment.body, commentId: comment._id }),
        syncMentions({ text: comment.body, actorId: comment.authorId, commentId: comment._id, notify: false }),
      ]);
      processed += 1;
    }
    batch = [];
  };

  for await (const comment of cursor) {
    batch.push(comment);
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();
  return processed;
}

async function run() {
  await connectDB();
  console.log('[backfill] parsing existing posts and comments…');

  const posts = await backfillPosts();
  console.log(`[backfill] ✓ ${posts} posts processed`);

  const comments = await backfillComments();
  console.log(`[backfill] ✓ ${comments} comments processed`);

  await mongoose.disconnect();
  console.log('[backfill] done.');
}

run().catch(async (err) => {
  console.error('[backfill] failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
