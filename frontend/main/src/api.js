// In production, set VITE_API_URL in your Vercel environment variables.
// Defaults to the local backend during development, and the live
// backend on Vercel (so your custom domain works out of the box).
const BASE_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://climb-pakistan-backend.onrender.com/api' : 'http://localhost:3001/api');

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Athletes ──
export function getAthletes() {
  return fetchJSON(`${BASE_URL}/athletes`);
}

export function getAthlete(slug) {
  return fetchJSON(`${BASE_URL}/athletes/${slug}`);
}

// ── News ──
export function getNews() {
  return fetchJSON(`${BASE_URL}/news?status=Published`);
}

export function getNewsArticle(slug) {
  return fetchJSON(`${BASE_URL}/news/${slug}`);
}

// ── Competitions ──
export function getCompetitions() {
  return fetchJSON(`${BASE_URL}/competitions`);
}

export function getCompetition(slug) {
  return fetchJSON(`${BASE_URL}/competitions/${slug}`);
}

// ── Learn Sections ──
export function getLearnSections() {
  return fetchJSON(`${BASE_URL}/learn?status=Published`);
}

export function getLearnSection(slug) {
  return fetchJSON(`${BASE_URL}/learn/${slug}`);
}

// ── About ──
export function getAboutContent() {
  return fetchJSON(`${BASE_URL}/about`);
}

// ── Rankings ──
export function getRankings() {
  return fetchJSON(`${BASE_URL}/rankings`);
}

export function getRankingYears() {
  return fetchJSON(`${BASE_URL}/rankings/years`);
}

// ── Team Rankings ──
export function getTeamRankings() {
  return fetchJSON(`${BASE_URL}/team-rankings`);
}

export function getTeamRankingYears() {
  return fetchJSON(`${BASE_URL}/team-rankings/years`);
}

// ── Teams ──
export function getTeams() {
  return fetchJSON(`${BASE_URL}/teams`);
}

// ── Main Page ──
export function getMainPage() {
  return fetchJSON(`${BASE_URL}/main-page`);
}

// ── Contact ──
export async function submitContact(data) {
  const res = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send message');
  }
  return res.json();
}

// ── Community Auth ──
/**
 * Register a new community member. Submits as multipart/form-data so the
 * optional profile image travels with the account fields.
 * Returns { user, token }.
 */
export async function communityRegister({ username, email, password, avatar, name, communityRole, disciplines, experienceLevel, agreedToCommunityTerms }) {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('email', email);
  formData.append('password', password);
  formData.append('name', name || '');
  formData.append('communityRole', communityRole || '');
  formData.append('disciplines', JSON.stringify(disciplines || []));
  formData.append('experienceLevel', experienceLevel || '');
  formData.append('agreedToCommunityTerms', agreedToCommunityTerms ? 'true' : 'false');
  if (avatar) formData.append('avatar', avatar);

  const res = await fetch(`${BASE_URL}/auth/register`, { method: 'POST', body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Registration failed. Please try again.');
  return data;
}

/** Log in with an email or username (identifier) + password. Returns { user, token }. */
export async function communityLogin({ identifier, password }) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Login failed. Please try again.');
  return data;
}

/** Fetch the current user for a stored token — used to restore sessions. */
export async function communityMe(token) {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Your session is invalid. Please log in again.');
  return data;
}

/** Send a password reset code to the user's email. */
export async function forgotPassword(email) {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not send reset code.');
  return data;
}

/** Verify a 6-digit reset code. */
export async function verifyResetCode(email, code) {
  const res = await fetch(`${BASE_URL}/auth/verify-reset-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Invalid reset code.');
  return data;
}

/** Reset password with verified code. */
export async function resetPassword(email, code, newPassword) {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not reset password.');
  return data;
}

/** Fetch a publicly viewable community profile by username. */
export async function communityProfile(username) {
  const clean = String(username || '').trim().replace(/^@/, '');
  const res = await fetch(`${BASE_URL}/auth/u/${encodeURIComponent(clean)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Profile not found.');
  return data;
}

/** Update the current user's bio and/or profile image (multipart). */
export async function communityUpdateProfile(token, { bio, avatar, city, instagramUrl }) {
  const formData = new FormData();
  if (bio !== undefined) formData.append('bio', bio ?? '');
  if (city !== undefined) formData.append('city', city ?? '');
  if (instagramUrl !== undefined) formData.append('instagramUrl', instagramUrl ?? '');
  if (avatar) formData.append('avatar', avatar);

  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not update your profile.');
  return data;
}

// ── Badge Applications ──
export async function submitBadgeApplication(token, { badgeType, message }) {
  const res = await fetch(`${BASE_URL}/auth/badge-applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ badgeType, message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not submit application.');
  return data;
}

export async function getMyBadgeApplications(token) {
  const res = await fetch(`${BASE_URL}/auth/badge-applications/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not load applications.');
  return data;
}

// ── Community Posts ──
/** Paginated feed. view: new | popular | top; time applies to top. token is optional (enables poll/vote personalization). */
export async function getPosts(token, { view = 'new', time = 'all', page = 1, limit = 20, category = '', search = '' } = {}) {
  const params = new URLSearchParams({ view, time, page: String(page), limit: String(limit) });
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  const res = await fetch(`${BASE_URL}/posts?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not load posts.');
  return data;
}

/** Single post by id. token is optional (enables vote/poll personalization). */
export async function getPost(token, id) {
  const res = await fetch(`${BASE_URL}/posts/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Post not found.');
  return data;
}

/** Create a post (multipart; image travels with the fields). For polls, pass pollOptions + pollDuration. */
export async function createPost(token, { type, title, body, category, externalUrl, image, pollOptions, pollDuration }) {
  const formData = new FormData();
  formData.append('type', type);
  formData.append('title', title);
  formData.append('body', body ?? '');
  formData.append('category', category);
  if (externalUrl) formData.append('externalUrl', externalUrl);
  if (image) formData.append('image', image);
  if (type === 'poll') {
    formData.append('pollOptions', JSON.stringify(pollOptions || []));
    if (pollDuration !== undefined && pollDuration !== null) {
      formData.append('pollDuration', String(pollDuration));
    }
  }

  const res = await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not publish your post.');
  return data;
}

/** Edit a post (owner only, multipart). */
export async function updatePost(token, id, { title, body, category, externalUrl, image }) {
  const formData = new FormData();
  if (title !== undefined) formData.append('title', title);
  if (body !== undefined) formData.append('body', body);
  if (category !== undefined) formData.append('category', category);
  if (externalUrl !== undefined) formData.append('externalUrl', externalUrl);
  if (image) formData.append('image', image);

  const res = await fetch(`${BASE_URL}/posts/${id}`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not update your post.');
  return data;
}

/** Delete a post (owner only). */
export async function deletePost(token, id) {
  const res = await fetch(`${BASE_URL}/posts/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not delete your post.');
  return data;
}

// ── Community Comments ──
/** All comments (and replies) for a post, oldest first. Public. */
export async function getComments(postId) {
  return fetchJSON(`${BASE_URL}/comments/${postId}`);
}

/** Add a comment or reply. Pass parentCommentId to reply. */
export async function createComment(token, postId, { body, parentCommentId }) {
  const res = await fetch(`${BASE_URL}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ postId, body, parentCommentId: parentCommentId || undefined }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not add your comment.');
  return data;
}

/** Edit a comment (owner only). */
export async function updateComment(token, id, body) {
  const res = await fetch(`${BASE_URL}/comments/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not update your comment.');
  return data;
}

/** Delete a comment (owner only). Replies are removed too. */
export async function deleteComment(token, id) {
  const res = await fetch(`${BASE_URL}/comments/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not delete your comment.');
  return data;
}

// ── Community Votes ──
/**
 * Vote on a post or comment. voteType is 'upvote' | 'downvote' | null.
 * The backend handles add / remove / switch transitions atomically.
 */
export async function vote(token, { target, targetId, voteType }) {
  const res = await fetch(`${BASE_URL}/votes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ target, targetId, voteType }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not record your vote.');
  return data;
}

/**
 * Batch-fetch the current user's votes for highlighting.
 * `posts` / `comments` are arrays of ids. Returns { posts: {id: type}, comments: {...} }.
 */
export async function getMyVotes(token, { posts = [], comments = [] } = {}) {
  const params = new URLSearchParams();
  if (posts.length > 0) params.set('posts', posts.join(','));
  if (comments.length > 0) params.set('comments', comments.join(','));
  const qs = params.toString();
  const res = await fetch(`${BASE_URL}/votes/mine${qs ? `?${qs}` : ''}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not load your votes.');
  return data;
}

// ── Community Polls ──
/** Submit or change the current user's vote on a poll. Returns { poll }. */
export async function votePoll(token, postId, optionKey) {
  const res = await fetch(`${BASE_URL}/posts/${postId}/poll-vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ optionKey }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not record your vote.');
  return data;
}

// ── Community Reports ──
/** Report a post or comment. Pass postId OR commentId. */
export async function submitReport(token, { postId, commentId, reason, details }) {
  const res = await fetch(`${BASE_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      ...(postId ? { postId } : {}),
      ...(commentId ? { commentId } : {}),
      reason,
      details,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not submit your report.');
  return data;
}

// ── Community Follows ──
/** Follow a user by id. */
export async function followUser(token, userId) {
  const res = await fetch(`${BASE_URL}/follows/${userId}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not follow this user.');
  return data;
}

/** Unfollow a user by id. */
export async function unfollowUser(token, userId) {
  const res = await fetch(`${BASE_URL}/follows/${userId}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not unfollow this user.');
  return data;
}

/** Check whether the current user follows a target user. */
export async function getFollowStatus(token, userId) {
  const res = await fetch(`${BASE_URL}/follows/status/${userId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not load follow status.');
  return data;
}

/** List followers of a profile by username. */
export async function getFollowers(username) {
  return fetchJSON(`${BASE_URL}/follows/${encodeURIComponent(username)}/followers`);
}

/** List users that a profile follows by username. */
export async function getFollowing(username) {
  return fetchJSON(`${BASE_URL}/follows/${encodeURIComponent(username)}/following`);
}

// ── Community Search ──
export async function searchCommunityUsers(query) {
  if (!query || query.length < 2) return { users: [] };
  const params = new URLSearchParams({ query });
  return fetchJSON(`${BASE_URL}/auth/search?${params.toString()}`);
}

// ── Profile posts & comments ──
/** A public user's posts (newest first, removed content excluded). */
export async function getUserPosts(username, { page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ view: 'new', page: String(page), limit: String(limit) });
  params.set('author', username);
  return fetchJSON(`${BASE_URL}/posts?${params.toString()}`);
}

/** A public user's comments (newest first, removed excluded). */
export async function getUserComments(username) {
  return fetchJSON(`${BASE_URL}/comments/user/${encodeURIComponent(username)}`);
}
