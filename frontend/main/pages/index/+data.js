import { fetchJSON, API_BASE } from '../data';

export { data };

async function data() {
  const [athletes, articles, mainPage] = await Promise.all([
    fetchJSON(`${API_BASE}/athletes`).catch(() => []),
    fetchJSON(`${API_BASE}/news?status=Published`).catch(() => []),
    fetchJSON(`${API_BASE}/main-page`).catch(() => null),
  ]);
  return { athletes, articles, mainPage };
}
