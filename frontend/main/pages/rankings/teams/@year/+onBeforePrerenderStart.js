const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { onBeforePrerenderStart };

/**
 * Returns all years that have team ranking data at build time.
 */
async function onBeforePrerenderStart() {
  const res = await fetch(`${API_BASE}/team-rankings`).catch(() => null);
  if (!res || !res.ok) return [];

  const raw = await res.json();
  const data = raw?.data || raw;
  if (!data) return [];

  const years = Object.keys(data).filter(
    (y) => Array.isArray(data[y]) && data[y].length > 0
  );

  return years.map((year) => `/rankings/teams/${year}`);
}
