import { Router } from 'express';
import News from '../models/News.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const articles = await News.find(filter).sort({ date: -1 });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const article = await News.findOne({ slug: req.params.slug });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const article = await News.create(req.body);
    res.status(201).json(article);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:slug', async (req, res) => {
  try {
    const article = await News.findOneAndUpdate(
      { slug: req.params.slug },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:slug', async (req, res) => {
  try {
    const article = await News.findOneAndDelete({ slug: req.params.slug });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({ message: 'Article deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
