const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { onBeforePrerenderStart };

async function onBeforePrerenderStart() {
  const res = await fetch(`${API_BASE}/auth/usernames`).catch(() => null);
  const json = res?.ok ? await res.json().catch(() => null) : null;
  const usernames = Array.isArray(json?.usernames) ? json.usernames : [];
  return usernames.map((u) => `/community/u/${u}`);
}