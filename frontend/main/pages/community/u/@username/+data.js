const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { data };

async function data(pageContext) {
  const username = pageContext.routeParams.username;
  const res = await fetch(`${API_BASE}/auth/u/${encodeURIComponent(username)}`).catch(() => null);
  const json = res?.ok ? await res.json().catch(() => null) : null;
  return {
    username,
    profile: json?.profile || null,
  };
}