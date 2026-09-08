// ============================================================================
// Community SEO helpers — indexability rules plus title / meta-description
// generation for individual community discussions.
//
// Used by both the server-rendered post page and the build-time sitemap
// generator, so this module must stay free of browser-only APIs.
// ============================================================================

import { truncate } from './jsonLd.js';

/**
 * Whether a community post should be indexable by search engines.
 *
 * A post is indexable only when it is:
 *   - public / published / visible (not moderator-removed)
 *   - not otherwise restricted (removed posts 404 via the API and never reach
 *     this check)
 *   - contains meaningful content — a real title plus some substance (body,
 *     image, poll options, external link, or a substantial standalone title)
 *
 * This deliberately avoids using an arbitrary character count as the ONLY
 * quality criterion: the existing post status/visibility system (the `removed`
 * moderation flag) is the primary gate, and the meaningful-content check below
 * is a secondary filter for stub / low-value posts.
 */
export function isPostIndexable(post) {
  if (!post || !post.id) return false;
  // Moderator-removed content must never be indexable.
  if (post.removed === true) return false;

  const title = String(post.title || '').trim();
  if (title.length < 10) return false;

  const body = String(post.body || '').trim();
  if (body) return true;
  if (post.type === 'image' && ((post.images && post.images.length > 0) || post.imageUrl)) return true;
  if (post.type === 'poll' && Array.isArray(post.poll?.options) && post.poll.options.length >= 2) return true;
  if (post.type === 'link' && post.externalUrl) return true;
  // A substantial title on its own still counts as meaningful content.
  return title.length >= 20;
}

/**
 * SEO <title> for a discussion post — cleaned to a single line and truncated
 * to a reasonable length so extremely long post titles never become unwieldy
 * page titles. The page title is appended by the shared <Seo> component.
 */
export function postSeoTitle(post, max = 65) {
  const title = String(post?.title || '').replace(/\s+/g, ' ').trim();
  if (!title) return '';
  if (title.length <= max) return title;
  const cut = title.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(' ');
  const trimmed = lastSpace > 20 ? cut.slice(0, lastSpace) : title.slice(0, max);
  return `${trimmed.replace(/[,;:\s]+$/, '')}…`;
}

/**
 * Meta description for a discussion post — generated from the beginning of the
 * actual post content (falling back to the title), cleaned of formatting
 * markup and truncated to a sensible length.
 */
export function postSeoDescription(post, max = 160) {
  if (!post) return '';
  const source = String(post.body || '').trim() || String(post.title || '').trim();
  if (!source) return '';
  return truncate(source, max);
}