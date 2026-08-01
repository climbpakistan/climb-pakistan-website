import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'dns';
import AboutContent from '../src/models/AboutContent.js';

dns.setServers(['8.8.8.8']);

// Exact About page structure requested for the public site.
const DEFAULT_SECTIONS = [
  {
    heading: "Pakistan's Sport Climbing Magazine & Digital Platform",
    paragraphs: [
      "Climb Pakistan is Pakistan's dedicated independent sport climbing magazine and digital platform, created to document, promote and support the growth of sport climbing in Pakistan.",
      "Our mission is to bring together athletes, competitions, rankings, records and climbing news in one place. Whether you're an athlete, coach, climbing gym or fan, Climb Pakistan is your trusted source for competitive climbing in Pakistan.",
    ],
    listItems: [],
  },
  {
    heading: "What You'll Find",
    paragraphs: [
      'At Climb Pakistan, we publish reliable and up-to-date information, including:',
      'Our goal is to preserve the history of sport climbing in Pakistan while making accurate information accessible to everyone.',
    ],
    listItems: [
      'Athlete profiles and achievements',
      'National Sport Climbing Championship results',
      'Pakistan Sport Climbing Rankings',
      'National Speed Climbing Records',
      'Competition news and event coverage',
      'Sport climbing statistics and historical records',
      'Educational content about Speed, Lead and Bouldering',
    ],
  },
  {
    heading: 'Growing the Sport',
    paragraphs: [
      'As sport climbing continues to grow in Pakistan and around the world, Climb Pakistan aims to document the achievements of Pakistani climbers, celebrate the climbing community and inspire the next generation of athletes.',
    ],
    listItems: [],
  },
];

const DEFAULT_CLOSING = 'Join the movement. #ClimbPakistan';

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set in environment');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

async function main() {
  await connectDB();

  let doc = await AboutContent.findOne();
  if (!doc) {
    doc = await AboutContent.create({
      intro: '',
      mission: '',
      closing: DEFAULT_CLOSING,
      sections: DEFAULT_SECTIONS,
    });
    console.log(`CREATED About document: ${doc._id}`);
  } else {
    doc.closing = DEFAULT_CLOSING;
    doc.sections = DEFAULT_SECTIONS;
    await doc.save();
    console.log(`UPDATED About document: ${doc._id}`);
  }

  console.log(`closing: "${doc.closing}"`);
  console.log(`sections: ${doc.sections.length}`);
  doc.sections.forEach((s, i) => console.log(`  ${i + 1}. ${s.heading} — ${s.paragraphs.length} para(s), ${s.listItems.length} list item(s)`));

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
