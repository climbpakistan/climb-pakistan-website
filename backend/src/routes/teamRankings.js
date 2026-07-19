import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import TeamRanking from '../models/TeamRanking.js';
import { triggerVercelRebuild } from '../utils/rebuild.js';
import { parseTeamRankingWorkbook } from '../utils/team-ranking-xlsx-parser.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.get('/', async (req, res) => {
  try {
    let doc = await TeamRanking.findOne();
    if (!doc) {
      doc = await TeamRanking.create({ data: {} });
    }
    res.json({ data: doc.data, tags: doc.tags || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/years', async (req, res) => {
  try {
    let doc = await TeamRanking.findOne();
    if (!doc) {
      doc = await TeamRanking.create({ data: {} });
    }
    const data = doc.data;
    const years = Object.keys(data).filter((y) => Array.isArray(data[y]) && data[y].length > 0);
    res.json({ years: years.sort((a, b) => Number(b) - Number(a)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Returns only the most recent year that has team ranking data
router.get('/latest-year', async (req, res) => {
  try {
    let doc = await TeamRanking.findOne();
    if (!doc) {
      doc = await TeamRanking.create({ data: {} });
    }
    const data = doc.data;
    const years = Object.keys(data).filter((y) => Array.isArray(data[y]) && data[y].length > 0);
    const sorted = years.sort((a, b) => Number(b) - Number(a));
    res.json({ year: sorted[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    let doc = await TeamRanking.findOne();
    if (!doc) {
      doc = await TeamRanking.create({ data: req.body.data || req.body });
    } else {
      // Support both raw data and { data: ..., tags: ... } format
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

// ── Bulk import team rankings from .xlsx ──
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No Excel file provided.' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const { data: parsedData, processedSheets } = parseTeamRankingWorkbook(workbook, XLSX);

    const sheetNames = Object.keys(parsedData);
    if (sheetNames.length === 0) {
      return res.status(400).json({
        error: 'No valid year sheets found. Each sheet must be named with a year (e.g. "2024", "2025") and contain team ranking data starting at row 5.',
      });
    }

    // Merge into existing data
    let doc = await TeamRanking.findOne();
    if (!doc) {
      doc = await TeamRanking.create({ data: parsedData });
    } else {
      // Merge: overwrite years that were in the import, keep others
      for (const year of sheetNames) {
        doc.data[year] = parsedData[year];
      }
      doc.markModified('data');
      doc.updatedAt = new Date();
      await doc.save();
    }

    const totalEntries = sheetNames.reduce((sum, y) => sum + parsedData[y].length, 0);

    res.json({
      triggerVercelRebuild();
      message: 'Team rankings import complete',
      summary: {
        yearsImported: sheetNames,
        yearsCount: sheetNames.length,
        totalEntries,
        processedSheets,
      },
    });
  } catch (err) {
    console.error('Team rankings import error:', err);
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

export default router;
