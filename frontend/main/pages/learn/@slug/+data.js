import { render } from 'vike/abort';

const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { data };

async function data(pageContext) {
  const { slug } = pageContext.routeParams;
  const res = await fetch(`${API_BASE}/learn/${slug}`);
  if (!res.ok) throw render(404);
  const section = await res.json().catch(() => null);
  return { section, slug };
}
