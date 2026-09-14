import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = ['like', 'comment', 'reply', 'follow', 'mention'];

// In-app notification for a community user. One document per event — likes,
// comments, replies, follows and mentions all land here. `read` flips when the
// recipient opens their notifications.
const notificationSchema = new mongoose.Schema({
  // Recipient of the notification.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  // Who triggered the event.
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Context: set for post/comment-related notifications.
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

// Notification identity: one document per (recipient, type, actor, target).
// Unique so two concurrent requests can never insert the same notification
// twice — createNotificationOnce() treats a duplicate-key error as "already
// exists" rather than as a failure.
//
// The index is partial on postId being an ObjectId because a full unique index
// would treat every `follow` notification (postId/commentId both null) as the
// same row, silently suppressing the legitimate re-notification you get after
// unfollow → follow. Everything with a target — likes, comments, replies and
// mentions on either a post or a comment — is covered.
notificationSchema.index(
  { userId: 1, type: 1, actorId: 1, postId: 1, commentId: 1 },
  {
    unique: true,
    name: 'notification_identity',
    partialFilterExpression: { postId: { $type: 'objectId' } },
  },
);

export default mongoose.model('Notification', notificationSchema);