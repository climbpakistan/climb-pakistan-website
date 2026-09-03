import mongoose from 'mongoose';

const BADGE_TYPES = ['national', 'international'];
const APPLICATION_STATUSES = ['pending', 'approved', 'rejected'];

const badgeApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  badgeType: { type: String, enum: BADGE_TYPES, required: true },
  status: { type: String, enum: APPLICATION_STATUSES, default: 'pending' },
  // Admin notes visible only to admins
  adminNotes: { type: String, default: '', maxlength: 1000 },
  // Who handled it and when
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  handledAt: { type: Date, default: null },
  // User's reason/message when applying
  message: { type: String, default: '', maxlength: 1000 },
}, { timestamps: true });

// One active (pending) application per user per badge type
badgeApplicationSchema.index({ userId: 1, badgeType: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

export { BADGE_TYPES, APPLICATION_STATUSES };
export default mongoose.model('BadgeApplication', badgeApplicationSchema);
