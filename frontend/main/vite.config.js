import { defineConfig } from 'vite'
import vike from 'vike/plugin'
import { vercel } from 'vite-plugin-vercel/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vike(), vercel()],
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
