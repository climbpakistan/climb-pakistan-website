// ── Shared parsing helpers for athlete .xlsx import ──
// Used by: backend/scripts/import-athletes.js, backend/src/routes/athletes.js

export const MEDAL_MAP = {
  'Gold Medal': 'Gold',
  'Silver Medal': 'Silver',
  'Bronze Medal': 'Bronze',
  'No Medal': null,
};

export const DISCIPLINE_NORMALIZE = {
  'speed': 'Speed Climbing',
  'speed climbing': 'Speed Climbing',
  'speed climibng': 'Speed Climbing',
  'lead': 'Lead Climbing',
  'lead climbing': 'Lead Climbing',
  'lead climbibg': 'Lead Climbing',
  'boulder': 'Boulder',
  'bouldering': 'Boulder',
};

export function normalizeDiscipline(val) {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim().toLowerCase();
  return DISCIPLINE_NORMALIZE[trimmed] || val.trim();
}

export function parseDisciplines(val) {
  if (!val || typeof val !== 'string') return [];
  const trimmed = val.trim();
  if (!trimmed) return [];
  const parts = trimmed.split('+').map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  const result = [];
  for (const part of parts) {
    const normalized = normalizeDiscipline(part);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

export function parseRank(val) {
  if (val === undefined || val === null) return 1;
  if (typeof val === 'number') return val;
  const str = String(val).replace('#', '').trim();
  const num = parseInt(str, 10);
  return isNaN(num) ? 1 : num;
}

export function parseBoolean(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.trim().toLowerCase() === 'yes';
  return false;
}

export function parseNumber(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return val;
  const num = parseInt(String(val).trim(), 10);
  return isNaN(num) ? null : num;
}

export function parseString(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

// Sheet structure constants
export const SHEETS = {
  ATHLETES: 'Sheet1 - Athletes Data',
  MEDALS: 'Sheet2 - Medals Data',
};

export const ATHLETE_COLUMNS = {
  HEADER_ROW: 4,
  DATA_START: 5,
  name: 0,
  slug: 1,
  gender: 2,
  team: 3,
  rank: 4,
  hometown: 5,
  age: 6,
  startedClimbing: 7,
  instagram: 8,
  internationalParticipation: 9,
  isChampion: 10,
  mainDiscipline: 11,
  allDisciplines: 12,
  photoUrl: 13,
  worldClimbingUrl: 14,
};

export const MEDAL_COLUMNS = {
  DATA_START: 5,
  slug: 0,
  competition: 1,
  year: 2,
  discipline: 3,
  medal: 4,
};

/**
 * Parse an athlete row into an athlete object
 */
export function parseAthleteRow(row) {
  const slug = parseString(row[ATHLETE_COLUMNS.slug]);
  if (!slug) return null;

  const allDisciplinesRaw = parseString(row[ATHLETE_COLUMNS.allDisciplines]);
  const mainDisciplineRaw = parseString(row[ATHLETE_COLUMNS.mainDiscipline]);

  return {
    slug,
    name: parseString(row[ATHLETE_COLUMNS.name]),
    gender: parseString(row[ATHLETE_COLUMNS.gender]),
    team: parseString(row[ATHLETE_COLUMNS.team]),
    rank: parseRank(row[ATHLETE_COLUMNS.rank]),
    hometown: parseString(row[ATHLETE_COLUMNS.hometown]),
    age: parseNumber(row[ATHLETE_COLUMNS.age]),
    startedClimbing: parseString(row[ATHLETE_COLUMNS.startedClimbing]),
    instagram: parseString(row[ATHLETE_COLUMNS.instagram]).replace(/^www\.instagram\.com\//, ''),
    internationalParticipation: parseNumber(row[ATHLETE_COLUMNS.internationalParticipation]),
    isChampion: parseBoolean(row[ATHLETE_COLUMNS.isChampion]),
    championTitle: parseBoolean(row[ATHLETE_COLUMNS.isChampion]) ? 'National Champion' : '',
    mainDiscipline: normalizeDiscipline(mainDisciplineRaw),
    disciplines: parseDisciplines(allDisciplinesRaw),
    photoUrl: parseString(row[ATHLETE_COLUMNS.photoUrl]),
    worldClimbingUrl: parseString(row[ATHLETE_COLUMNS.worldClimbingUrl]),
    about: '',
  };
}

/**
 * Parse a medal row into a medal entry object, or null if invalid
 */
export function parseMedalRow(row) {
  const slug = parseString(row[MEDAL_COLUMNS.slug]);
  if (!slug) return null;

  const competition = parseString(row[MEDAL_COLUMNS.competition]);
  const year = String(parseNumber(row[MEDAL_COLUMNS.year]) || '');
  const disciplineRaw = parseString(row[MEDAL_COLUMNS.discipline]);
  const medalRaw = parseString(row[MEDAL_COLUMNS.medal]);

  const medalNormalized = MEDAL_MAP[medalRaw];
  if (!medalNormalized) return null;

  return {
    slug,
    entry: {
      discipline: normalizeDiscipline(disciplineRaw) || 'Speed Climbing',
      medal: medalNormalized,
      competition: competition && year ? `${competition} ${year}` : (competition || year),
    },
  };
}
