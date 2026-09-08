import { render } from 'vike/abort';

const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { data };

async function data(pageContext) {
  const username = pageContext.routeParams.username;
  const res = await fetch(`${API_BASE}/auth/u/${encodeURIComponent(username)}`).catch(() => null);
  if (!res || !res.ok) throw render(404);
  const json = await res.json().catch(() => null);
  return {
    username,
    profile: json?.profile || null,
  };
}