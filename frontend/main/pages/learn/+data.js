import { fetchJSON, API_BASE } from '../data';

export { data };

async function data() {
  const sections = await fetchJSON(`${API_BASE}/learn?status=Published`).catch(() => []);
  return { sections };
}
