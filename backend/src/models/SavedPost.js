import mongoose from 'mongoose';

// A saved/bookmarked post. One document per (user, post) pair — the unique
// compound index makes toggling idempotent.
const savedPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
}, { timestamps: true });

savedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });
savedPostSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('SavedPost', savedPostSchema);