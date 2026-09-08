import { render } from 'vike/abort';

const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { data };

/**
 * Server-side data for a single community discussion.
 *
 * The post and its public comments are fetched during SSR so the initial HTML
 * contains the actual discussion content instead of a client-only loading
 * shell. Missing, moderator-removed, or otherwise restricted posts return a
 * real HTTP 404 (never a 200 page).
 */
async function data(pageContext) {
  const { postId } = pageContext.routeParams;

  const [postRes, commentsRes] = await Promise.all([
    fetch(`${API_BASE}/posts/${postId}`),
    fetch(`${API_BASE}/comments/${postId}`),
  ]);

  if (!postRes.ok) {
    // This route opts out of prerendering, but guard anyway so a build never
    // fails on a missing post — return an empty payload instead.
    if (!pageContext.isPrerendering) throw render(404);
    return { post: null, comments: [], postId };
  }

  const postJson = await postRes.json().catch(() => null);
  const commentsJson = await commentsRes.json().catch(() => null);

  return {
    post: postJson?.post || null,
    comments: Array.isArray(commentsJson?.comments) ? commentsJson.comments : [],
    postId,
  };
}