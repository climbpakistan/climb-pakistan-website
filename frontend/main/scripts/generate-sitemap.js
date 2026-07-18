#!/usr/bin/env node

/**
 * Build-time sitemap generator.
 *
 * Fetches all published content from the backend API and writes a
 * comprehensive sitemap.xml into the Vite public/ directory so it
 * is copied verbatim into the production build.
 *
 * This replaces the previous Vercel serverless-function approach,
 * avoiding cold-start issues, Hobby-plan timeout limits, and
 * framework/routing incompatibilities on Vercel.
 *
 * Usage:
 *   node scripts/generate-sitemap.js
 *
 * Called automatically before `vite build` via the `build` script
 * in package.json.
 */

const API_BASE = 'https://climb-pakistan-backend.onrender.com/api';
const SITE_URL = 'https://www.climbpakistan.com';
const OUTPUT_PATH = 'public/sitemap.xml';

import fs from 'fs';
import path from 'path';

// ---- helpers -------------------------------------------------------

async function fetchJSON(endpoint) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { signal: controller.signal });
    if (!res.ok) {
      console.warn(`[sitemap] ${endpoint} returned ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.warn(`[sitemap] failed to fetch ${endpoint}:`, err.message);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function w3cDate(date) {
  if (!date) return undefined;
  const d = new Date(date);
  return isNaN(d.getTime()) ? undefined : d.toISOString().split('.')[0] + '+00:00';
}

function xmlEscape(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlElement(loc, { lastmod, changefreq, priority } = {}) {
  const parts = [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
  ];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  parts.push('  </url>');
  return parts.join('\n');
}

// ---- main ----------------------------------------------------------

async function main() {
  console.log('[sitemap] Generating sitemap…');

  const [athletes, articles, competitions, learnSections, teamRankings] = await Promise.all([
    fetchJSON('/athletes'),
    fetchJSON('/news?status=Published'),
    fetchJSON('/competitions'),
    fetchJSON('/learn?status=Published'),
    fetchJSON('/team-rankings'),
  ]);

  const urls = [];

  // Derive lastmod for /rankings from the most recent team-ranking year
  let rankingsLastmod;
  if (teamRankings && typeof teamRankings === 'object') {
    const yearsWithData = Object.keys(teamRankings)
      .filter((y) => Array.isArray(teamRankings[y]) && teamRankings[y].length > 0)
      .sort((a, b) => Number(b) - Number(a));
    if (yearsWithData.length > 0) {
      rankingsLastmod = w3cDate(`${yearsWithData[0]}-12-31`);
    }
  }

  // Static pages
  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/news', priority: '0.9', changefreq: 'daily' },
    { loc: '/athletes', priority: '0.8', changefreq: 'weekly' },
    { loc: '/rankings', priority: '0.9', changefreq: 'weekly', lastmod: rankingsLastmod },
    { loc: '/competitions', priority: '0.8', changefreq: 'weekly' },
    { loc: '/learn', priority: '0.7', changefreq: 'monthly' },
    { loc: '/about', priority: '0.6', changefreq: 'monthly' },
    { loc: '/contact', priority: '0.5', changefreq: 'monthly' },
  ];
  for (const page of staticPages) {
    urls.push(urlElement(`${SITE_URL}${page.loc}`, page));
  }

  // Dynamic content
  for (const athlete of athletes) {
    urls.push(urlElement(`${SITE_URL}/athletes/${encodeURIComponent(athlete.slug)}`, {
      lastmod: w3cDate(athlete.updatedAt),
      changefreq: 'weekly',
      priority: '0.7',
    }));
  }
  for (const article of articles) {
    urls.push(urlElement(`${SITE_URL}/news/${encodeURIComponent(article.slug)}`, {
      lastmod: w3cDate(article.updatedAt || article.date),
      changefreq: 'monthly',
      priority: '0.6',
    }));
  }
  for (const comp of competitions) {
    urls.push(urlElement(`${SITE_URL}/competitions/${encodeURIComponent(comp.slug)}`, {
      lastmod: w3cDate(comp.updatedAt),
      changefreq: 'weekly',
      priority: '0.7',
    }));
  }
  for (const section of learnSections) {
    urls.push(urlElement(`${SITE_URL}/learn/${encodeURIComponent(section.slug)}`, {
      lastmod: w3cDate(section.updatedAt),
      changefreq: 'monthly',
      priority: '0.6',
    }));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.join('\n')}
</urlset>
`;

  // Write to public/ so Vite copies it into dist/
  const outPath = path.resolve(OUTPUT_PATH);
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outPath, xml, 'utf-8');
  console.log(`[sitemap] ✓ Written ${urls.length} URLs to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('[sitemap] Fatal error:', err);
  process.exit(1);
});
