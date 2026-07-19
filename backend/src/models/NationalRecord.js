import mongoose from 'mongoose';

const nationalRecordSchema = new mongoose.Schema({
  gender: { type: String, required: true, enum: ['Men', 'Women'] },
  discipline: { type: String, default: 'Speed', enum: ['Speed'] },
  recordType: { type: String, required: true, enum: ['current', 'previous'] },
  athleteName: { type: String, required: true },
  athleteImageUrl: { type: String, default: '' },
  athleteSlug: { type: String, default: '' },
  recordTime: { type: String, required: true },
  competition: { type: String, default: '' },
  venue: { type: String, default: '' },
  date: { type: String, default: '' },
  status: { type: String, default: 'Active', enum: ['Active', 'Historical'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

nationalRecordSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('NationalRecord', nationalRecordSchema);
