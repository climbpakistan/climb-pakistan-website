import { render } from 'vike/abort';

const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { data };

async function data(pageContext) {
  const { slug } = pageContext.routeParams;
  const res = await fetch(`${API_BASE}/athletes/${slug}`);
  if (!res.ok) {
    if (!pageContext.isPrerendering) throw render(404);
    return { athlete: null, slug };
  }
  const athlete = await res.json().catch(() => null);
  return { athlete, slug };
}
