const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { onBeforePrerenderStart };

async function onBeforePrerenderStart() {
  const res = await fetch(`${API_BASE}/athletes`);
  const athletes = await res.json().catch(() => []);
  const urls = athletes
    .map((athlete) => `/athletes/${athlete.slug}`)
    .filter((url, i, arr) => arr.indexOf(url) === i);
  return urls;
}
