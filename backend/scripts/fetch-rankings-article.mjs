import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const raw = process.env.MONGO_URI;
// mongodb+srv://user:pass@host/db?query
const afterScheme = raw.slice('mongodb+srv://'.length);
const atIdx = afterScheme.lastIndexOf('@');
const creds = afterScheme.slice(0, atIdx);
const rest = afterScheme.slice(atIdx + 1);
const slashIdx = rest.indexOf('/');
const dbName = rest.slice(slashIdx + 1).split('?')[0];
const colonIdx = creds.indexOf(':');
const user = encodeURIComponent(creds.slice(0, colonIdx));
const pass = encodeURIComponent(creds.slice(colonIdx + 1));

console.log('user length:', creds.slice(0, colonIdx).length, '| pass length:', creds.slice(colonIdx + 1).length, '| db:', dbName);

async function tryHost(i) {
  const host = `ac-njwaold-shard-00-0${i}.cbd8636.mongodb.net:27017`;
  const uri = `mongodb://${user}:${pass}@${host}/${dbName}?ssl=true&authSource=admin&directConnection=true`;
  try {
    const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 15000 }).asPromise();
    const found = await conn.db.collection('news').findOne({ slug: 'pakistan-speed-climbing-rankings-2025' });
    console.log(`HOST ${i}: connected`);
    return { conn, found };
  } catch (e) {
    console.log(`HOST ${i}: FAILED - ${e.message.split('\n')[0]}`);
    return null;
  }
}

let result = null;
for (const i of [0, 1, 2]) {
  result = await tryHost(i);
  if (result?.found) break;
}

if (result?.found) {
  console.log(JSON.stringify(result.found, null, 2));
} else {
  console.log('ARTICLE NOT FOUND ON ANY HOST');
}
process.exit(0);
