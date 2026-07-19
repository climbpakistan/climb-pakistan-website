const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { data };

async function data(pageContext) {
  const { slug } = pageContext.routeParams;
  const [compRes, newsRes, athletesRes] = await Promise.all([
    fetch(`${API_BASE}/competitions/${slug}`),
    fetch(`${API_BASE}/news?status=Published`),
    fetch(`${API_BASE}/athletes`),
  ]);
  const [competition, allNews, allAthletes] = await Promise.all([
    compRes.json().catch(() => null),
    newsRes.json().catch(() => []),
    athletesRes.json().catch(() => []),
  ]);
  return { competition, slug, allNews, allAthletes };
}
