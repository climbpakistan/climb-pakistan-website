const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { onBeforePrerenderStart };

async function onBeforePrerenderStart() {
  const res = await fetch(`${API_BASE}/news?status=Published`);
  const articles = await res.json().catch(() => []);
  // Deduplicate slugs
  const urls = articles
    .map((article) => `/news/${article.slug}`)
    .filter((url, i, arr) => arr.indexOf(url) === i);
  return urls;
}
