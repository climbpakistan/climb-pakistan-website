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

export default mongoose.model('Notification', notificationSchema);