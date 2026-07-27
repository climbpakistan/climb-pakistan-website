// ── Excel parser for National Championship Results ──
// Format: One sheet per year, flat column layout
//
// Row 1: Competition title (e.g. "National Championship 2024")
// Rows 2-4: Empty
// Row 5 (headers): competition-slug | Year | Discipline | Category | Position | Athlete-Slug | Athlete Name | Team
// Row 6+: Data
//
// If athlete-slug is provided → slug-based entry (name/photo resolve from profile, team from Excel)
// If only Athlete Name is provided → manual entry (name/team stored directly)
//
// Category: "Men Senior" → "Men", "Women Senior" → "Women"
// Discipline: "Speed Climbing" → "Speed", "Lead Climbing" → "Lead", "Boulder" → "Boulder"

// NOTE: sheet_to_json returns 0-indexed arrays. Row5 (headers) = index 4, Row6+ (data) = index 5+
export const RESULTS_COLUMNS = {
  DATA_START: 5,
  slug: 5,
  name: 6,
  team: 7,
  rank: 4,
  discipline: 2,
  category: 3,
  year: 1,
};

// Normalization maps to match frontend expectations
const GENDER_MAP = {
  'male': 'Men',
  'men': 'Men',
  'men senior': 'Men',
  'female': 'Women',
  'women': 'Women',
  'women senior': 'Women',
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
 * Parse a single row into a result entry.
 * Returns null if the row has no data (no slug, no name, no position).
 */
export function parseResultRow(row) {
  const slug = parseString(row[RESULTS_COLUMNS.slug]);
  const name = parseString(row[RESULTS_COLUMNS.name]);
  const rank = parseNumber(row[RESULTS_COLUMNS.rank]);
  const team = parseString(row[RESULTS_COLUMNS.team]);

  if (!slug && !name) return null;
  if (!rank && rank !== 0) return null;

  const gender = normalizeGender(parseString(row[RESULTS_COLUMNS.category]));
  const discipline = normalizeDiscipline(parseString(row[RESULTS_COLUMNS.discipline]));
  const year = parseString(row[RESULTS_COLUMNS.year]);

  if (!gender || !discipline || !year) return null;

  // Build entry — always store team from the Excel sheet
  if (slug) {
    return { gender, discipline, year, entry: { rank, slug, team } };
  } else {
    return { gender, discipline, year, entry: { rank, name: name || 'Unknown', team } };
  }
}

/**
 * Parse all valid rows from a workbook and group them into the nested structure.
 * Returns: { Men: { Speed: { "2024": [...], "2025": [...] }, ... }, Women: {...} }
 */
export function parseResultsWorkbook(workbook, XLSX) {
  const result = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    for (let i = RESULTS_COLUMNS.DATA_START; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => c === null || c === undefined || c === '')) continue;

      const parsed = parseResultRow(row);
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
