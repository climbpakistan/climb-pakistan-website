import { fetchJSON, API_BASE } from '../data';

export { data };

async function data() {
  const [resultsRaw, athletes] = await Promise.all([
    fetchJSON(`${API_BASE}/results`).catch(() => ({ data: {} })),
    fetchJSON(`${API_BASE}/athletes`).catch(() => []),
  ]);
  const results = resultsRaw?.data !== undefined ? resultsRaw.data : resultsRaw;
  const tags = resultsRaw?.tags || [];
  return { results, tags, athletes };
}
