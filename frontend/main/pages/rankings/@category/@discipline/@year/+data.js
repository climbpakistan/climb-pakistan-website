const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { data };

/**
 * Fetches rankings data for a specific gender, discipline, and year combination.
 * URL pattern: /rankings/:category/:discipline/:year
 * Example: /rankings/men/speed/2024
 */
async function data(pageContext) {
  const { category, discipline, year } = pageContext.routeParams;

  // Normalize URL params to API format: 'men' → 'Men', 'speed' → 'Speed'
  const gender = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  const disc = discipline.charAt(0).toUpperCase() + discipline.slice(1).toLowerCase();

  const [rankingsRaw, athletes] = await Promise.all([
    fetch(`${API_BASE}/rankings`).then((r) => r.json()).catch(() => ({ data: {} })),
    fetch(`${API_BASE}/athletes`).then((r) => r.json()).catch(() => []),
  ]);

  const rankings = rankingsRaw?.data || rankingsRaw;
  const list = rankings?.[gender]?.[disc]?.[year] || [];

  // Sort by points descending
  const sorted = [...list].sort((a, b) => (b.points || 0) - (a.points || 0));

  // Compute display ranks handling ties
  const ranked = [];
  let displayRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].points !== sorted[i - 1].points) {
      displayRank = i + 1;
    }
    ranked.push({ ...sorted[i], displayRank });
  }

  return {
    category,
    discipline: disc,
    year,
    gender,
    list: ranked,
    athletes,
    // Pass full rankings so the page can offer links to other combos
    allRankings: rankings,
  };
}
