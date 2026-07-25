const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { data };

/**
 * Fetches team ranking data for a specific year.
 * URL pattern: /rankings/teams/:year
 * Example: /rankings/teams/2024
 */
async function data(pageContext) {
  const { year } = pageContext.routeParams;

  const [teamRankingsRaw, teams] = await Promise.all([
    fetch(`${API_BASE}/team-rankings`).then((r) => r.json()).catch(() => ({ data: {} })),
    fetch(`${API_BASE}/teams`).then((r) => r.json()).catch(() => []),
  ]);

  const teamRankings = teamRankingsRaw?.data || teamRankingsRaw;
  const yearData = teamRankings?.[year] || [];

  // Sort and compute display ranks
  const sorted = [...yearData].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  const ranked = [];
  let displayRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].totalPoints !== sorted[i - 1].totalPoints) {
      displayRank = i + 1;
    }
    ranked.push({ ...sorted[i], displayRank });
  }

  return {
    year,
    list: ranked,
    teams,
    allTeamRankings: teamRankings,
  };
}
