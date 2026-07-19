import { fetchJSON, API_BASE } from '../data';

export { data };

async function data() {
  const content = await fetchJSON(`${API_BASE}/about`).catch(() => null);
  return { content };
}
