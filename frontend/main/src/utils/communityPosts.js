// ============================================================================
// Community post helpers — shared formatting + client-side validation used by
// the feed, post page, and composer. Mirrors the backend rules in
// backend/src/routes/posts.js.
// ============================================================================

export const MAX_POST_TITLE_LENGTH = 300;
export const MAX_POST_BODY_LENGTH = 5000;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** Relative time like "3h ago", or a date for older posts. */
export function formatPostDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Full date/time for the post page. */
export function formatPostDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** Trimmed plain-text preview of a post body. */
export function postExcerpt(body, max = 180) {
  const text = String(body || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

/**
 * postBodyExcerpt — like postExcerpt, but also reports whether the body was
 * truncated so the UI can offer a "See more" toggle for the full text.
 */
export function postBodyExcerpt(body, max = 180) {
  const text = String(body || '').replace(/\s+/g, ' ').trim();
  const truncated = text.length > max;
  return {
    text: truncated ? `${text.slice(0, max).trimEnd()}…` : text,
    truncated,
  };
}

/** Client-side image validation — mirrors the backend file filter. */
export function validateImageFile(file) {
  if (!file) return { ok: true };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: 'Post images must be JPG, PNG, or WebP.' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Post images must be smaller than 5 MB.' };
  }
  return { ok: true };
}

/** Only http(s) links — blocks javascript:, data:, etc. */
export function validateExternalUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return { ok: true, url: '' };
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: 'Please enter a valid URL.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Links must start with http:// or https://.' };
  }
  return { ok: true, url: parsed.href };
}
