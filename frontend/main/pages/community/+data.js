import { isPostIndexable } from '../../src/utils/communitySeo';

const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { data };

/**
 * Server-rendered data for the Community landing page.
 *
 * Recent public discussions are fetched during SSR so the initial HTML contains
 * useful Community content (and internal links to individual discussions)
 * instead of an empty auth shell. Only public, non-removed, indexable posts
 * are shown — never authenticated-only content.
 */
async function data() {
  const recentPosts = await fetch(`${API_BASE}/posts?view=new&page=1&limit=5`)
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => (Array.isArray(json?.posts) ? json.posts : []))
    .catch(() => []);

  return { recentPosts: recentPosts.filter(isPostIndexable) };
}