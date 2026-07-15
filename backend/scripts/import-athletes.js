import 'dotenv/config';
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import dns from 'dns';
import Athlete from '../src/models/Athlete.js';
import {
  SHEETS, ATHLETE_COLUMNS, MEDAL_COLUMNS,
  parseAthleteRow, parseMedalRow, parseString,
} from '../src/utils/xlsx-parser.js';

dns.setServers(['8.8.8.8']);

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set in environment');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

function readAthletesSheet(workbook) {
  const sheet = workbook.Sheets[SHEETS.ATHLETES];
  if (!sheet) {
    console.error(`Sheet "${SHEETS.ATHLETES}" not found`);
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headerRow = rows[ATHLETE_COLUMNS.HEADER_ROW];
  const headers = headerRow.map(h => h ? String(h).trim() : '');

  console.log('Athletes sheet headers:', headers);

  const athletes = [];
  for (let i = ATHLETE_COLUMNS.DATA_START; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => c === null || c === undefined || c === '')) continue;

    const parsed = parseAthleteRow(row);
    if (!parsed) {
      console.log(`Row ${i + 1}: Skipping — empty slug`);
      continue;
    }
    athletes.push(parsed);
  }

  console.log(`Parsed ${athletes.length} athletes from sheet`);
  return athletes;
}

function readMedalsSheet(workbook) {
  const sheet = workbook.Sheets[SHEETS.MEDALS];
  if (!sheet) {
    console.error(`Sheet "${SHEETS.MEDALS}" not found`);
    return {};
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const medalsBySlug = {};

  for (let i = MEDAL_COLUMNS.DATA_START; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => c === null || c === undefined || c === '')) continue;

    const parsed = parseMedalRow(row);
    if (!parsed) continue;

    if (!medalsBySlug[parsed.slug]) {
      medalsBySlug[parsed.slug] = [];
    }
    medalsBySlug[parsed.slug].push(parsed.entry);
  }

  const totalMedals = Object.values(medalsBySlug).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`Parsed ${totalMedals} medals across ${Object.keys(medalsBySlug).length} athletes`);
  return medalsBySlug;
}

async function importAthletes(athletes, medalsBySlug) {
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const athlete of athletes) {
    try {
      const medals = medalsBySlug[athlete.slug] || [];

      const existing = await Athlete.findOne({ slug: athlete.slug });

      if (existing) {
        await Athlete.findOneAndUpdate(
          { slug: athlete.slug },
          { $set: { ...athlete, medals, updatedAt: new Date() } },
          { returnDocument: 'after', runValidators: true }
        );
        console.log(`UPDATED: ${athlete.name} (${athlete.slug}) — ${medals.length} medals`);
        updated++;
      } else {
        await Athlete.create({ ...athlete, medals });
        console.log(`CREATED: ${athlete.name} (${athlete.slug}) — ${medals.length} medals`);
        created++;
      }
    } catch (err) {
      console.error(`ERROR: ${athlete.name} (${athlete.slug}): ${err.message}`);
      errors++;
    }
  }

  return { created, updated, errors };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/import-athletes.js <path-to-excel-file>');
    process.exit(1);
  }

  console.log(`Reading Excel file: ${filePath}`);
  const workbook = XLSX.readFile(filePath);

  await connectDB();

  const athletes = readAthletesSheet(workbook);
  const medalsBySlug = readMedalsSheet(workbook);

  console.log('\nStarting import...\n');
  const result = await importAthletes(athletes, medalsBySlug);

  console.log('\n=== Import Summary ===');
  console.log(`Created: ${result.created}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Errors:  ${result.errors}`);
  console.log(`Total:   ${result.created + result.updated + result.errors}`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
