import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Usernames that cannot be registered by the public (system/trusted accounts).
// Expandable — add future reserved names here. 'climbpakistan' is NOT listed:
// the official Climb Pakistan community account registers it through normal
// signup (the owner claims it, then gets the official badge via the admin tool).
export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'mod',
  'moderator',
  'support',
  'team',
  'official',
  'staff',
  'system',
  'root',
];

const COMMUNITY_ROLES = ['athlete', 'coach', 'climbing_enthusiast', 'gym_or_organization'];
const DISCIPLINES = ['speed', 'lead', 'bouldering'];
const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'professional'];

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  // Public community identity — lowercased + unique. Sparse so admin users
  // (which don't have a community username) coexist without conflicts.
  username: { type: String, unique: true, sparse: true, lowercase: true },
  // Display name — keeps the user's chosen casing; defaults to the username.
  name: { type: String, default: '' },
  profileImageUrl: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 300 },
  // ── New registration fields (all optional/backward-compatible) ──
  // '' is the "unset" sentinel used across the app (serializers render it as
  // empty), so the enums must accept it — users created without these fields
  // (e.g. the legacy admin bootstrap) would otherwise fail validation.
  communityRole: { type: String, enum: [...COMMUNITY_ROLES, ''], default: '' },
  disciplines: { type: [String], enum: DISCIPLINES, default: [] },
  experienceLevel: { type: String, enum: [...EXPERIENCE_LEVELS, ''], default: '' },
  city: { type: String, default: '', maxlength: 100 },
  instagramUrl: { type: String, default: '', maxlength: 300 },
  agreedToCommunityTerms: { type: Boolean, default: false },
  communityTermsAgreedAt: { type: Date, default: null },
  role: { type: String, enum: ['member', 'admin'], default: 'member' },
  // Reputation — placeholder until the points/reputation rules are defined in
  // a later step. Always starts at 0.
  communityPoints: { type: Number, default: 0, min: 0 },
  // Verification. No user can set this themselves — managed by the admin team
  // via the admin tool. 'none' until then. 'official' is reserved for the
  // Climb Pakistan official account (white circle + black tick badge).
  verification: { type: String, enum: ['none', 'national', 'international', 'organization', 'official'], default: 'none' },
  // Verification audit — which admin set the current verification and when.
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt: { type: Date, default: null },
  // Optional link to an existing Climb Pakistan athlete profile. Managed by
  // admins only; users cannot connect/disconnect themselves.
  athleteProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', default: null, sparse: true },
  // ── Password reset ──
  resetCode: { type: String, default: null },
  resetCodeExpires: { type: Date, default: null },
  // ── Account status / moderation ──
  // active = fully functional; suspended = cannot participate but can log in
  // and see an explanation; banned = cannot access/participate in the community.
  accountStatus: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
  restrictionReason: { type: String, default: '', maxlength: 1000 },
  restrictedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  restrictedAt: { type: Date, default: null },
  // Denormalized follow counters — keep in sync with the Follow collection.
  followerCount: { type: Number, default: 0, min: 0 },
  followingCount: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function () {
  // Usernames are always stored lowercase — enforce it on every save path
  // (registration, future admin tooling, imports) so the community never
  // displays mixed-case handles.
  if (this.username && typeof this.username === 'string') {
    this.username = this.username.toLowerCase();
  }
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Never expose the password hash through JSON serialization.
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    return ret;
  },
});

export { COMMUNITY_ROLES, DISCIPLINES, EXPERIENCE_LEVELS };
export default mongoose.model('User', userSchema);
