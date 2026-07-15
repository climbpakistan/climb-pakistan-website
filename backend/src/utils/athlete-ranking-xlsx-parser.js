// ── Shared parsing helpers for athlete (player) ranking .xlsx import ──
// Format: Single sheet with flat column layout
//
// Header row (row 2):
//   Gender | Discipline | Year | Rank | athlete-slug | Athlete Name | Team | points
//
// Data starts at row 3.
// If athlete-slug is provided → slug-based entry (name/team/photo resolve from profile)
// If only Athlete Name is provided → manual entry (name/team stored directly)

export const ATHLETE_RANKING_COLUMNS = {
  HEADER_ROW: 2,
  DATA_START: 3,
  gender: 0,
  discipline: 1,
  year: 2,
  rank: 3,
  slug: 4,
  name: 5,
  team: 6,
  points: 7,
};

// Normalization maps to match frontend expectations
const GENDER_MAP = {
  'male': 'Men',
  'men': 'Men',
  'female': 'Women',
  'women': 'Women',
};

const DISCIPLINE_MAP = {
  'speed': 'Speed',
  'speed climbing': 'Speed',
  'lead': 'Lead',
  'lead climbing': 'Lead',
  'boulder': 'Boulder',
  'bouldering': 'Boulder',
};

export function parseString(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

export function parseNumber(val) {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const num = Number(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(num) ? 0 : num;
}

function normalizeGender(val) {
  const lower = val.toLowerCase().trim();
  return GENDER_MAP[lower] || val;
}

function normalizeDiscipline(val) {
  const lower = val.toLowerCase().trim();
  return DISCIPLINE_MAP[lower] || val;
}

/**
 * Parse a single row into a ranking entry.
 * Returns null if the row has no data (no slug, no name, no rank).
 */
export function parseAthleteRankingRow(row) {
  const slug = parseString(row[ATHLETE_RANKING_COLUMNS.slug]);
  const name = parseString(row[ATHLETE_RANKING_COLUMNS.name]);
  const rank = parseNumber(row[ATHLETE_RANKING_COLUMNS.rank]);
  const points = parseNumber(row[ATHLETE_RANKING_COLUMNS.points]);

  if (!slug && !name) return null;
  if (!rank && rank !== 0) return null;

  const gender = normalizeGender(parseString(row[ATHLETE_RANKING_COLUMNS.gender]));
  const discipline = normalizeDiscipline(parseString(row[ATHLETE_RANKING_COLUMNS.discipline]));
  const year = parseString(row[ATHLETE_RANKING_COLUMNS.year]);

  if (!gender || !discipline || !year) return null;

  // Determine entry type: slug-based or manual
  let entry;
  if (slug) {
    entry = { rank, slug, points };
  } else {
    entry = {
      rank,
      name: name || 'Unknown',
      team: parseString(row[ATHLETE_RANKING_COLUMNS.team]),
      points,
    };
  }

  return { gender, discipline, year, entry };
}

/**
 * Parse all valid rows from a workbook and group them into the nested structure.
 * Returns: { Men: { Speed: { "2026": [...], "2025": [...] }, ... }, Women: {...} }
 */
export function parseAthleteRankingWorkbook(workbook, XLSX) {
  const result = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    for (let i = ATHLETE_RANKING_COLUMNS.DATA_START; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => c === null || c === undefined || c === '')) continue;

      const parsed = parseAthleteRankingRow(row);
      if (!parsed) continue;

      const { gender, discipline, year, entry } = parsed;

      // Build nested structure: data[gender][discipline][year]
      if (!result[gender]) result[gender] = {};
      if (!result[gender][discipline]) result[gender][discipline] = {};
      if (!result[gender][discipline][year]) result[gender][discipline][year] = [];

      result[gender][discipline][year].push(entry);
    }
  }

  return result;
}
