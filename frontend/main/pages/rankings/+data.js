import { fetchJSON, API_BASE } from '../data';

export { data };

async function data() {
  const [rankingsRaw, teamRankingsRaw, athletes, teams] = await Promise.all([
    fetchJSON(`${API_BASE}/rankings`).catch(() => ({ data: {} })),
    fetchJSON(`${API_BASE}/team-rankings`).catch(() => ({ data: {} })),
    fetchJSON(`${API_BASE}/athletes`).catch(() => []),
    fetchJSON(`${API_BASE}/teams`).catch(() => []),
  ]);
  return { rankingsRaw, teamRankingsRaw, athletes, teams };
}
