import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import Ranking from '../models/Ranking.js';
import { parseAthleteRankingWorkbook } from '../utils/athlete-ranking-xlsx-parser.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.get('/', async (req, res) => {
  try {
    let doc = await Ranking.findOne();
    if (!doc) {
      doc = await Ranking.create({ data: {} });
    }
    res.json(doc.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/years', async (req, res) => {
  try {
    let doc = await Ranking.findOne();
    if (!doc) {
      doc = await Ranking.create({ data: {} });
    }
    const data = doc.data;
    const years = new Set();
    for (const cat of Object.keys(data)) {
      for (const disc of Object.keys(data[cat] || {})) {
        for (const year of Object.keys(data[cat][disc] || {})) {
          years.add(year);
        }
      }
    }
    const sorted = [...years].sort((a, b) => Number(b) - Number(a));
    res.json({ years: sorted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Returns only the most recent year that has ranking data
router.get('/latest-year', async (req, res) => {
  try {
    let doc = await Ranking.findOne();
    if (!doc) {
      doc = await Ranking.create({ data: {} });
    }
    const data = doc.data;
    let latestYear = null;
    for (const cat of Object.keys(data)) {
      for (const disc of Object.keys(data[cat] || {})) {
        for (const year of Object.keys(data[cat][disc] || {})) {
          if (!latestYear || Number(year) > Number(latestYear)) {
            latestYear = year;
          }
        }
      }
    }
    res.json({ year: latestYear });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    let doc = await Ranking.findOne();
    if (!doc) {
      doc = await Ranking.create({ data: req.body });
    } else {
      doc.data = req.body;
      doc.markModified('data');
      doc.updatedAt = new Date();
      await doc.save();
    }
    res.json(doc.data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Bulk import athlete (player) rankings from .xlsx ──
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No Excel file provided.' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const parsedData = parseAthleteRankingWorkbook(workbook, XLSX);

    const totalEntries = Object.values(parsedData).reduce(
      (sum, genders) => sum + Object.values(genders).reduce(
        (s, disc) => s + Object.values(disc).reduce(
          (s2, arr) => s2 + arr.length, 0
        ), 0
      ), 0
    );

    if (totalEntries === 0) {
      return res.status(400).json({
        error: 'No valid athlete ranking rows found. Expected columns: Gender | Discipline | Year | Rank | athlete-slug | Athlete Name | Team | points',
      });
    }

    // Merge into existing data
    let doc = await Ranking.findOne();
    if (!doc) {
      doc = await Ranking.create({ data: parsedData });
    } else {
      // Deep merge: overwrite specific gender/discipline/year combinations
      for (const [gender, disciplines] of Object.entries(parsedData)) {
        if (!doc.data[gender]) doc.data[gender] = {};
        for (const [discipline, years] of Object.entries(disciplines)) {
          if (!doc.data[gender][discipline]) doc.data[gender][discipline] = {};
          for (const [year, entries] of Object.entries(years)) {
            doc.data[gender][discipline][year] = entries;
          }
        }
      }
      doc.markModified('data');
      doc.updatedAt = new Date();
      await doc.save();
    }

    // Build a summary of imported years per gender/discipline
    const summary = {};
    for (const [gender, disciplines] of Object.entries(parsedData)) {
      for (const [discipline, years] of Object.entries(disciplines)) {
        for (const year of Object.keys(years)) {
          const key = `${gender}|${discipline}|${year}`;
          summary[key] = years[year].length;
        }
      }
    }

    res.json({
      message: 'Athlete rankings import complete',
      summary: {
        totalEntries,
        groups: Object.entries(summary).map(([key, count]) => ({
          group: key,
          entries: count,
        })),
      },
    });
  } catch (err) {
    console.error('Athlete rankings import error:', err);
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

export default router;
