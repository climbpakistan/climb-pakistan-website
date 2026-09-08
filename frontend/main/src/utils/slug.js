export { normalizeSlug };

// Slugs fetched from the API should always be a single URL path segment. Some
// content ended up stored with a path prefix (e.g. "/news/foo"); reduce any
// value to its last path segment so callers can safely build "/<section>/<slug>"
// URLs without producing double slashes or route mismatches.
function normalizeSlug(value) {
  const segments = String(value || '').split('/').filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : '';
}