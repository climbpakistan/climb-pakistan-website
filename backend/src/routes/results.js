import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import ChampionshipResult from '../models/ChampionshipResult.js';
import { triggerVercelRebuild } from '../utils/rebuild.js';
import { parseResultsWorkbook } from '../utils/results-xlsx-parser.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

// GET /api/results — returns all championship results
router.get('/', async (req, res) => {
  try {
    let doc = await ChampionshipResult.findOne();
    if (!doc) {
      doc = await ChampionshipResult.create({ data: {} });
    }
    res.json({ data: doc.data, tags: doc.tags || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/results/years — returns sorted unique years that have data
router.get('/years', async (req, res) => {
  try {
    let doc = await ChampionshipResult.findOne();
    if (!doc) {
      doc = await ChampionshipResult.create({ data: {} });
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

// PUT /api/results — save all results data
router.put('/', async (req, res) => {
  try {
    let doc = await ChampionshipResult.findOne();
    if (!doc) {
      doc = await ChampionshipResult.create({ data: req.body.data || req.body });
    } else {
      if (req.body.data !== undefined) {
        doc.data = req.body.data;
        if (req.body.tags !== undefined) doc.tags = req.body.tags;
      } else {
        doc.data = req.body;
      }
      doc.markModified('data');
      doc.updatedAt = new Date();
      await doc.save();
    }
    triggerVercelRebuild();
    res.json({ data: doc.data, tags: doc.tags || [] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/results/import — bulk import from .xlsx
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No Excel file provided.' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const parsedData = parseResultsWorkbook(workbook, XLSX);

    // Count total entries
    const totalEntries = Object.values(parsedData).reduce(
      (sum, genders) => sum + Object.values(genders).reduce(
        (s, disc) => s + Object.values(disc).reduce(
          (s2, arr) => s2 + arr.length, 0
        ), 0
      ), 0
    );

    if (totalEntries === 0) {
      return res.status(400).json({
        error: 'No valid result rows found. Expected columns (row 5): competition-slug | Year | Discipline | Category | Position | athlete-slug | Athlete Name | Team',
      });
    }

    // Merge into existing data
    let doc = await ChampionshipResult.findOne();
    if (!doc) {
      doc = await ChampionshipResult.create({ data: parsedData });
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

    // Build a summary
    const summary = {};
    for (const [gender, disciplines] of Object.entries(parsedData)) {
      for (const [discipline, years] of Object.entries(disciplines)) {
        for (const year of Object.keys(years)) {
          const key = `${gender}|${discipline}|${year}`;
          summary[key] = years[year].length;
        }
      }
    }

    triggerVercelRebuild();
    res.json({
      message: 'Championship results import complete',
      summary: {
        totalEntries,
        groups: Object.entries(summary).map(([key, count]) => ({
          group: key,
          entries: count,
        })),
      },
    });
  } catch (err) {
    console.error('Results import error:', err);
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

export default router;
