import { defineConfig } from 'vite'
import vike from 'vike/plugin'
import { vercel } from 'vite-plugin-vercel/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vike(), vercel()],
})
