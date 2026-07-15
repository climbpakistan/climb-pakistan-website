import mongoose from 'mongoose';

const championEntrySchema = new mongoose.Schema({
  slug: { type: String },
  title: { type: String, default: '' },
  rank: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
}, { _id: false });

const coverageSectionSchema = new mongoose.Schema({
  number: { type: Number },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  link: { type: String, default: '' },
}, { _id: false });

const mainPageSchema = new mongoose.Schema({
  championSlugs: [{ type: String }],
  champions: [championEntrySchema],
  heroTitle: { type: String, default: '' },
  heroSubtitle: { type: String, default: '' },
  heroCtaText: { type: String, default: '' },
  heroCtaLink: { type: String, default: '' },
  heroCta2Text: { type: String, default: '' },
  heroCta2Link: { type: String, default: '' },
  ctaText: { type: String, default: '' },
  ctaSubtext: { type: String, default: '' },
  ctaInstagramHandle: { type: String, default: '' },
  latestNewsCount: { type: Number, default: 3 },
  coverageSections: [coverageSectionSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

mainPageSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('MainPage', mainPageSchema);
