// One-time data migration: rename the 'Questions' post category to
// 'Community Posts'. Run once against production after deploying the code
// change (the enum + frontend now use 'Community Posts').
//   npm run migrate:questions
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/db.js';

const OLD = 'Questions';
const NEW = 'Community Posts';

async function run() {
  await connectDB();
  try {
    const { default: Post } = await import('./src/models/Post.js');
    const res = await Post.updateMany({ category: OLD }, { $set: { category: NEW } });
    console.log(`Migrated ${res.modifiedCount} posts from "${OLD}" to "${NEW}".`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();