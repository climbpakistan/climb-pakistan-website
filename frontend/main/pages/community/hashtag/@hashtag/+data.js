const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { data };

/**
 * Server-side data for a hashtag results page.
 *
 * The hashtag and its first page of posts are fetched during SSR so the
 * initial HTML contains real content (and real internal links to the posts).
 * Unknown hashtags still render a friendly empty state rather than a 404.
 */
async function data(pageContext) {
  const raw = pageContext.routeParams.hashtag;
  const tag = String(raw || '').replace(/^#/, '').toLowerCase();
  if (!tag) return { hashtag: null, posts: [], page: 1, total: 0, hasMore: false };

  const empty = { hashtag: { name: tag, displayName: tag, postCount: 0 }, posts: [], page: 1, total: 0, hasMore: false };

  try {
    const res = await fetch(`${API_BASE}/hashtags/${encodeURIComponent(tag)}`);
    if (!res.ok) return empty;
    const json = await res.json().catch(() => null);
    if (!json) return empty;
    return {
      hashtag: json.hashtag || empty.hashtag,
      posts: Array.isArray(json.posts) ? json.posts : [],
      page: json.page || 1,
      total: json.total || 0,
      hasMore: !!json.hasMore,
    };
  } catch {
    return empty;
  }
}
