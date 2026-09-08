import { normalizeSlug } from '../../../src/utils/slug';

const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { onBeforePrerenderStart };

async function onBeforePrerenderStart() {
  const res = await fetch(`${API_BASE}/competitions`);
  const competitions = await res.json().catch(() => []);
  const urls = competitions
    .map((comp) => normalizeSlug(comp.slug))
    .filter(Boolean)
    .map((slug) => `/competitions/${slug}`)
    .filter((url, i, arr) => arr.indexOf(url) === i);
  return urls;
}
