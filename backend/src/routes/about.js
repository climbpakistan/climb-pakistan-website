import { Router } from 'express';
import AboutContent from '../models/AboutContent.js';

const router = Router();

// GET about content (returns first document or creates default)
router.get('/', async (req, res) => {
  try {
    let content = await AboutContent.findOne();
    if (!content) {
      content = await AboutContent.create({
        intro: '',
        mission: '',
        closing: '',
        stats: [
          { label: 'Ranked Athletes', value: '120+' },
          { label: 'Partner Gyms', value: '14' },
          { label: 'Cities Covered', value: '9' },
          { label: 'Founded', value: '2023' },
        ],
      });
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
    res.json(content);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
