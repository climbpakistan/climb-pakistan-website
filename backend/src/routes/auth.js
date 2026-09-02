import { Router } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import User, { RESERVED_USERNAMES } from '../models/User.js';
import { requireUser } from '../middleware/auth.js';
import cloudinary from '../cloudinary.js';

const router = Router();

// ── Validation helpers ──
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Lowercase: starts with a letter, then letters / digits / underscores, 3–20 chars.
const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;

function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase().replace(/^@/, '');
}

function validateUsername(raw) {
  const username = normalizeUsername(raw);
  if (username.length < 3 || username.length > 20) {
    return { ok: false, error: 'Username must be between 3 and 20 characters.' };
  }
  if (!USERNAME_REGEX.test(username)) {
    return { ok: false, error: 'Usernames can only contain letters, numbers, and underscores, and must start with a letter.' };
  }
  if (RESERVED_USERNAMES.includes(username)) {
    return { ok: false, error: 'That username is reserved and cannot be used.' };
  }
  return { ok: true, username };
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}

function publicUser(user) {
  const linked = user.athleteProfileId && typeof user.athleteProfileId === 'object' && user.athleteProfileId.slug;
  return {
    id: user._id,
    email: user.email,
    username: user.username,
    name: user.name,
    profileImageUrl: user.profileImageUrl,
    bio: user.bio,
    role: user.role,
    communityPoints: user.communityPoints ?? 0,
    verification: user.verification || 'none',
    verifiedBy: user.verifiedBy || null,
    verifiedAt: user.verifiedAt || null,
    athleteProfileId: user.athleteProfileId
      ? (user.athleteProfileId.slug ? user.athleteProfileId._id : user.athleteProfileId)
      : null,
    athlete: linked
      ? { id: user.athleteProfileId._id, slug: user.athleteProfileId.slug, name: user.athleteProfileId.name }
      : null,
    accountStatus: user.accountStatus || 'active',
    followerCount: user.followerCount ?? 0,
    followingCount: user.followingCount ?? 0,
    createdAt: user.createdAt,
  };
}

// Public serializer for other people's profiles — never exposes the email.
function athleteSummary(user) {
  const linked = user.athleteProfileId && typeof user.athleteProfileId === 'object' && user.athleteProfileId.slug;
  return linked
    ? { id: user.athleteProfileId._id, slug: user.athleteProfileId.slug, name: user.athleteProfileId.name }
    : null;
}

function publicProfile(user) {
  return {
    id: user._id,
    username: user.username,
    name: user.name,
    profileImageUrl: user.profileImageUrl ?? '',
    bio: user.bio ?? '',
    role: user.role,
    communityPoints: user.communityPoints ?? 0,
    verification: user.verification || 'none',
    accountStatus: user.accountStatus || 'active',
    athlete: athleteSummary(user),
    followerCount: user.followerCount ?? 0,
    followingCount: user.followingCount ?? 0,
    createdAt: user.createdAt,
  };
}

function signToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ── Profile image upload (Multer → Cloudinary) ──
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!file) return cb(null, true);
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Profile image must be an image file.'));
    }
    cb(null, true);
  },
});

// Wrap multer so file-upload errors become clean JSON (Multer errors would
// otherwise hit Express's default error handler).
function uploadAvatarField(req, res, next) {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Profile image must be smaller than 5 MB.' });
      }
      return res.status(400).json({ error: err.message || 'Invalid image upload.' });
    }
    next();
  });
}

async function uploadAvatar(buffer) {
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'climb-pakistan/community/avatars',
        resource_type: 'image',
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
      },
      (err, r) => (err ? reject(err) : resolve(r))
    );
    stream.end(buffer);
  });
  return result.secure_url;
}

// ── Rate limiters ──
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                   // 10 signups per hour per IP
  message: { error: 'Too many sign up attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                  // 20 login attempts per window
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/register — create a community member account.
// Multipart/form-data with fields username, email, password and an optional
// "avatar" file. On success the user is logged in (returns a signed JWT).
router.post('/register', registerLimiter, uploadAvatarField, async (req, res) => {
  try {
    const usernameResult = validateUsername(req.body.username);
    if (!usernameResult.ok) return res.status(400).json({ error: usernameResult.error });

    const username = usernameResult.username;
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    // Reject existing email OR existing username (case-insensitive via lowercase).
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      if (existing.email === email) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    // Upload the optional profile image before creating the account.
    let profileImageUrl = '';
    if (req.file) {
      profileImageUrl = await uploadAvatar(req.file.buffer);
    }

    const user = await User.create({
      email,
      password,
      username,
      name: String(req.body.username || '').trim(), // preserve the user's chosen casing
      profileImageUrl,
      role: 'member',
    });

    const token = signToken(user);
    res.status(201).json({ user: publicUser(user), token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login — accepts an email OR username plus password.
// Keeps the legacy admin-email bootstrap so the admin dashboard keeps working.
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, identifier, password } = req.body;
    const loginField = String(identifier || email || '').trim().toLowerCase();
    if (!loginField || !password) {
      return res.status(400).json({ error: 'Please provide your username/email and password.' });
    }

    let user = await User.findOne({ $or: [{ email: loginField }, { username: loginField }] });

    if (!user) {
      // Legacy admin bootstrap — create the admin user from env credentials.
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (
        adminEmail && adminPassword &&
        loginField === adminEmail.toLowerCase() && password === adminPassword
      ) {
        user = await User.create({
          email: adminEmail,
          password,
          name: 'Admin',
          role: 'admin',
        });
      } else {
        return res.status(401).json({ error: 'Incorrect username/email or password.' });
      }
    } else {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect username/email or password.' });
      }

      // Self-healing admin promotion: if an EXISTING account authenticates with
      // the exact legacy ADMIN_EMAIL + ADMIN_PASSWORD credentials (both must be
      // configured AND both must match), keep that account promoted to admin so
      // the Admin dashboard's DB-confirmed moderation routes keep working even
      // if the account predates the role being set. Idempotent — only persists
      // when a field actually changes. Strictly gated on the credential pair so
      // an email match alone can never escalate a regular account.
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (
        adminEmail && adminPassword &&
        loginField === adminEmail.toLowerCase() && password === adminPassword
      ) {
        let changed = false;
        if (user.role !== 'admin') {
          user.role = 'admin';
          changed = true;
        }
        // A previously-suspended admin can still log in but is blocked from
        // moderation, so restore an active status (banned accounts already
        // returned a 403 above and are never resurrected here).
        if (user.accountStatus === 'suspended') {
          user.accountStatus = 'active';
          user.restrictionReason = undefined;
          changed = true;
        }
        if (changed) await user.save();
      }
    }

    // Banned users cannot log in to the community.
    if (user.accountStatus === 'banned') {
      return res.status(403).json({
        error: 'Your account has been banned and you can no longer participate in the community.',
      });
    }

    const token = signToken(user);
    res.json({
      user: publicUser(user),
      token,
      // Suspended users can still log in but are told their status.
      restriction: user.accountStatus === 'suspended'
        ? { status: 'suspended', reason: user.restrictionReason || '' }
        : null,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me — returns the currently authenticated user.
router.get('/me', requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('athleteProfileId', 'slug name');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const restriction = user.accountStatus && user.accountStatus !== 'active'
      ? { status: user.accountStatus, reason: user.restrictionReason || '' }
      : null;
    res.json({ user: publicUser(user), restriction });
  } catch (err) {
    res.status(500).json({ error: 'Could not load your account.' });
  }
});

// PUT /api/auth/me — update the owner's own profile.
// Multipart/form-data with an optional "bio" text field and an optional
// "avatar" image file. Username / email / password are NOT editable here.
router.put('/me', requireUser, uploadAvatarField, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (req.body.bio !== undefined) {
      const bio = String(req.body.bio || '').trim();
      if (bio.length > 300) {
        return res.status(400).json({ error: 'Bio must be 300 characters or fewer.' });
      }
      user.bio = bio;
    }

    if (req.file) {
      user.profileImageUrl = await uploadAvatar(req.file.buffer);
    }

    await user.save();
    const fresh = await User.findById(user._id).populate('athleteProfileId', 'slug name');
    res.json({ user: publicUser(fresh) });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Could not update your profile.' });
  }
});

// GET /api/auth/usernames — public list of community usernames, used to
// pre-render the public profile pages at build time.
router.get('/usernames', async (req, res) => {
  try {
    const users = await User.find({ username: { $exists: true, $ne: null } }).select('username -_id');
    res.json({ usernames: users.map((u) => u.username).filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: 'Could not load usernames.' });
  }
});

// GET /api/auth/u/:username — publicly viewable community profile.
router.get('/u/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').trim().toLowerCase().replace(/^@/, '');
    const profile = await User.findOne({ username })
      .select('-email -password')
      .populate('athleteProfileId', 'slug name');

    if (!profile) return res.status(404).json({ error: 'User not found.' });

    // Re-attach the populated athlete under the field name used by the frontend.
    const data = publicProfile(profile);
    res.json({ profile: data });
  } catch (err) {
    res.status(500).json({ error: 'Could not load this profile.' });
  }
});

export default router;
