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

function urlElement(loc, { lastmod, changefreq, priority, images } = {}) {
  const parts = [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
  ];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  // Google image sitemap extension — helps discovery via Google Images.
  if (images?.length) {
    for (const img of images) {
      parts.push('    <image:image>');
      parts.push(`      <image:loc>${xmlEscape(img.loc)}</image:loc>`);
      if (img.title) parts.push(`      <image:title>${xmlEscape(img.title)}</image:title>`);
      parts.push('    </image:image>');
    }
  }
  parts.push('  </url>');
  return parts.join('\n');
}

// Make an image URL absolute (sitemap loc values must be fully-qualified).
function absoluteUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ---- main ----------------------------------------------------------

async function main() {
  console.log('[sitemap] Generating sitemap…');

  const [athletes, articles, competitions, learnSections, teamRankings, rankings] = await Promise.all([
    fetchJSON('/athletes'),
    fetchJSON('/news?status=Published'),
    fetchJSON('/competitions'),
    fetchJSON('/learn?status=Published'),
    fetchJSON('/team-rankings'),
    fetchJSON('/rankings'),
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
    { loc: '/records', priority: '0.8', changefreq: 'weekly' },
    { loc: '/results', priority: '0.8', changefreq: 'weekly' },
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
      changefreq: 'weekly',
      priority: '0.8',
      images: article.imageUrl
        ? [{ loc: absoluteUrl(article.imageUrl), title: article.title }]
        : undefined,
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

  // ── Player ranking category/discipline/year combinations ──
  const rankData = rankings?.data || rankings;
  if (rankData) {
    const CATEGORIES = ['Men', 'Women'];
    const DISCIPLINES = ['Speed', 'Lead', 'Boulder'];
    for (const cat of CATEGORIES) {
      for (const disc of DISCIPLINES) {
        const years = rankData[cat]?.[disc] || {};
        for (const y of Object.keys(years)) {
          if (Array.isArray(years[y]) && years[y].length > 0) {
            urls.push(urlElement(
              `${SITE_URL}/rankings/${cat.toLowerCase()}/${disc.toLowerCase()}/${y}`,
              {
                lastmod: w3cDate(`${y}-12-31`),
                changefreq: 'weekly',
                priority: '0.7',
              }
            ));
          }
        }
      }
    }

    // ── Team ranking year pages ──
    const teamData = teamRankings?.data || teamRankings;
    if (teamData && typeof teamData === 'object') {
      for (const y of Object.keys(teamData)) {
        if (Array.isArray(teamData[y]) && teamData[y].length > 0) {
          urls.push(urlElement(
            `${SITE_URL}/rankings/teams/${y}`,
            {
              lastmod: w3cDate(`${y}-12-31`),
              changefreq: 'weekly',
              priority: '0.7',
            }
          ));
        }
      }
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
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
