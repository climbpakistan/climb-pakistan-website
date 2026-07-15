import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  tag: { type: String, required: true, enum: ['Competitions', 'Announcements', 'Athletes'] },
  date: { type: String, required: true },
  excerpt: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  body: [{ type: String }],
  status: { type: String, default: 'Draft', enum: ['Draft', 'Published'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

newsSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('News', newsSchema);
