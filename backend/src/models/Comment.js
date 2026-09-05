import mongoose from 'mongoose';

export const MAX_COMMENT_LENGTH = 2000;

// Comments on community posts. Replies are comments with a parentCommentId —
// nesting is arbitrary in the data model, but the UI keeps it simple by
// rendering all descendants flat under their top-level ancestor.
const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Set when this comment is a reply to another comment.
  parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
  // Plain text only — never rendered as HTML on the client.
  body: { type: String, required: true, trim: true, minlength: 1, maxlength: MAX_COMMENT_LENGTH },
  // Optional single image attached to the comment (Cloudinary).
  imageUrl: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  upvoteCount: { type: Number, default: 0, min: 0 },
  downvoteCount: { type: Number, default: 0, min: 0 },
  // Moderation soft-delete: removed comments stay in the DB for admin review
  // but are hidden from normal community users.
  removed: { type: Boolean, default: false },
  removedAt: { type: Date, default: null },
}, { timestamps: true });

commentSchema.index({ postId: 1, createdAt: 1 });
commentSchema.index({ removed: 1, postId: 1, createdAt: 1 });

export default mongoose.model('Comment', commentSchema);
