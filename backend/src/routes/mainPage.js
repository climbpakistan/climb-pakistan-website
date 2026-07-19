import { Router } from 'express';
import MainPage from '../models/MainPage.js';
import { triggerVercelRebuild } from '../utils/rebuild.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    let settings = await MainPage.findOne();
    if (!settings) {
      settings = await MainPage.create({ championSlugs: [] });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    let settings = await MainPage.findOne();
    if (!settings) {
      settings = await MainPage.create(req.body);
    } else {
      // Set each field individually so Mongoose properly casts subdocuments
      const {
        championSlugs, champions,
        heroTitle, heroSubtitle, heroCtaText, heroCtaLink, heroCta2Text, heroCta2Link,
        ctaText, ctaSubtext, ctaInstagramHandle,
        latestNewsCount, coverageSections,
      } = req.body;
      if (championSlugs !== undefined) settings.championSlugs = championSlugs;
      if (champions !== undefined) {
        settings.champions = champions;
        settings.markModified('champions');
      }
      if (heroTitle !== undefined) settings.heroTitle = heroTitle;
      if (heroSubtitle !== undefined) settings.heroSubtitle = heroSubtitle;
      if (heroCtaText !== undefined) settings.heroCtaText = heroCtaText;
      if (heroCtaLink !== undefined) settings.heroCtaLink = heroCtaLink;
      if (heroCta2Text !== undefined) settings.heroCta2Text = heroCta2Text;
      if (heroCta2Link !== undefined) settings.heroCta2Link = heroCta2Link;
      if (ctaText !== undefined) settings.ctaText = ctaText;
      if (ctaSubtext !== undefined) settings.ctaSubtext = ctaSubtext;
      if (ctaInstagramHandle !== undefined) settings.ctaInstagramHandle = ctaInstagramHandle;
      if (latestNewsCount !== undefined) settings.latestNewsCount = latestNewsCount;
      if (coverageSections !== undefined) {
        settings.coverageSections = coverageSections;
        settings.markModified('coverageSections');
      }
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
