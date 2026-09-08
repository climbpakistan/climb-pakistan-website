import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Verifies a Bearer JWT and attaches the decoded payload to `req.user`.
 * Used for the community `/me` endpoint and any account-only endpoint that
 * must require a valid token regardless of the HTTP method.
 */
export function requireUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'mock-jwt-token-placeholder') {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
}

/**
 * Verifies a Bearer JWT if one is present and attaches the decoded payload
 * to `req.user`, but never blocks the request. Used on public endpoints that
 * personalize their response for logged-in users (e.g. vote highlighting).
 */
export function optionalUser(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token && token !== 'mock-jwt-token-placeholder') {
      try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        // Invalid/expired token on a public endpoint — treat as a guest.
      }
    }
  }
  next();
}

/**
 * Verifies the Bearer JWT AND confirms the caller is an active admin in the
 * database, so a stale/forged token can't grant admin powers. Attaches
 * `{ id, role }` to `req.user`. Used on admin-only operations where the
 * request must be locked down regardless of HTTP method.
 */
export async function requireAdminDb(req, res, next) {
  const admin = await verifyActiveAdmin(req);
  if (admin.error) {
    return res.status(admin.status).json({ error: admin.error });
  }
  req.user = admin.user;
  next();
}

/**
 * Authentication middleware for admin-only operations.
 *
 * - GET requests pass through without authentication (public data).
 * - POST / PUT / DELETE requests require a valid JWT Bearer token AND a DB
 *   lookup confirming the caller is still an active admin (so a demoted or
 *   banned admin can't keep writing until their JWT expires).
 * - On failure, returns 401/403 with an error message.
 */
export default async function requireAdmin(req, res, next) {
  // Allow public read access — no auth needed for GET
  if (req.method === 'GET') return next();

  const admin = await verifyActiveAdmin(req);
  if (admin.error) {
    return res.status(admin.status).json({ error: admin.error });
  }
  req.user = admin.user;
  next();
}

async function verifyActiveAdmin(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { status: 401, error: 'Authentication required. Please log in.' };
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'mock-jwt-token-placeholder') {
    return { status: 401, error: 'Invalid or expired token. Please log in again.' };
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { status: 401, error: 'Session expired. Please log in again.' };
    }
    return { status: 401, error: 'Invalid token. Please log in again.' };
  }

  const user = await User.findById(decoded.id);
  if (!user || user.role !== 'admin') {
    return { status: 403, error: 'You do not have permission to access this page.' };
  }
  if (user.accountStatus !== 'active') {
    return { status: 403, error: 'Your admin account is not active.' };
  }
  return { user: { id: user._id.toString(), role: user.role } };
}