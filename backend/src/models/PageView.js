import mongoose from 'mongoose';

const pageViewSchema = new mongoose.Schema({
  path: { type: String, required: true, index: true },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now, index: true },
});

// Index for efficient counting
pageViewSchema.index({ timestamp: -1 });

export default mongoose.model('PageView', pageViewSchema);
