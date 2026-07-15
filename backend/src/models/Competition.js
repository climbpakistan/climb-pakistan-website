import mongoose from 'mongoose';

const resultEntrySchema = new mongoose.Schema({
  rank: { type: Number, required: true },
  name: { type: String, required: true },
  team: { type: String, default: '' },
  mark: { type: String, default: '' },
}, { _id: false });

const genderResultsSchema = new mongoose.Schema({
  Men: [resultEntrySchema],
  Women: [resultEntrySchema],
}, { _id: false });

const disciplineResultsSchema = new mongoose.Schema({
  Speed: { type: genderResultsSchema, default: () => ({ Men: [], Women: [] }) },
  Lead: { type: genderResultsSchema, default: () => ({ Men: [], Women: [] }) },
  Boulder: { type: genderResultsSchema, default: () => ({ Men: [], Women: [] }) },
}, { _id: false });

const competitionSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  location: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  status: { type: String, default: 'Upcoming', enum: ['Completed', 'Upcoming', 'Ongoing'] },
  disciplines: [{ type: String, enum: ['Speed', 'Lead', 'Boulder'] }],
  overview: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  images: [{ type: mongoose.Schema.Types.Mixed }],
  newsSlugs: [{ type: String }],
  results: { type: disciplineResultsSchema, default: () => ({
    Speed: { Men: [], Women: [] },
    Lead: { Men: [], Women: [] },
    Boulder: { Men: [], Women: [] },
  })},
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

competitionSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('Competition', competitionSchema);
