import mongoose from 'mongoose';

const galleryItemSchema = new mongoose.Schema({
  imageUrl: { type: String, default: '' },
  label: { type: String, default: '' },
  caption: { type: String, default: '' },
}, { _id: false });

const contentSectionSchema = new mongoose.Schema({
  layout: { type: String, enum: ['image-left', 'image-center', 'text-only'], default: 'text-only' },
  heading: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  text: { type: String, default: '' },
}, { _id: false });

const learnSectionSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  image: { type: String, default: '' },
  body: { type: String, default: '' },
  details: [{ type: String }],
  sections: [contentSectionSchema],  // New structured sections
  gallery: [galleryItemSchema],
  status: { type: String, default: 'Draft', enum: ['Draft', 'Published'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

learnSectionSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('LearnSection', learnSectionSchema);
