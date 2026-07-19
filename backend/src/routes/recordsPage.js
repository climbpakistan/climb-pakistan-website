import { Router } from 'express';
import RecordsPage from '../models/RecordsPage.js';
import { triggerVercelRebuild } from '../utils/rebuild.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    let settings = await RecordsPage.findOne();
    if (!settings) {
      settings = await RecordsPage.create({});
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    let settings = await RecordsPage.findOne();
    if (!settings) {
      settings = await RecordsPage.create(req.body);
    } else {
      const { heroTitle, heroTitleAccent, heroSubtitle, seoTitle, seoDescription, seoKeywords } = req.body;
      if (heroTitle !== undefined) settings.heroTitle = heroTitle;
      if (heroTitleAccent !== undefined) settings.heroTitleAccent = heroTitleAccent;
      if (heroSubtitle !== undefined) settings.heroSubtitle = heroSubtitle;
      if (seoTitle !== undefined) settings.seoTitle = seoTitle;
      if (seoDescription !== undefined) settings.seoDescription = seoDescription;
      if (seoKeywords !== undefined) settings.seoKeywords = seoKeywords;
      settings.updatedAt = new Date();
      await settings.save();
    }
    triggerVercelRebuild();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
