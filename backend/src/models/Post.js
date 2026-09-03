import mongoose from 'mongoose';

// Post categories — keep in sync with the frontend (communityData.js).
export const POST_CATEGORIES = [
  'Questions',
  'Training',
  'Competition',
  'Climbing Gear',
  'Outdoor Climbing',
  'News',
];

// Exactly four post types. Video uploads are NOT supported.
export const POST_TYPES = ['text', 'image', 'link', 'poll'];

// Maximum number of poll options a single poll may hold.
export const MAX_POLL_OPTIONS = 12;

// Poll duration presets (hours). `null` means no expiry.
export const POLL_DURATIONS = [
  { value: 24, label: '1 day' },
  { value: 72, label: '3 days' },
  { value: 168, label: '7 days' },
  { value: null, label: 'No expiry' },
];

const pollOptionSchema = new mongoose.Schema({
  // Stable client-supplied id so the frontend can track options without relying on array indexes.
  key: { type: String, required: true },
  text: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  voteCount: { type: Number, default: 0, min: 0 },
}, { _id: false });

const postSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: POST_TYPES, required: true },
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 300 },
  body: { type: String, default: '', maxlength: 5000 },
  category: { type: String, enum: POST_CATEGORIES, required: true },
  imageUrl: { type: String, default: '' },
  // Cloudinary public id — lets us delete/replace the stored image.
  imagePublicId: { type: String, default: '' },
  externalUrl: { type: String, default: '' },
  upvoteCount: { type: Number, default: 0, min: 0 },
  downvoteCount: { type: Number, default: 0, min: 0 },
  commentCount: { type: Number, default: 0, min: 0 },
  // Feed ranking score — cache so queries sort on one indexed field instead of
  // computing an expression per post (keeps database queries fast).
  score: { type: Number, default: 0 },
  // Moderation soft-delete: removed content stays in the DB for admin review
  // but is hidden from normal community users.
  removed: { type: Boolean, default: false },
  removedAt: { type: Date, default: null },
  // ── Poll payload (only relevant when type === 'poll') ──
  poll: {
    options: { type: [pollOptionSchema], default: [] },
    // epoch ms when the poll closes; null = no expiry.
    closesAt: { type: Date, default: null },
    totalVotes: { type: Number, default: 0, min: 0 },
  },
}, { timestamps: true }); // createdAt + updatedAt (updatedAt bumps on save)

postSchema.index({ createdAt: -1 });
postSchema.index({ score: -1, createdAt: -1 });
// Feed queries filter out removed content; index removed alongside the sort keys.
postSchema.index({ removed: 1, score: -1, createdAt: -1 });
postSchema.index({ removed: 1, createdAt: -1 });

export default mongoose.model('Post', postSchema);