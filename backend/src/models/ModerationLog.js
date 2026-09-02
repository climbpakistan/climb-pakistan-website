import mongoose from 'mongoose';

// Audit trail for moderation actions (removing/restoring content, warning,
// suspending, banning users, changing verification, linking athletes, etc.).
const modLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  // The subject the action was performed on (user/post/comment id).
  targetType: { type: String, required: true, enum: ['user', 'post', 'comment'] },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  details: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.model('ModerationLog', modLogSchema);
