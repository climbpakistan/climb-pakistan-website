import mongoose from 'mongoose';

// One poll vote per user per poll post. `optionKey` references the option's
// `key` in the parent post's poll.options array. A user may change their vote
// while the poll is open — the unique index keeps it to a single active vote,
// and the route simply updates the optionKey on a re-vote.
const pollVoteSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  optionKey: { type: String, required: true },
}, { timestamps: true }); // createdAt + updatedAt

// One active vote per user per poll.
pollVoteSchema.index({ postId: 1, userId: 1 }, { unique: true });

export default mongoose.model('PollVote', pollVoteSchema);
