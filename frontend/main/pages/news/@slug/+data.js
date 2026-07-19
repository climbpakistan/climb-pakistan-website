const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { data };

async function data(pageContext) {
  const { slug } = pageContext.routeParams;
  const [articleRes, allArticlesRes] = await Promise.all([
    fetch(`${API_BASE}/news/${slug}`),
    fetch(`${API_BASE}/news?status=Published`),
  ]);
  const article = await articleRes.json().catch(() => null);
  const allArticles = await allArticlesRes.json().catch(() => []);
  return { article, allArticles, slug };
}
