import { Router } from 'express';
import cloudinary from '../cloudinary.js';
import Photo from '../models/Photo.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }
    const photos = await Photo.find(filter).sort({ createdAt: -1 });
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const photo = await Photo.create(req.body);
    res.status(201).json(photo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const photo = await Photo.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    res.json(photo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const photo = await Photo.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    // If the photo was uploaded via Cloudinary, also delete from Cloudinary
    if (photo.publicId) {
      cloudinary.uploader.destroy(photo.publicId).catch((err) => {
        console.warn('Cloudinary delete warning:', err.message);
      });
    }

    res.json({ message: 'Photo deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
