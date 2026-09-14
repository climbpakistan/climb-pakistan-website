// ============================================================================
// Frontend twin of backend/src/utils/socialText.js.
//
// Keeps the parsing rules for @mentions and #hashtags identical on both sides
// so what the composer highlights is exactly what the backend stores. The
// backend is still the source of truth — this only drives rendering and the
// autocomplete dropdown.
// ============================================================================

export const MAX_HASHTAG_LENGTH = 50;

// @mention: at/after a boundary, a letter, then letters/digits/underscores.
export const MENTION_RE = /(?<![a-z0-9_])@([a-z][a-z0-9_]{2,19})/gi;

// #hashtag: at/after a boundary, letters/digits/underscores.
export const HASHTAG_RE = /(?<![A-Za-z0-9_/])#([A-Za-z0-9_]{2,50})/g;

// Combined token matcher used by <RichText> to split a body into bold text,
// mentions, hashtags and URLs. Bold is matched first so its ** delimiters are
// not eaten by the other rules.
export const TOKEN_RE = /(\*\*[^*]+\*\*|@[a-zA-Z][a-zA-Z0-9_]{2,19}|#[a-zA-Z0-9_]{1,50}|https?:\/\/[^\s<>"']+)/g;

/** Lowercase a raw hashtag into its canonical, URL-safe form. */
export function normalizeHashtag(raw) {
  return String(raw || '')
    .replace(/^#/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, MAX_HASHTAG_LENGTH);
}

/**
 * Detect the @mention / #hashtag the user is currently typing, based on the
 * text up to the caret. Returns `null` when the caret is not inside one.
 *
 * `{ symbol, query, start }` where `start` is the index of the @ or #.
 */
export function getActiveTagToken(value, caret = null) {
  const text = String(value || '');
  const pos = caret == null ? text.length : Math.max(0, Math.min(caret, text.length));
  const before = text.slice(0, pos);

  const match = /([@#])([A-Za-z0-9_]*)$/.exec(before);
  if (!match) return null;

  const start = pos - match[0].length;
  // The marker must start the text or follow whitespace / opening punctuation,
  // so we don't trigger inside an email address or a URL fragment.
  const charBefore = start > 0 ? before[start - 1] : '';
  if (charBefore && !/[\s([{"'“‘]/.test(charBefore)) return null;

  const symbol = match[1];
  const query = match[2];
  if (symbol === '@' && /^\d/.test(query)) return null; // usernames can't start with a digit

  return { symbol, query, start };
}
