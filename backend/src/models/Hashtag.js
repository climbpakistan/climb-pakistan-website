import mongoose from 'mongoose';

// A hashtag used anywhere in the community. One document per distinct hashtag,
// stored in normalized (lowercase) form so #Bouldering / #bouldering /
// #BOULDERING are all the same record. `displayName` keeps the first
// capitalization we ever saw so hashtag pages can show a human-friendly name.
export const MAX_HASHTAG_LENGTH = 50;

const hashtagSchema = new mongoose.Schema({
  // Normalized, lowercase form — the canonical key. Unique so duplicate
  // capitalization can never create a second record.
  name: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // Original capitalization first seen (e.g. "SportClimbing"). Display only.
  displayName: { type: String, default: '', trim: true },
  // Denormalized count of visible posts using this hashtag — keeps hashtag
  // suggestions fast without counting the join collection on every request.
  postCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

// Supports prefix autocomplete lookups ordered by popularity.
hashtagSchema.index({ postCount: -1, name: 1 });

export default mongoose.model('Hashtag', hashtagSchema);
