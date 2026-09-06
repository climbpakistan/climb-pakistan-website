// One-time data migration: remove the unused 'international' verification
// level. Users holding it are downgraded to 'national' (green "Verified
// Athlete"), and the now-dead badge-applications collection is dropped (the
// model + routes were removed from the backend).
//   npm run migrate:badges
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/db.js';

async function run() {
  await connectDB();
  try {
    const { default: User } = await import('./src/models/User.js');
    const users = await User.updateMany(
      { verification: 'international' },
      { $set: { verification: 'national' } },
    );
    console.log(`Migrated ${users.modifiedCount} user(s) from "international" to "national".`);

    const collections = await mongoose.connection.db.listCollections({ name: 'badgeapplications' }).toArray();
    if (collections.length > 0) {
      await mongoose.connection.db.dropCollection('badgeapplications');
      console.log('Dropped obsolete "badgeapplications" collection.');
    } else {
      console.log('No "badgeapplications" collection found — nothing to drop.');
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();