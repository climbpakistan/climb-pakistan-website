import { Router } from 'express';
import Competition from '../models/Competition.js';
import { triggerVercelRebuild } from '../utils/rebuild.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const competitions = await Competition.find().sort({ startDate: -1 });
    res.json(competitions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const competition = await Competition.findOne({ slug: req.params.slug });
    if (!competition) return res.status(404).json({ error: 'Competition not found' });
    res.json(competition);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const competition = await Competition.create(req.body);
    triggerVercelRebuild();
    res.status(201).json(competition);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:slug', async (req, res) => {
  try {
    const competition = await Competition.findOneAndUpdate(
      { slug: req.params.slug },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!competition) return res.status(404).json({ error: 'Competition not found' });
    triggerVercelRebuild();
    res.json(competition);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:slug', async (req, res) => {
  try {
    const competition = await Competition.findOneAndDelete({ slug: req.params.slug });
    if (!competition) return res.status(404).json({ error: 'Competition not found' });
    triggerVercelRebuild();
    res.json({ message: 'Competition deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
