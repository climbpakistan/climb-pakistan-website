import mongoose from 'mongoose';

// User-level block / mute. `mute: true` means the blocker only hides the
// blocked user's posts from their feeds; `mute: false` (a full block) also
// hides their comments and prevents them from following or commenting.
// One document per (blocker, blocked) pair.
const userBlockSchema = new mongoose.Schema({
  blockerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blockedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mute: { type: Boolean, default: false },
}, { timestamps: true });

userBlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export default mongoose.model('UserBlock', userBlockSchema);