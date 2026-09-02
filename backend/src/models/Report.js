import mongoose from 'mongoose';

// Reasons a user can cite when reporting content.
export const REPORT_REASONS = [
  'Spam',
  'Harassment or bullying',
  'Offensive content',
  'Dangerous climbing advice',
  'False or misleading information',
  'Unauthorized promotion or advertising',
  'Off-topic',
  'Other',
];

// Lifecycle of a report.
export const REPORT_STATUSES = ['pending', 'reviewed', 'dismissed', 'actioned'];

// A report references either a post OR a comment (a comment already covers
// replies, since replies are comments with a parentCommentId). Only the
// relevant target field is populated.
const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', index: true },
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', index: true },
  reason: { type: String, enum: REPORT_REASONS, required: true },
  details: { type: String, default: '', maxlength: 2000 },
  status: { type: String, enum: REPORT_STATUSES, default: 'pending', index: true },
  // Admin who last reviewed/acted on this report.
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  handledAt: { type: Date, default: null },
  // Snapshot of moderation result linked to this report.
  actionTaken: { type: String, default: '' },
}, { timestamps: true }); // createdAt + updatedAt

// At most one active report per user per target (prevents duplicate reports).
// Partial unique indexes avoid null-collision between post/comment targets.
reportSchema.index(
  { reporterId: 1, postId: 1 },
  { unique: true, partialFilterExpression: { postId: { $type: 'objectId' } } },
);
reportSchema.index(
  { reporterId: 1, commentId: 1 },
  { unique: true, partialFilterExpression: { commentId: { $type: 'objectId' } } },
);
// Moderation listing sorts by most recent pending report first.
reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Report', reportSchema);
