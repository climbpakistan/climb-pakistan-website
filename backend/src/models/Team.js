import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  logoUrl: { type: String, default: '' },
  description: { type: String, default: '' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

teamSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('Team', teamSchema);
