import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import Athlete from '../models/Athlete.js';
import {
  SHEETS, ATHLETE_COLUMNS, MEDAL_COLUMNS,
  parseAthleteRow, parseMedalRow,
} from '../utils/xlsx-parser.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();


// GET all athletes (sorted by rank)
router.get('/', async (req, res) => {
  try {
    const athletes = await Athlete.find().sort({ rank: 1 });
    res.json(athletes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single athlete by slug
router.get('/:slug', async (req, res) => {
  try {
    const athlete = await Athlete.findOne({ slug: req.params.slug });
    if (!athlete) return res.status(404).json({ error: 'Athlete not found' });
    res.json(athlete);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create athlete
router.post('/', async (req, res) => {
  try {
    const athlete = await Athlete.create(req.body);
    res.status(201).json(athlete);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update athlete by slug
router.put('/:slug', async (req, res) => {
  try {
    const athlete = await Athlete.findOneAndUpdate(
      { slug: req.params.slug },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!athlete) return res.status(404).json({ error: 'Athlete not found' });
    res.json(athlete);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE athlete by slug
router.delete('/:slug', async (req, res) => {
  try {
    const athlete = await Athlete.findOneAndDelete({ slug: req.params.slug });
    if (!athlete) return res.status(404).json({ error: 'Athlete not found' });
    res.json({ message: 'Athlete deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bulk import from .xlsx ──
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No Excel file provided.' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // ── Parse Athletes sheet ──
    const athletesSheet = workbook.Sheets[SHEETS.ATHLETES];
    if (!athletesSheet) {
      return res.status(400).json({ error: `Sheet "${SHEETS.ATHLETES}" not found in workbook.` });
    }

    const rows = XLSX.utils.sheet_to_json(athletesSheet, { header: 1, defval: null });

    const athletes = [];
    for (let i = ATHLETE_COLUMNS.DATA_START; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => c === null || c === undefined || c === '')) continue;

      const parsed = parseAthleteRow(row);
      if (parsed) athletes.push(parsed);
    }

    if (athletes.length === 0) {
      return res.status(400).json({ error: 'No valid athlete rows found in the sheet. Check that the sheet format matches the expected template.' });
    }

    // ── Parse Medals sheet ──
    const medalsSheet = workbook.Sheets[SHEETS.MEDALS];
    const medalsBySlug = {};

    if (medalsSheet) {
      const medalRows = XLSX.utils.sheet_to_json(medalsSheet, { header: 1, defval: null });
      for (let i = MEDAL_COLUMNS.DATA_START; i < medalRows.length; i++) {
        const row = medalRows[i];
        if (!row || row.every(c => c === null || c === undefined || c === '')) continue;

        const parsed = parseMedalRow(row);
        if (!parsed) continue;

        if (!medalsBySlug[parsed.slug]) medalsBySlug[parsed.slug] = [];
        medalsBySlug[parsed.slug].push(parsed.entry);
      }
    }

    // ── Upsert athletes ──
    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails = [];

    for (const athlete of athletes) {
      try {
        const medals = medalsBySlug[athlete.slug] || [];
        const existing = await Athlete.findOne({ slug: athlete.slug });

        if (existing) {
          await Athlete.findOneAndUpdate(
            { slug: athlete.slug },
            { $set: { ...athlete, medals, updatedAt: new Date() } },
            { returnDocument: 'after', runValidators: true }
          );
          updated++;
        } else {
          await Athlete.create({ ...athlete, medals });
          created++;
        }
      } catch (err) {
        errors++;
        errorDetails.push({ slug: athlete.slug, name: athlete.name, error: err.message });
      }
    }

    res.json({
      message: 'Import complete',
      summary: { created, updated, errors, total: athletes.length },
      errors: errorDetails,
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

export default router;
