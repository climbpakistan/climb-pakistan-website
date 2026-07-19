const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { onBeforePrerenderStart };

async function onBeforePrerenderStart() {
  const res = await fetch(`${API_BASE}/learn?status=Published`);
  const sections = await res.json().catch(() => []);
  const urls = sections
    .map((section) => `/learn/${section.slug}`)
    .filter((url, i, arr) => arr.indexOf(url) === i);
  return urls;
}
