import { fetchJSON, API_BASE } from '../data';

export { data };

async function data() {
  const articles = await fetchJSON(`${API_BASE}/news?status=Published`).catch(() => []);
  return { articles };
}
