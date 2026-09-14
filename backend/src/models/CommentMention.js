import mongoose from 'mongoose';

// Link table: which users a comment mentions. One document per (comment, user)
// pair, so mentioning the same user twice never creates a duplicate row.
const commentMentionSchema = new mongoose.Schema({
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true },
  mentionedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

commentMentionSchema.index({ commentId: 1, mentionedUserId: 1 }, { unique: true });
// "Who mentioned this user" lookups.
commentMentionSchema.index({ mentionedUserId: 1, createdAt: -1 });

export default mongoose.model('CommentMention', commentMentionSchema);
