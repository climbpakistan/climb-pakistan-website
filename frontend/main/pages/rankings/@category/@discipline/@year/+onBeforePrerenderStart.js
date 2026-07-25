const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

export { onBeforePrerenderStart };

const CATEGORIES = ['Men', 'Women'];
const DISCIPLINES = ['Speed', 'Lead', 'Boulder'];

/**
 * Returns all valid category/discipline/year combinations at build time
 * so Vike pre-renders static HTML pages for each one.
 */
async function onBeforePrerenderStart() {
  const res = await fetch(`${API_BASE}/rankings`).catch(() => null);
  if (!res || !res.ok) return [];

  const raw = await res.json();
  const rankings = raw?.data || raw;
  if (!rankings) return [];

  const urls = [];

  for (const category of CATEGORIES) {
    for (const discipline of DISCIPLINES) {
      const years = rankings?.[category]?.[discipline] || {};
      for (const year of Object.keys(years)) {
        const entries = years[year];
        if (Array.isArray(entries) && entries.length > 0) {
          urls.push(
            `/rankings/${category.toLowerCase()}/${discipline.toLowerCase()}/${year}`
          );
        }
      }
    }
  }

  return urls;
}
