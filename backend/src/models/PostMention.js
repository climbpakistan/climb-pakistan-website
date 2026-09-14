import mongoose from 'mongoose';

// Link table: which users a post mentions. One document per (post, user) pair,
// so mentioning the same user twice never creates a duplicate row.
const postMentionSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  mentionedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

postMentionSchema.index({ postId: 1, mentionedUserId: 1 }, { unique: true });
// "Who mentioned this user" lookups.
postMentionSchema.index({ mentionedUserId: 1, createdAt: -1 });

export default mongoose.model('PostMention', postMentionSchema);
