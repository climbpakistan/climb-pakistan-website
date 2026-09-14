// ============================================================================
// Reusable plain-text parser for community content.
//
// Detects @mentions and #hashtags in post titles/bodies and comments. This is
// the single source of truth used by both posts and comments on the backend —
// the client never decides what counts as a mention or a hashtag.
//
// Everything here is pure (no DB access) so it can be unit-reasoned about and
// reused by the backfill migration.
// ============================================================================

// Usernames are lowercase, 3–20 chars, starting with a letter then letters /
// digits / underscores (mirrors USERNAME_REGEX in routes/auth.js). The negative
// lookbehind stops us from matching email addresses (foo@bar.com) where @ is
// preceded by a letter or digit.
export const MENTION_RE = /(?<![a-z0-9_])@([a-z][a-z0-9_]{2,19})/gi;

// A hashtag starts with #, is preceded by whitespace/start (never a word
// character or a URL slash), and contains letters, numbers and underscores.
export const HASHTAG_RE = /(?<![A-Za-z0-9_/])#([A-Za-z0-9_]{2,50})/g;

export const MAX_HASHTAG_LENGTH = 50;

/** Lowercase a raw hashtag into its canonical form (letters/digits/underscore only). */
export function normalizeHashtag(raw) {
  return String(raw || '')
    .replace(/^#/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, MAX_HASHTAG_LENGTH);
}

/**
 * Pull unique @username mentions out of a plain-text string, lowercased.
 * Usernames that appear multiple times (including different capitalization)
 * collapse to one entry.
 */
export function extractMentions(text) {
  if (!text) return [];
  const seen = new Set();
  const mentions = [];
  MENTION_RE.lastIndex = 0;
  let match;
  while ((match = MENTION_RE.exec(String(text))) !== null) {
    const username = match[1].toLowerCase();
    if (!seen.has(username)) {
      seen.add(username);
      mentions.push(username);
    }
  }
  return mentions;
}

/**
 * Pull unique hashtags out of a plain-text string.
 * Returns objects `{ name, display }`:
 *   - `name`    — normalized lowercase key (used for the DB + matching)
 *   - `display` — the capitalization the user typed (first occurrence wins)
 */
export function extractHashtags(text) {
  if (!text) return [];
  const seen = new Map(); // normalized name -> display form
  HASHTAG_RE.lastIndex = 0;
  let match;
  while ((match = HASHTAG_RE.exec(String(text))) !== null) {
    const display = match[1];
    const name = normalizeHashtag(display);
    if (!name || seen.has(name)) continue;
    seen.set(name, display);
  }
  return [...seen.entries()].map(([name, display]) => ({ name, display }));
}
