import mongoose from 'mongoose';

const teamRankingSchema = new mongoose.Schema({
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

teamRankingSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('TeamRanking', teamRankingSchema);
