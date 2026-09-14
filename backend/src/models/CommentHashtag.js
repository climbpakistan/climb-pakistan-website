import mongoose from 'mongoose';

// Link table: which hashtags a comment uses. One document per (comment,
// hashtag) pair — the unique compound index keeps reprocessing idempotent.
const commentHashtagSchema = new mongoose.Schema({
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true },
  hashtagId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hashtag', required: true },
}, { timestamps: true });

commentHashtagSchema.index({ commentId: 1, hashtagId: 1 }, { unique: true });
// Hashtag-by-comment lookups.
commentHashtagSchema.index({ hashtagId: 1, createdAt: -1 });

export default mongoose.model('CommentHashtag', commentHashtagSchema);
