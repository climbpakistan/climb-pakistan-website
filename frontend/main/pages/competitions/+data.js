import { fetchJSON, API_BASE } from '../data';

export { data };

async function data() {
  const competitions = await fetchJSON(`${API_BASE}/competitions`).catch(() => []);
  return { competitions };
}
