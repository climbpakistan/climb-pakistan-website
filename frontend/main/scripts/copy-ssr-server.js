#!/usr/bin/env node

/**
 * Post-build step for the Vercel SSR function.
 *
 * Vike's pre-rendered pages ship as static files, but routes that did not
 * exist at build time (e.g. community profiles / posts created after deploy)
 * are server-side rendered at request time by the `vike_fetch` function.
 *
 * That function is a thin auto-importer (@brillout/vite-plugin-server-entry):
 * at runtime it resolves the real Vike server from `<cwd>/dist/server/entry.mjs`
 * (see crawlOutDir) and imports the per-page modules from there. @vercel/nft
 * (used by vite-plugin-vercel) cannot follow that runtime dynamic import()
 * graph, so the plugin never packages the server payload into the function —
 * `prerender.keepDistServer` only keeps `dist/server` on disk after the build,
 * it doesn't deploy it.
 *
 * Without the payload every non-pre-rendered route fails with:
 *   "The server production entry is missing." -> HTTP 500
 *
 * This script makes the deployed function self-contained:
 *   1. traces `dist/server/entry.mjs` with @vercel/nft to get the complete
 *      server runtime graph (dist/server files + the node_modules packages
 *      the server chunks import, e.g. vike, react, react-dom),
 *   2. copies every traced file into `.vercel/output/functions/vike_fetch_*.func/`
 *      preserving the layout relative to the project root, and
 *   3. copies the `dist/assets.json` manifest the server needs to resolve
 *      client asset URLs.
 *
 * Safe to run on non-Vercel builds: it is a no-op when the Vercel output or
 * the source `dist/server` directory are missing.
 *
 * Usage:
 *   node scripts/copy-ssr-server.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeFileTrace } from '@vercel/nft';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distServer = path.join(projectRoot, 'dist', 'server');
const distAssetsJson = path.join(projectRoot, 'dist', 'assets.json');
const functionsDir = path.join(projectRoot, '.vercel', 'output', 'functions');
const serverEntry = path.join(distServer, 'entry.mjs');

function copyFile(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function toRelPath(rel) {
  return rel.replace(/\\/g, '/');
}

async function traceFiles() {
  if (!fs.existsSync(serverEntry)) return [];
  const { fileList } = await nodeFileTrace([serverEntry], {
    base: projectRoot,
    processCwd: projectRoot,
  });
  if (!fileList) return [];
  if (typeof fileList[Symbol.iterator] === 'function') return [...fileList].map(toRelPath);
  return Object.keys(fileList).map(toRelPath);
}

async function patch(files) {
  const funcDirs = fs.existsSync(functionsDir)
    ? fs.readdirSync(functionsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && d.name.startsWith('vike_fetch_'))
        .map((d) => path.join(functionsDir, d.name))
    : [];

  if (funcDirs.length === 0) {
    console.warn('[copy-ssr-server] No vike_fetch function found; nothing to patch.');
    return;
  }
  if (!fs.existsSync(distServer)) {
    console.warn('[copy-ssr-server] dist/server not found; nothing to patch.');
    return;
  }

  for (const funcDir of funcDirs) {
    let copiedCount = 0;
    for (const rel of files) {
      // Sanity: only ship files that live under dist/ or node_modules/.
      if (!rel.startsWith('dist/') && !rel.startsWith('node_modules/')) continue;
      const src = path.join(projectRoot, ...rel.split('/'));
      if (!fs.existsSync(src)) continue;
      if (copyFile(src, path.join(funcDir, ...rel.split('/')))) copiedCount++;
    }
    const assetsCopied = copyFile(distAssetsJson, path.join(funcDir, 'dist', 'assets.json'));
    console.log(
      `[copy-ssr-server] ${funcDir}: traced ${files.length} files, copied ${copiedCount} (dist/server + node_modules); ` +
      `dist/assets.json ${assetsCopied ? 'copied' : 'missing'}`
    );
  }
}

const files = await traceFiles();
await patch(files);