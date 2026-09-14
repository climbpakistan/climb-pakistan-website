import mongoose from 'mongoose';

// Link table: which hashtags a post uses. One document per (post, hashtag)
// pair — the unique compound index makes reprocessing a post idempotent.
const postHashtagSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  hashtagId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hashtag', required: true },
}, { timestamps: true });

postHashtagSchema.index({ postId: 1, hashtagId: 1 }, { unique: true });
// Posts-by-hashtag lookups (hashtag results page).
postHashtagSchema.index({ hashtagId: 1, createdAt: -1 });

export default mongoose.model('PostHashtag', postHashtagSchema);
