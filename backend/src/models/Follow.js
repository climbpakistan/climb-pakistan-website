import mongoose from 'mongoose';

// A directed follow relationship: followerId follows followingId.
const followSchema = new mongoose.Schema({
  followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  followingId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true }); // createdAt + updatedAt

// One follow relationship per direction — prevents duplicate following.
followSchema.index(
  { followerId: 1, followingId: 1 },
  { unique: true },
);
// Reverse lookup for followers lists.
followSchema.index({ followingId: 1, followerId: 1 });

export default mongoose.model('Follow', followSchema);
