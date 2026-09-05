import { Router } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { Resend } from 'resend';
import User, { RESERVED_USERNAMES, COMMUNITY_ROLES, DISCIPLINES, EXPERIENCE_LEVELS } from '../models/User.js';
import BadgeApplication, { BADGE_TYPES } from '../models/BadgeApplication.js';
import { requireUser } from '../middleware/auth.js';
import cloudinary from '../cloudinary.js';

// ── Resend (transactional email for the password reset flow) ──
// Requires RESEND_API_KEY. RESEND_FROM must be a verified sender — either a
// verified domain (e.g. "Climb Pakistan <noreply@climbpakistan.com>") or the
// default "onboarding@resend.dev" (which only delivers to the account owner's
// email until a domain is verified).
const resend = new Resend(process.env.RESEND_API_KEY);
const RESEND_FROM = process.env.RESEND_FROM || 'Climb Pakistan <onboarding@resend.dev>';

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
    communityRole: user.communityRole || '',
    disciplines: user.disciplines || [],
    experienceLevel: user.experienceLevel || '',
    city: user.city || '',
    instagramUrl: user.instagramUrl || '',
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
    communityRole: user.communityRole || '',
    disciplines: user.disciplines || [],
    experienceLevel: user.experienceLevel || '',
    city: user.city || '',
    instagramUrl: user.instagramUrl || '',
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

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 requests per window
  message: { error: 'Too many requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

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

    // Validate new registration fields
    const name = String(req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const communityRole = String(req.body.communityRole || '').trim();
    if (!COMMUNITY_ROLES.includes(communityRole)) {
      return res.status(400).json({ error: 'Please select your role in the community.' });
    }

    // Only individual climber roles pick disciplines + experience level — the
    // signup form hides those fields for coaches and teams/organizations, so
    // mirror that here (kept in sync with the frontend ROLES_WITH_DISCIPLINES).
    const ROLES_WITH_DISCIPLINES = ['athlete', 'climbing_enthusiast'];
    const needsDisciplines = ROLES_WITH_DISCIPLINES.includes(communityRole);

    let disciplines = [];
    if (req.body.disciplines) {
      try {
        disciplines = JSON.parse(req.body.disciplines);
      } catch {
        disciplines = [];
      }
    }
    if (!Array.isArray(disciplines) || !disciplines.every((d) => DISCIPLINES.includes(d))) {
      return res.status(400).json({ error: 'Invalid discipline selected.' });
    }
    if (needsDisciplines && disciplines.length === 0) {
      return res.status(400).json({ error: 'Please select at least one discipline.' });
    }

    const experienceLevel = String(req.body.experienceLevel || '').trim();
    if (needsDisciplines && !EXPERIENCE_LEVELS.includes(experienceLevel)) {
      return res.status(400).json({ error: 'Please select your experience level.' });
    }

    const agreedToTerms = req.body.agreedToCommunityTerms === 'true' || req.body.agreedToCommunityTerms === true;
    if (!agreedToTerms) {
      return res.status(400).json({ error: 'You must agree to the Community Guidelines and Terms.' });
    }

    const user = await User.create({
      email,
      password,
      username,
      name,
      profileImageUrl,
      communityRole,
      disciplines,
      experienceLevel,
      agreedToCommunityTerms: true,
      communityTermsAgreedAt: new Date(),
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
// Multipart/form-data with optional fields. Username / email / password are NOT editable here.
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

    if (req.body.city !== undefined) {
      const city = String(req.body.city || '').trim();
      if (city.length > 100) {
        return res.status(400).json({ error: 'City must be 100 characters or fewer.' });
      }
      user.city = city;
    }

    if (req.body.instagramUrl !== undefined) {
      let instagramUrl = String(req.body.instagramUrl || '').trim();
      if (instagramUrl && !/^https?:\/\/(www\.)?instagram\.com\//.test(instagramUrl)) {
        return res.status(400).json({ error: 'Please enter a valid Instagram profile URL.' });
      }
      if (instagramUrl && !instagramUrl.startsWith('http')) {
        instagramUrl = 'https://' + instagramUrl;
      }
      user.instagramUrl = instagramUrl;
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

// GET /api/auth/u/:username/similar — Instagram-style "similar accounts" for
// a profile. Scores other active members by shared city, community role,
// experience level, overlapping disciplines and verification status, then
// returns the closest matches (falling back to popular members). Public.
router.get('/u/:username/similar', async (req, res) => {
  try {
    const username = String(req.params.username || '').trim().toLowerCase().replace(/^@/, '');
    const profile = await User.findOne({ username })
      .select('city communityRole disciplines experienceLevel verification')
      .lean();

    if (!profile) return res.status(404).json({ error: 'User not found.' });

    const sameCity = { $cond: [{ $and: [{ $ne: [profile.city, ''] }, { $eq: ['$city', profile.city] }] }, 2, 0] };
    const sameRole = { $cond: [{ $and: [{ $ne: [profile.communityRole, ''] }, { $eq: ['$communityRole', profile.communityRole] }] }, 2, 0] };
    const sameLevel = { $cond: [{ $and: [{ $ne: [profile.experienceLevel, ''] }, { $eq: ['$experienceLevel', profile.experienceLevel] }] }, 1, 0] };
    const verified = { $cond: [{ $ne: ['$verification', 'none'] }, 1, 0] };
    const sharedDisciplines = { $size: { $setIntersection: ['$disciplines', profile.disciplines] } };

    const similar = await User.aggregate([
      {
        $match: {
          username: { $exists: true, $ne: null },
          accountStatus: 'active',
          _id: { $ne: profile._id },
        },
      },
      { $addFields: { score: { $add: [sameCity, sameRole, sameLevel, verified, sharedDisciplines] } } },
      { $sort: { score: -1, followerCount: -1, communityPoints: -1 } },
      { $limit: 6 },
      {
        $project: {
          username: 1,
          name: 1,
          profileImageUrl: 1,
          verification: 1,
          communityRole: 1,
          city: 1,
          followerCount: 1,
        },
      },
    ]);

    res.json({
      users: similar.map((u) => ({
        id: u._id,
        username: u.username,
        name: u.name || '',
        profileImageUrl: u.profileImageUrl || '',
        verification: u.verification || 'none',
        communityRole: u.communityRole || '',
        city: u.city || '',
        followerCount: u.followerCount ?? 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load similar accounts.' });
  }
});

// ── Badge Applications ──

// POST /api/auth/badge-applications — submit a badge application.
router.post('/badge-applications', requireUser, async (req, res) => {
  try {
    const { badgeType, message } = req.body;
    if (!BADGE_TYPES.includes(badgeType)) {
      return res.status(400).json({ error: 'Invalid badge type.' });
    }

    // Prevent duplicate active applications
    const existing = await BadgeApplication.findOne({
      userId: req.user.id,
      badgeType,
      status: 'pending',
    });
    if (existing) {
      return res.status(409).json({ error: 'You already have a pending application for this badge.' });
    }

    const application = await BadgeApplication.create({
      userId: req.user.id,
      badgeType,
      message: String(message || '').trim().slice(0, 1000),
    });

    res.status(201).json({ application: { id: application._id, badgeType: application.badgeType, status: application.status, createdAt: application.createdAt } });
  } catch (err) {
    console.error('Badge application error:', err);
    res.status(500).json({ error: 'Could not submit your application.' });
  }
});

// GET /api/auth/badge-applications/my — get current user's badge applications.
router.get('/badge-applications/my', requireUser, async (req, res) => {
  try {
    const applications = await BadgeApplication.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json({
      applications: applications.map((a) => ({
        id: a._id,
        badgeType: a.badgeType,
        status: a.status,
        message: a.message,
        createdAt: a.createdAt,
        handledAt: a.handledAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load your applications.' });
  }
});

// GET /api/auth/search?query= — public user search.
router.get('/search', async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    if (!query || query.length < 2) return res.json({ users: [] });

    const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await User.find({
      username: { $exists: true, $ne: null },
      accountStatus: 'active',
      $or: [{ username: re }, { name: re }],
    })
      .select('username name profileImageUrl verification communityRole')
      .limit(20)
      .sort({ communityPoints: -1 });

    res.json({
      users: users.map((u) => ({
        id: u._id,
        username: u.username,
        name: u.name,
        profileImageUrl: u.profileImageUrl || '',
        verification: u.verification || 'none',
        communityRole: u.communityRole || '',
      })),
    });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ error: 'Could not search users.' });
  }
});

// ── Forgot Password Flow ──

// POST /api/auth/forgot-password — send a 6-digit reset code to the user's email.
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const user = await User.findOne({ email });
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a reset code has been sent.' });
    }

    const code = generateResetCode();
    user.resetCode = code;
    user.resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    // Resend's SDK returns { data, error } instead of throwing on API errors.
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      subject: 'Climb Pakistan — Password Reset Code',
      text: `Your password reset code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, please ignore this email.`,
      html: `<p>Your password reset code is:</p><h2 style="letter-spacing:4px;font-size:28px;">${code}</h2><p>This code expires in 15 minutes.</p><p>If you did not request this, please ignore this email.</p>`,
    });
    if (error) {
      console.error('Resend error:', error);
      throw new Error(error.message || 'Email sending failed.');
    }

    res.json({ message: 'If an account with that email exists, a reset code has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Could not process your request. Please try again.' });
  }
});

// POST /api/auth/verify-reset-code — verify the 6-digit code.
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanCode = String(code || '').trim();

    if (!EMAIL_REGEX.test(cleanEmail) || !cleanCode) {
      return res.status(400).json({ error: 'Please provide a valid email and code.' });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user || !user.resetCode || !user.resetCodeExpires) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    if (user.resetCodeExpires < new Date()) {
      user.resetCode = null;
      user.resetCodeExpires = null;
      await user.save();
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    if (user.resetCode !== cleanCode) {
      return res.status(400).json({ error: 'Incorrect reset code. Please try again.' });
    }

    res.json({ message: 'Code verified successfully. You can now set a new password.' });
  } catch (err) {
    console.error('Verify reset code error:', err);
    res.status(500).json({ error: 'Could not verify code. Please try again.' });
  }
});

// POST /api/auth/reset-password — set a new password after code verification.
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanCode = String(code || '').trim();
    const cleanPassword = String(newPassword || '');

    if (!EMAIL_REGEX.test(cleanEmail) || !cleanCode || !cleanPassword) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    const passwordError = validatePassword(cleanPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const user = await User.findOne({ email: cleanEmail });
    if (!user || !user.resetCode || !user.resetCodeExpires) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    if (user.resetCodeExpires < new Date()) {
      user.resetCode = null;
      user.resetCodeExpires = null;
      await user.save();
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    if (user.resetCode !== cleanCode) {
      return res.status(400).json({ error: 'Incorrect reset code.' });
    }

    user.password = cleanPassword;
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Could not reset password. Please try again.' });
  }
});

export default router;
