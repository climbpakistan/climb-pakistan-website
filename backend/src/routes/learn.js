import { Router } from 'express';
import LearnSection from '../models/LearnSection.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const sections = await LearnSection.find(filter).sort({ createdAt: 1 });
    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const section = await LearnSection.findOne({ slug: req.params.slug });
    if (!section) return res.status(404).json({ error: 'Section not found' });
    res.json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const section = await LearnSection.create(req.body);
    res.status(201).json(section);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:slug', async (req, res) => {
  try {
    const section = await LearnSection.findOneAndUpdate(
      { slug: req.params.slug },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!section) return res.status(404).json({ error: 'Section not found' });
    res.json(section);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:slug', async (req, res) => {
  try {
    const section = await LearnSection.findOneAndDelete({ slug: req.params.slug });
    if (!section) return res.status(404).json({ error: 'Section not found' });
    res.json({ message: 'Section deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
