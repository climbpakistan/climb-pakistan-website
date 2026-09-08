#!/usr/bin/env node

/**
 * Build-time patch for .vercel/output/config.json.
 *
 * The Vite/Vike serverless build sends every unmatched request to the SSR
 * function (catch-all `{ src: "^(.*)$", dest: "/vike_fetch_*", check: true }`).
 * If that function cannot render the Vike `_error` page, unmatched URLs bubble
 * up as a generic HTTP 500.
 *
 * This script replaces the catch-all with:
 *   1. `check: true` routes for the dynamic SSR prefixes (community, athletes,
 *      news, competitions, learn, rankings) so existing server-rendered routes,
 *      trailing-slash variants, and error pages keep working exactly as before;
 *   2. a final `{ src: "/(.*)", dest: "/404.html", status: 404 }` fallback so any
 *      other unmatched URL returns the pre-rendered site 404 page with HTTP 404
 *      instead of a 500.
 *
 * Route order matters: the filesystem handler stays first, the ordered SSR
 * prefix routes come second (each still serving pre-rendered static files), and
 * the static 404 fallback is last so it never shadows a valid route.
 *
 * Usage:
 *   node scripts/fix-vercel-404.js
 *
 * Run as the final step of the Vercel buildCommand, after `vike build`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '..', '.vercel', 'output', 'config.json');

// Dynamic SSR prefixes that must keep hitting the SSR function. Everything else
// that is not a pre-rendered static page should fall through to the 404.html.
const SSR_PREFIXES = ['/community', '/athletes', '/news', '/competitions', '/learn', '/rankings'];

function main() {
  if (!fs.existsSync(configPath)) {
    console.warn('[fix-vercel-404] .vercel/output/config.json not found; nothing to patch.');
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const routes = config.routes;
  if (!Array.isArray(routes)) {
    console.warn('[fix-vercel-404] .vercel/output/config.json has no routes array; nothing to patch.');
    return;
  }

  // Idempotence guard: if the 404 fallback is already present, bail out.
  if (routes.some((r) => r.dest === '/404.html' && r.status === 404)) {
    console.warn('[fix-vercel-404] 404 fallback already configured; skipping.');
    return;
  }

  const catchAllIndex = routes.findIndex(
    (r) => r.src === '^(.*)$' && typeof r.dest === 'string' && r.dest.startsWith('/vike_fetch_')
  );
  if (catchAllIndex === -1) {
    console.warn('[fix-vercel-404] SSR catch-all route not found; skipping.');
    return;
  }

  const functionName = routes[catchAllIndex].dest;

  const ssrRoutes = SSR_PREFIXES.map((prefix) => ({
    src: `^${prefix}(?:/.*)?$`,
    dest: functionName,
    check: true,
  }));
  const notFoundRoute = {
    src: '/(.*)',
    dest: '/404.html',
    status: 404,
  };

  routes.splice(catchAllIndex, 1, ...ssrRoutes, notFoundRoute);

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
  console.log(`[fix-vercel-404] Patched ${configPath} (added ${ssrRoutes.length} SSR prefix routes + 404.html fallback).`);
}

main();