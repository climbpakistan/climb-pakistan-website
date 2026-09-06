import { defineConfig } from 'vite'
import vike from 'vike/plugin'
import { vercel } from 'vite-plugin-vercel/vite'

// https://vite.dev/config/
// Only enable the Vercel output plugin during Vercel builds. Its
// @vercel/nft file-tracing spins forever on Windows (junction/glob bug in
// nft), so keep it off for local builds; Vercel CI sets VERCEL=1 and still
// produces .vercel/output exactly as before.
const plugins = [vike()];
if (process.env.VERCEL) plugins.push(vercel());

export default defineConfig({
  plugins,
  css: {
    transformer: 'lightningcss',
    // Pin conservative targets so lightningcss downlevels modern CSS — most
    // importantly it emits `@media (max-width: …)` instead of the newer range
    // syntax `(width <= …)`, which older mobile browsers (iOS Safari < 16.4,
    // Chrome < 104, Samsung Internet < 17) silently drop. Without this, ALL
    // responsive/mobile styles vanish on those browsers.
    lightningcss: {
      targets: {
        chrome: (80 << 16),
        edge: (80 << 16),
        firefox: (75 << 16),
        safari: (13 << 16),
      },
    },
  },
  build: {
    cssTarget: 'safari13',
  },
})
