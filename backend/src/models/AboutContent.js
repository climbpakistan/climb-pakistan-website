import mongoose from 'mongoose';

const statSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: String, required: true },
}, { _id: false });

const aboutContentSchema = new mongoose.Schema({
  intro: { type: String, default: '' },
  mission: { type: String, default: '' },
  closing: { type: String, default: '' },
  stats: [statSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

aboutContentSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('AboutContent', aboutContentSchema);
