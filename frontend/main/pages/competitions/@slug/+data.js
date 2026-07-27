const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { data };

async function data(pageContext) {
  const { slug } = pageContext.routeParams;
  const [compRes, newsRes, athletesRes, champResultsRes] = await Promise.all([
    fetch(`${API_BASE}/competitions/${slug}`),
    fetch(`${API_BASE}/news?status=Published`),
    fetch(`${API_BASE}/athletes`),
    fetch(`${API_BASE}/results/by-competition/${slug}`).catch(() => null),
  ]);
  const [competition, allNews, allAthletes] = await Promise.all([
    compRes.json().catch(() => null),
    newsRes.json().catch(() => []),
    athletesRes.json().catch(() => []),
  ]);
  const championshipResults = champResultsRes?.ok ? await champResultsRes.json().catch(() => null) : null;
  return { competition, slug, allNews, allAthletes, championshipResults };
}
