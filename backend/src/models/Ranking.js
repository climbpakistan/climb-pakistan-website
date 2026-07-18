import mongoose from 'mongoose';

const rankingSchema = new mongoose.Schema({
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

rankingSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('Ranking', rankingSchema);
