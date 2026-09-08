/**
 * Parses the `?limit` query param with a sane default and a hard cap, so
 * public/admin list endpoints can never return an unbounded result set.
 */
export function parseLimit(req, { default: def = 200, max = 1000 } = {}) {
  const raw = Number(req.query.limit);
  if (!Number.isFinite(raw) || raw <= 0) return def;
  return Math.min(Math.floor(raw), max);
}