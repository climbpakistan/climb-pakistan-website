import { Router } from 'express';
import multer from 'multer';
import cloudinary from '../cloudinary.js';
import Photo from '../models/Photo.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

// Helper: upload a buffer to Cloudinary and save to DB
async function uploadBufferToCloudinary(buffer, name, category) {
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'climb-pakistan', resource_type: 'image' },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });

  return Photo.create({
    name,
    url: result.secure_url,
    publicId: result.public_id,
    category: category || 'athletes',
  });
}

// ── Upload from file (multipart) ──
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided.' });

    const name = req.body.name?.trim() || 'Uploaded image';
    const category = req.body.category || 'athletes';
    const photo = await uploadBufferToCloudinary(req.file.buffer, name, category);

    res.status(201).json(photo);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// ── Upload from URL (download → Cloudinary) ──
router.post('/from-url', async (req, res) => {
  try {
    const { url, name, category } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'No image URL provided.' });
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ error: 'URL must start with http:// or https://' });
    }

    const displayName = name?.trim() || 'Uploaded image';
    const displayCategory = category || 'athletes';

    // Download the image from the URL
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download image (HTTP ${response.status})`);

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('Image exceeds 10 MB limit');
    }

    const photo = await uploadBufferToCloudinary(buffer, displayName, displayCategory);

    res.status(201).json(photo);
  } catch (err) {
    console.error('Upload-from-URL error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

export default router;
