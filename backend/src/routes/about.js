import { Router } from 'express';
import AboutContent from '../models/AboutContent.js';
import { triggerVercelRebuild } from '../utils/rebuild.js';

const router = Router();

// Default About page content. Shown when a fresh document is created or a
// legacy document (without the `sections` field) is migrated on read.
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

// GET about content (returns first document or creates default)
router.get('/', async (req, res) => {
  try {
    let content = await AboutContent.findOne();
    if (!content) {
      content = await AboutContent.create({
        intro: '',
        mission: '',
        closing: DEFAULT_CLOSING,
        sections: DEFAULT_SECTIONS,
        stats: [
          { label: 'Ranked Athletes', value: '120+' },
          { label: 'Partner Gyms', value: '14' },
          { label: 'Cities Covered', value: '9' },
          { label: 'Founded', value: '2023' },
        ],
      });
    } else if (!content.sections) {
      // Legacy document (created before the sections field existed):
      // migrate it to the structured content on read.
      content.sections = DEFAULT_SECTIONS;
      content.closing = DEFAULT_CLOSING;
      await content.save();
    }
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update about content
router.put('/', async (req, res) => {
  try {
    let content = await AboutContent.findOne();
    if (!content) {
      content = await AboutContent.create(req.body);
    } else {
      Object.assign(content, req.body, { updatedAt: new Date() });
      await content.save();
    }
    triggerVercelRebuild();
    res.json(content);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
