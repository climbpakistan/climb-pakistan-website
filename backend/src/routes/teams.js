import { Router } from 'express';
import Team from '../models/Team.js';
import { triggerVercelRebuild } from '../utils/rebuild.js';

const router = Router();

// GET all teams
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find().sort({ name: 1 });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single team by slug
router.get('/:slug', async (req, res) => {
  try {
    const team = await Team.findOne({ slug: req.params.slug });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create team
router.post('/', async (req, res) => {
  try {
    const { slug, name, logoUrl, description, active } = req.body;
    if (!slug || !name) return res.status(400).json({ error: 'Slug and name are required' });
    const existing = await Team.findOne({ slug });
    if (existing) return res.status(409).json({ error: 'A team with this slug already exists' });
    const team = await Team.create({ slug, name, logoUrl, description, active });
    triggerVercelRebuild();
    res.status(201).json(team);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update team
router.put('/:slug', async (req, res) => {
  try {
    const team = await Team.findOneAndUpdate(
      { slug: req.params.slug },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!team) return res.status(404).json({ error: 'Team not found' });
    triggerVercelRebuild();
    res.json(team);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE team
router.delete('/:slug', async (req, res) => {
  try {
    const team = await Team.findOneAndDelete({ slug: req.params.slug });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    triggerVercelRebuild();
    res.json({ message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
