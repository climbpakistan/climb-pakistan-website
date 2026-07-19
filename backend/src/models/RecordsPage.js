import mongoose from 'mongoose';

const recordsPageSchema = new mongoose.Schema({
  heroTitle: { type: String, default: 'National' },
  heroTitleAccent: { type: String, default: 'Records' },
  heroSubtitle: { type: String, default: "Pakistan's fastest speed climbing times — men's and women's national records tracked from sanctioned competitions." },
  seoTitle: { type: String, default: 'National Records — Speed Climbing' },
  seoDescription: { type: String, default: "Pakistan national speed climbing records — men's and women's current records and historical progression." },
  seoKeywords: { type: String, default: 'Pakistan speed climbing records, national records Pakistan climbing, speed climbing national record, Pakistan climbing records men women' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

recordsPageSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('RecordsPage', recordsPageSchema);
