import { normalizeSlug } from '../../../src/utils/slug';

const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { onBeforePrerenderStart };

async function onBeforePrerenderStart() {
  const res = await fetch(`${API_BASE}/learn?status=Published`);
  const sections = await res.json().catch(() => []);
  const urls = sections
    .map((section) => normalizeSlug(section.slug))
    .filter(Boolean)
    .map((slug) => `/learn/${slug}`)
    .filter((url, i, arr) => arr.indexOf(url) === i);
  return urls;
}
