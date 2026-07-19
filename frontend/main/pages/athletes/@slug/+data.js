const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { data };

async function data(pageContext) {
  const { slug } = pageContext.routeParams;
  const res = await fetch(`${API_BASE}/athletes/${slug}`);
  const athlete = await res.json().catch(() => null);
  return { athlete, slug };
}
