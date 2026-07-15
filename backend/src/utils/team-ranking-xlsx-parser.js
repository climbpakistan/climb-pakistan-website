// ── Shared parsing helpers for team ranking .xlsx import ──
// Format: Each sheet is named after the year (e.g. "2024", "2025")
//
// Recommended header row (row 4):
//   Rank | Team Name | teamSlug | Men's Points | Women's Points
//
// Data starts at row 5. Year and Total Points are auto-derived.

export const TEAM_RANKING_COLUMNS = {
  HEADER_ROW: 2,
  DATA_START: 3,
  year: 0,
  rank: 1,
  teamSlug: 2,
  teamName: 3,
  menPoints: 4,
  womenPoints: 5,
  totalPoints: 6,
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

/**
 * Parse a single row into a team ranking entry.
 * Returns null if the row has no team name (empty row).
 */
export function parseTeamRankingRow(row) {
  const teamName = parseString(row[TEAM_RANKING_COLUMNS.teamName]);
  if (!teamName) return null;

  const menPts = parseNumber(row[TEAM_RANKING_COLUMNS.menPoints]);
  const womenPts = parseNumber(row[TEAM_RANKING_COLUMNS.womenPoints]);
  const teamSlug = parseString(row[TEAM_RANKING_COLUMNS.teamSlug]);

  return {
    rank: parseNumber(row[TEAM_RANKING_COLUMNS.rank]),
    teamName,
    teamSlug,
    menPoints: menPts,
    womenPoints: womenPts,
    totalPoints: menPts + womenPts,
  };
}

/**
 * Parse all sheets from a team ranking workbook.
 * Each sheet named with a 4-digit year is treated as a year's rankings.
 *
 * @param {import('xlsx').WorkBook} workbook
 * @param {import('xlsx')} XLSX - the xlsx module (passed in so non-ESM usage works)
 * @returns {Object} e.g. { "2024": [...], "2025": [...] }
 */
export function parseTeamRankingWorkbook(workbook, XLSX) {
  const result = {};
  let processedSheets = 0;

  for (const sheetName of workbook.SheetNames) {
    // Only process sheets that look like year names (4-digit numbers)
    if (!/^\d{4}$/.test(sheetName)) continue;

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const entries = [];
    for (let i = TEAM_RANKING_COLUMNS.DATA_START; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => c === null || c === undefined || c === '')) continue;

      const parsed = parseTeamRankingRow(row);
      if (parsed) entries.push(parsed);
    }

    if (entries.length > 0) {
      result[sheetName] = entries;
      processedSheets++;
    }
  }

  return { data: result, processedSheets };
}
