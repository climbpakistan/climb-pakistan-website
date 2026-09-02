import mongoose from 'mongoose';

export const VOTE_TYPES = ['upvote', 'downvote'];
export const VOTE_TARGETS = ['post', 'comment'];

// One vote per user per post/comment. Only the relevant target field is
// stored (the other stays undefined and is never persisted), so the partial
// unique indexes below can enforce "one active vote per target" without
// null collisions.
const voteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', index: true },
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', index: true },
  voteType: { type: String, enum: VOTE_TYPES, required: true },
}, { timestamps: true });

// Database-level guard: a user can hold at most one vote per post and at
// most one vote per comment. Mongoose syncs these on model init.
voteSchema.index(
  { userId: 1, postId: 1 },
  { unique: true, partialFilterExpression: { postId: { $type: 'objectId' } } },
);
voteSchema.index(
  { userId: 1, commentId: 1 },
  { unique: true, partialFilterExpression: { commentId: { $type: 'objectId' } } },
);

export default mongoose.model('Vote', voteSchema);
