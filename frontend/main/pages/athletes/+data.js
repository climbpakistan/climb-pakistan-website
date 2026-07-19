import { fetchJSON, API_BASE } from '../data';

export { data };

async function data() {
  const athletes = await fetchJSON(`${API_BASE}/athletes`).catch(() => []);
  return { athletes };
}
