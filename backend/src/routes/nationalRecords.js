import { Router } from 'express';
import NationalRecord from '../models/NationalRecord.js';
import { triggerVercelRebuild } from '../utils/rebuild.js';

const router = Router();

/**
 * GET /api/national-records
 * Public — returns all records, grouped by gender and type.
 */
router.get('/', async (req, res) => {
  try {
    // Fetch all, then sort numerically by recordTime so "10.0" > "6.36"
    let records = await NationalRecord.find();
    records.sort((a, b) => parseFloat(a.recordTime) - parseFloat(b.recordTime));

    // Group into Men/Women → current/previous
    const grouped = { Men: { current: [], previous: [] }, Women: { current: [], previous: [] } };
    for (const rec of records) {
      if (grouped[rec.gender] && grouped[rec.gender][rec.recordType]) {
        grouped[rec.gender][rec.recordType].push(rec);
      }
    }

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/national-records
 * Admin — create a new record.
 */
router.post('/', async (req, res) => {
  try {
    const record = await NationalRecord.create(req.body);
    triggerVercelRebuild();
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/national-records/:id
 * Admin — update a record.
 */
router.put('/:id', async (req, res) => {
  try {
    const record = await NationalRecord.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!record) return res.status(404).json({ error: 'Record not found' });
    triggerVercelRebuild();
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/national-records/:id
 * Admin — delete a record.
 */
router.delete('/:id', async (req, res) => {
  try {
    const record = await NationalRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    triggerVercelRebuild();
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
