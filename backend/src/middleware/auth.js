import jwt from 'jsonwebtoken';

/**
 * Authentication middleware for admin-only operations.
 *
 * - GET requests pass through without authentication (public data).
 * - POST / PUT / DELETE requests require a valid JWT Bearer token.
 * - The token is verified against JWT_SECRET from the environment.
 * - On failure, returns 401 with an error message.
 */
export default function requireAdmin(req, res, next) {
  // Allow public read access — no auth needed for GET
  if (req.method === 'GET') return next();

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
    req.user = decoded; // Attach user info for downstream use (e.g., audit logs)
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
}
