import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import Report, { REPORT_STATUSES } from '../models/Report.js';
import Post, { POST_CATEGORIES, POST_TYPES } from '../models/Post.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import ModerationLog from '../models/ModerationLog.js';
import Vote from '../models/Vote.js';
import PollVote from '../models/PollVote.js';
import { refreshPostScore } from './posts.js';

const router = Router();

function isValidObjectId(value) {
  return typeof value === 'string' && Types.ObjectId.isValid(value);
}

// Admin-only middleware that verifies the JWT AND confirms the role in the
// database (so a stale/forged token can't grant moderation powers).
async function requireAdminDb(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
  const user = await User.findById(decoded.id);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'You do not have permission to access this page.' });
  }
  if (user.accountStatus !== 'active') {
    return res.status(403).json({ error: 'Your admin account is not active.' });
  }
  req.user = { id: user._id.toString(), role: user.role };
  next();
}

export { requireAdminDb, isValidObjectId };

// Helper to log every moderation action for the audit trail.
async function logAction(adminId, action, targetType, targetId, details = '') {
  try {
    await ModerationLog.create({ adminId, action, targetType, targetId, details });
  } catch (err) {
    console.warn('Could not write moderation log:', err.message);
  }
}

// ── Reports listing (admin only) ──
// GET /api/moderation/reports?status=pending|reviewed|dismissed|actioned&page=&limit=
router.get('/reports', requireAdminDb, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const status = String(req.query.status || '');
    const filter = {};
    if (REPORT_STATUSES.includes(status)) filter.status = status;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('reporterId', 'username name profileImageUrl')
        .populate('handledBy', 'username'),
      Report.countDocuments(filter),
    ]);

    // Resolve the reported content for each report.
    const postIds = reports.filter((r) => r.postId).map((r) => r.postId);
    const commentIds = reports.filter((r) => r.commentId).map((r) => r.commentId);
    const [posts, comments] = await Promise.all([
      postIds.length
        ? Post.find({ _id: { $in: postIds } })
            .populate('authorId', 'username name profileImageUrl verification accountStatus')
        : Promise.resolve([]),
      commentIds.length
        ? Comment.find({ _id: { $in: commentIds } })
            .populate('authorId', 'username name profileImageUrl verification accountStatus')
        : Promise.resolve([]),
    ]);
    const postById = new Map(posts.map((p) => [String(p._id), p]));
    const commentById = new Map(comments.map((c) => [String(c._id), c]));

    const data = reports.map((r) => {
      const post = r.postId ? postById.get(String(r.postId)) : null;
      const comment = r.commentId ? commentById.get(String(r.commentId)) : null;
      const target = post || comment;
      return {
        id: r._id,
        reporter: r.reporterId
          ? { username: r.reporterId.username, name: r.reporterId.name, profileImageUrl: r.reporterId.profileImageUrl }
          : null,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt,
        handledBy: r.handledBy ? r.handledBy.username : null,
        handledAt: r.handledAt,
        actionTaken: r.actionTaken,
        targetType: post ? 'post' : 'comment',
        target: post
          ? {
              id: post._id,
              type: 'post',
              title: post.title,
              body: post.body,
              removed: !!post.removed,
              author: post.authorId
                ? { id: post.authorId._id, username: post.authorId.username, name: post.authorId.name, profileImageUrl: post.authorId.profileImageUrl, verification: post.authorId.verification, accountStatus: post.authorId.accountStatus || 'active' }
                : null,
            }
          : comment
            ? {
                id: comment._id,
                type: 'comment',
                body: comment.body,
                removed: !!comment.removed,
                postId: comment.postId,
                author: comment.authorId
                  ? { id: comment.authorId._id, username: comment.authorId.username, name: comment.authorId.name, profileImageUrl: comment.authorId.profileImageUrl, verification: comment.authorId.verification, accountStatus: comment.authorId.accountStatus || 'active' }
                  : null,
              }
            : null,
      };
    });

    res.json({ reports: data, page, limit, total, hasMore: page * limit < total });
  } catch (err) {
    console.error('List reports error:', err);
    res.status(500).json({ error: 'Could not load reports.' });
  }
});

// ── Report status helpers ──
async function setReportStatus(reportId, status, adminId, actionTaken = '') {
  const report = await Report.findById(reportId);
  if (!report) return null;
  report.status = status;
  report.handledBy = adminId;
  report.handledAt = new Date();
  if (actionTaken) report.actionTaken = actionTaken;
  await report.save();
  return report;
}

// PUT /api/moderation/reports/:id/status — dismiss or mark reviewed.
router.put('/reports/:id/status', requireAdminDb, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid report id.' });
    }
    const { status, action } = req.body;
    if (!['dismissed', 'reviewed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid report status.' });
    }
    const report = await setReportStatus(req.params.id, status, req.user.id, String(action || ''));
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    await logAction(req.user.id, `report:${status}`, 'report', report._id);
    res.json({ message: 'Report updated.', report });
  } catch (err) {
    console.error('Report status error:', err);
    res.status(500).json({ error: 'Could not update the report.' });
  }
});

// ── Content removal / restore ──
async function resolveTarget(targetType, targetId) {
  if (targetType === 'post') {
    const post = await Post.findById(targetId);
    return post ? { doc: post, removed: !!post.removed } : null;
  }
  if (targetType === 'comment') {
    const comment = await Comment.findById(targetId);
    return comment ? { doc: comment, removed: !!comment.removed } : null;
  }
  return null;
}

// Remove a post or comment (soft delete — keep for admin review, hide from users).
router.post('/content/:targetType/:targetId/remove', requireAdminDb, async (req, res) => {
  try {
    const targetType = req.params.targetType;
    const targetId = req.params.targetId;
    if (!['post', 'comment'].includes(targetType) || !isValidObjectId(targetId)) {
      return res.status(400).json({ error: 'Invalid target.' });
    }
    const found = await resolveTarget(targetType, targetId);
    if (!found) return res.status(404).json({ error: 'Content not found.' });
    if (found.removed) return res.status(400).json({ error: 'Content is already removed.' });

    found.doc.removed = true;
    found.doc.removedAt = new Date();
    await found.doc.save();

    if (targetType === 'post') {
      // Remove the post's comments from view too.
      await Comment.updateMany({ postId: targetId, removed: { $ne: true } }, { $set: { removed: true, removedAt: new Date() } });
    }

    await logAction(req.user.id, 'content:remove', targetType, targetId);
    res.json({ message: `${targetType} removed.` });
  } catch (err) {
    console.error('Remove content error:', err);
    res.status(500).json({ error: 'Could not remove content.' });
  }
});

// Restore a post or comment.
router.post('/content/:targetType/:targetId/restore', requireAdminDb, async (req, res) => {
  try {
    const targetType = req.params.targetType;
    const targetId = req.params.targetId;
    if (!['post', 'comment'].includes(targetType) || !isValidObjectId(targetId)) {
      return res.status(400).json({ error: 'Invalid target.' });
    }
    const found = await resolveTarget(targetType, targetId);
    if (!found) return res.status(404).json({ error: 'Content not found.' });
    if (!found.removed) return res.status(400).json({ error: 'Content is not removed.' });

    found.doc.removed = false;
    found.doc.removedAt = null;
    await found.doc.save();

    if (targetType === 'post') {
      // Restore the post's comments that were removed as part of this action.
      // (Only restore those removed by moderation — we can't distinguish the
      // reason here, so restore all removed comments on the post.)
      await Comment.updateMany({ postId: targetId, removed: true }, { $set: { removed: false, removedAt: null } });
    }

    await logAction(req.user.id, 'content:restore', targetType, targetId);
    res.json({ message: `${targetType} restored.` });
  } catch (err) {
    console.error('Restore content error:', err);
    res.status(500).json({ error: 'Could not restore content.' });
  }
});

// ── User actions: warn / suspend / ban / lift ──
async function loadUserTarget(req, res) {  const targetId = req.params.userId;
  if (!isValidObjectId(targetId)) {
    res.status(400).json({ error: 'Invalid user id.' });
    return null;
  }
  if (String(targetId) === String(req.user.id)) {
    res.status(400).json({ error: 'You cannot moderate your own account.' });
    return null;
  }
  const user = await User.findById(targetId);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return null;
  }
  return user;
}

// GET /api/moderation/users/search?query= — search community users (admin only).
// Allows admins to find a user to moderate (verification / restrict / athlete link).
router.get('/users/search', requireAdminDb, async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    if (!query) return res.json({ users: [] });
    const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await User.find({ $or: [{ username: re }, { name: re }] })
      .select('username name email profileImageUrl verification accountStatus athleteProfileId followerCount followingCount')
      .limit(25)
      .sort({ createdAt: -1 });
    const athleteIds = users.filter((u) => u.athleteProfileId).map((u) => u.athleteProfileId);
    const { default: AthleteModel } = await import('../models/Athlete.js');
    const athletes = athleteIds.length
      ? await AthleteModel.find({ _id: { $in: athleteIds } }).select('slug name')
      : [];
    const athleteById = new Map(athletes.map((a) => [String(a._id), a]));
    res.json({
      users: users.map((u) => ({
        id: u._id,
        username: u.username,
        name: u.name,
        email: u.email,
        profileImageUrl: u.profileImageUrl,
        verification: u.verification || 'none',
        accountStatus: u.accountStatus || 'active',
        followerCount: u.followerCount ?? 0,
        followingCount: u.followingCount ?? 0,
        athlete: u.athleteProfileId && athleteById.get(String(u.athleteProfileId))
          ? { id: u.athleteProfileId, slug: athleteById.get(String(u.athleteProfileId)).slug, name: athleteById.get(String(u.athleteProfileId)).name }
          : null,
      })),
    });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ error: 'Could not search users.' });
  }
});

// POST /api/moderation/users/:userId/warn — record a warning.
router.post('/users/:userId/warn', requireAdminDb, async (req, res) => {  try {
    const user = await loadUserTarget(req, res);
    if (!user) return;
    const reason = String(req.body.reason || '').trim().slice(0, 1000);
    await logAction(req.user.id, 'user:warn', 'user', user._id, reason);
    res.json({ message: 'Warning recorded for this user.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not warn the user.' });
  }
});

// POST /api/moderation/users/:userId/suspend
router.post('/users/:userId/suspend', requireAdminDb, async (req, res) => {
  try {
    const user = await loadUserTarget(req, res);
    if (!user) return;
    const reason = String(req.body.reason || '').trim().slice(0, 1000);
    user.accountStatus = 'suspended';
    user.restrictionReason = reason;
    user.restrictedBy = req.user.id;
    user.restrictedAt = new Date();
    await user.save();
    await logAction(req.user.id, 'user:suspend', 'user', user._id, reason);
    res.json({ message: 'User suspended.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not suspend the user.' });
  }
});

// POST /api/moderation/users/:userId/ban
router.post('/users/:userId/ban', requireAdminDb, async (req, res) => {
  try {
    const user = await loadUserTarget(req, res);
    if (!user) return;
    const reason = String(req.body.reason || '').trim().slice(0, 1000);
    user.accountStatus = 'banned';
    user.restrictionReason = reason;
    user.restrictedBy = req.user.id;
    user.restrictedAt = new Date();
    await user.save();
    await logAction(req.user.id, 'user:ban', 'user', user._id, reason);
    res.json({ message: 'User banned.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not ban the user.' });
  }
});

// POST /api/moderation/users/:userId/lift — remove a suspension/ban (back to active).
router.post('/users/:userId/lift', requireAdminDb, async (req, res) => {
  try {
    const user = await loadUserTarget(req, res);
    if (!user) return;
    user.accountStatus = 'active';
    user.restrictionReason = '';
    await user.save();
    await logAction(req.user.id, 'user:lift', 'user', user._id, String(req.body.reason || ''));
    res.json({ message: 'Restriction lifted.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not lift the restriction.' });
  }
});

// ── Verification (admin-controlled, with audit) ──
// POST /api/moderation/verification/:userId  body: { verification, reason? }
router.post('/verification/:userId', requireAdminDb, async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }
    const verification = String(req.body.verification || 'none');
    if (!['none', 'national', 'international'].includes(verification)) {
      return res.status(400).json({ error: 'Invalid verification level.' });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.verification = verification;
    user.verifiedBy = verification === 'none' ? null : req.user.id;
    user.verifiedAt = verification === 'none' ? null : new Date();
    await user.save();

    await logAction(req.user.id, 'verification:change', 'user', user._id, verification);
    res.json({ message: 'Verification updated.', user: { id: user._id, username: user.username, verification: user.verification } });
  } catch (err) {
    res.status(500).json({ error: 'Could not update verification.' });
  }
});

// ── Athlete linking (admin-controlled) ──
// POST /api/moderation/users/:userId/athlete  body: { athleteProfileId }
router.post('/users/:userId/athlete', requireAdminDb, async (req, res) => {
  try {
    const userId = req.params.userId;
    const athleteProfileId = req.body.athleteProfileId;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }
    if (athleteProfileId != null && !isValidObjectId(athleteProfileId)) {
      return res.status(400).json({ error: 'Invalid athlete id.' });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Ensure the athlete profile exists.
    if (athleteProfileId) {
      const { default: Athlete } = await import('../models/Athlete.js');
      const athlete = await Athlete.findById(athleteProfileId);
      if (!athlete) return res.status(404).json({ error: 'Athlete profile not found.' });
    }

    user.athleteProfileId = athleteProfileId || null;
    await user.save();
    await logAction(req.user.id, athleteProfileId ? 'athlete:connect' : 'athlete:disconnect', 'user', user._id, String(athleteProfileId || ''));
    res.json({ message: athleteProfileId ? 'Athlete profile connected.' : 'Athlete profile disconnected.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not update athlete link.' });
  }
});

// ── Community overview (admin only) ──
// GET /api/moderation/community/summary — total users, posts, comments, pending reports.
router.get('/community/summary', requireAdminDb, async (req, res) => {
  try {
    const [totalUsers, totalPosts, totalComments, pendingReports] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Comment.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
    ]);
    res.json({ totalUsers, totalPosts, totalComments, pendingReports });
  } catch (err) {
    console.error('Community summary error:', err);
    res.status(500).json({ error: 'Could not load community summary.' });
  }
});

// ── Community posts list (admin only, paginated + filters) ──
// GET /api/moderation/posts?search=&category=&type=&status=&page=&limit=
// status = all | live | removed
router.get('/posts', requireAdminDb, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();
    const type = String(req.query.type || '').trim();
    const status = String(req.query.status || '').trim();

    const filter = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: re }, { body: re }];
    }
    if (POST_CATEGORIES.includes(category)) filter.category = category;
    if (POST_TYPES.includes(type)) filter.type = type;
    if (status === 'removed') filter.removed = true;
    else if (status === 'live') filter.removed = false;

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('authorId', 'username name profileImageUrl verification verifiedAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    res.json({
      posts: posts.map((p) => ({
        id: p._id,
        title: p.title,
        body: p.body,
        type: p.type,
        category: p.category,
        createdAt: p.createdAt,
        upvoteCount: p.upvoteCount ?? 0,
        downvoteCount: p.downvoteCount ?? 0,
        commentCount: p.commentCount ?? 0,
        removed: !!p.removed,
        removedAt: p.removedAt || null,
        author: p.authorId
          ? { username: p.authorId.username, name: p.authorId.name, profileImageUrl: p.authorId.profileImageUrl, verification: p.authorId.verification }
          : null,
      })),
      page, limit, total, hasMore: page * limit < total,
    });
  } catch (err) {
    console.error('Community posts error:', err);
    res.status(500).json({ error: 'Could not load posts.' });
  }
});

// ── Community comments list (admin only, paginated) ──
// GET /api/moderation/comments?search=&page=&limit=
router.get('/comments', requireAdminDb, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search || '').trim();

    const filter = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.body = re;
    }

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .populate('authorId', 'username name profileImageUrl verification')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Comment.countDocuments(filter),
    ]);

    // Resolve each comment's parent post title on the current page.
    const postIds = comments.map((c) => c.postId).filter(Boolean);
    const posts = postIds.length
      ? await Post.find({ _id: { $in: postIds } }).select('title removed').lean()
      : [];
    const postById = new Map(posts.map((p) => [String(p._id), p]));

    res.json({
      comments: comments.map((c) => ({
        id: c._id,
        body: c.body,
        createdAt: c.createdAt,
        removed: !!c.removed,
        removedAt: c.removedAt || null,
        upvoteCount: c.upvoteCount ?? 0,
        downvoteCount: c.downvoteCount ?? 0,
        post: c.postId && postById.get(String(c.postId))
          ? { id: c.postId, title: postById.get(String(c.postId)).title, removed: !!postById.get(String(c.postId)).removed }
          : null,
        author: c.authorId
          ? { username: c.authorId.username, name: c.authorId.name, profileImageUrl: c.authorId.profileImageUrl, verification: c.authorId.verification }
          : null,
      })),
      page, limit, total, hasMore: page * limit < total,
    });
  } catch (err) {
    console.error('Community comments error:', err);
    res.status(500).json({ error: 'Could not load comments.' });
  }
});

// ── Permanent post delete (admin only) ──
// POST /api/moderation/posts/:id/delete — removes the post, its comments,
// votes, poll votes, and clears report references. Irreversible.
router.post('/posts/:id/delete', requireAdminDb, async (req, res) => {
  try {
    const postId = req.params.id;
    if (!isValidObjectId(postId)) return res.status(400).json({ error: 'Invalid post id.' });
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const commentIds = await Comment.find({ postId }).distinct('_id');

    await Promise.all([
      Comment.deleteMany({ postId }),
      Post.deleteOne({ _id: postId }),
      Vote.deleteMany({ postId }),
      Vote.deleteMany({ commentId: { $in: commentIds } }),
      PollVote.deleteMany({ postId }),
      Report.updateMany(
        { $or: [{ postId }, { commentId: { $in: commentIds } }] },
        { $set: { postId: null, commentId: null } },
      ),
    ]);

    await logAction(req.user.id, 'post:delete-permanent', 'post', postId);
    res.json({ message: 'Post permanently deleted.' });
  } catch (err) {
    console.error('Permanent post delete error:', err);
    res.status(500).json({ error: 'Could not delete the post.' });
  }
});

// ── Badge Applications (admin only) ──
import BadgeApplication, { BADGE_TYPES, APPLICATION_STATUSES } from '../models/BadgeApplication.js';

// GET /api/moderation/badge-applications?status=&badgeType=&page=&limit=
router.get('/badge-applications', requireAdminDb, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const status = String(req.query.status || '').trim();
    const badgeType = String(req.query.badgeType || '').trim();

    const filter = {};
    if (APPLICATION_STATUSES.includes(status)) filter.status = status;
    if (BADGE_TYPES.includes(badgeType)) filter.badgeType = badgeType;

    const [applications, total] = await Promise.all([
      BadgeApplication.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'username name email profileImageUrl verification communityRole disciplines experienceLevel')
        .populate('handledBy', 'username'),
      BadgeApplication.countDocuments(filter),
    ]);

    res.json({
      applications: applications.map((a) => ({
        id: a._id,
        badgeType: a.badgeType,
        status: a.status,
        message: a.message,
        adminNotes: a.adminNotes,
        createdAt: a.createdAt,
        handledBy: a.handledBy ? a.handledBy.username : null,
        handledAt: a.handledAt,
        user: a.userId
          ? {
              id: a.userId._id,
              username: a.userId.username,
              name: a.userId.name,
              email: a.userId.email,
              profileImageUrl: a.userId.profileImageUrl,
              verification: a.userId.verification || 'none',
              communityRole: a.userId.communityRole || '',
              disciplines: a.userId.disciplines || [],
              experienceLevel: a.userId.experienceLevel || '',
            }
          : null,
      })),
      page, limit, total, hasMore: page * limit < total,
    });
  } catch (err) {
    console.error('List badge applications error:', err);
    res.status(500).json({ error: 'Could not load badge applications.' });
  }
});

// PUT /api/moderation/badge-applications/:id — approve or reject.
router.put('/badge-applications/:id', requireAdminDb, async (req, res) => {
  try {
    const appId = req.params.id;
    if (!isValidObjectId(appId)) {
      return res.status(400).json({ error: 'Invalid application id.' });
    }

    const { status, adminNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected.' });
    }

    const application = await BadgeApplication.findById(appId);
    if (!application) return res.status(404).json({ error: 'Application not found.' });
    if (application.status !== 'pending') {
      return res.status(400).json({ error: 'This application has already been processed.' });
    }

    application.status = status;
    application.adminNotes = String(adminNotes || '').trim().slice(0, 1000);
    application.handledBy = req.user.id;
    application.handledAt = new Date();
    await application.save();

    // If approved, update the user's verification
    if (status === 'approved') {
      const user = await User.findById(application.userId);
      if (user) {
        user.verification = application.badgeType;
        user.verifiedBy = req.user.id;
        user.verifiedAt = new Date();
        await user.save();
      }
    }

    await logAction(req.user.id, `badge:${status}`, 'badge-application', application._id, application.badgeType);
    res.json({ message: `Application ${status}.`, application: { id: application._id, status: application.status } });
  } catch (err) {
    console.error('Badge application action error:', err);
    res.status(500).json({ error: 'Could not process the application.' });
  }
});

// ── Community users list with new fields (admin only, paginated) ──
// Override the existing users list to include new fields
router.get('/users', requireAdminDb, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search || '').trim();

    const filter = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ username: re }, { name: re }, { email: re }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('username name email profileImageUrl verification verifiedAt accountStatus communityRole disciplines experienceLevel city athleteProfileId followerCount followingCount createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const athleteIds = users.filter((u) => u.athleteProfileId).map((u) => u.athleteProfileId);

    const { default: AthleteModel } = await import('../models/Athlete.js');
    const [athletes, postCounts, commentCounts] = await Promise.all([
      athleteIds.length ? AthleteModel.find({ _id: { $in: athleteIds } }).select('slug name') : [],
      userIds.length
        ? Post.aggregate([{ $match: { authorId: { $in: userIds } } }, { $group: { _id: '$authorId', count: { $sum: 1 } } }])
        : [],
      userIds.length
        ? Comment.aggregate([{ $match: { authorId: { $in: userIds } } }, { $group: { _id: '$authorId', count: { $sum: 1 } } }])
        : [],
    ]);

    const athleteById = new Map(athletes.map((a) => [String(a._id), a]));
    const postCountById = new Map(postCounts.map((c) => [String(c._id), c.count]));
    const commentCountById = new Map(commentCounts.map((c) => [String(c._id), c.count]));

    res.json({
      users: users.map((u) => ({
        id: u._id,
        username: u.username,
        name: u.name,
        email: u.email,
        profileImageUrl: u.profileImageUrl,
        verification: u.verification || 'none',
        verifiedAt: u.verifiedAt || null,
        accountStatus: u.accountStatus || 'active',
        communityRole: u.communityRole || '',
        disciplines: u.disciplines || [],
        experienceLevel: u.experienceLevel || '',
        city: u.city || '',
        followerCount: u.followerCount ?? 0,
        followingCount: u.followingCount ?? 0,
        createdAt: u.createdAt,
        postsCount: postCountById.get(String(u._id)) || 0,
        commentsCount: commentCountById.get(String(u._id)) || 0,
        athlete: u.athleteProfileId && athleteById.get(String(u.athleteProfileId))
          ? { id: u.athleteProfileId, slug: athleteById.get(String(u.athleteProfileId)).slug, name: athleteById.get(String(u.athleteProfileId)).name }
          : null,
      })),
      page, limit, total, hasMore: page * limit < total,
    });
  } catch (err) {
    console.error('Community users error:', err);
    res.status(500).json({ error: 'Could not load users.' });
  }
});

export default router;
