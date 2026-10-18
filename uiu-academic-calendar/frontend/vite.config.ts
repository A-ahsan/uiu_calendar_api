import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildTerms, PROGRAMS } from './src/utils/calendar'
import { buildTermIcs, buildProgramIcs } from './src/utils/ics'

// Subscription feeds: /ics/<term-id>.ics (one trimester) and /ics/<program>.ics (every trimester of a program).
// They're rebuilt on every deploy, so the weekly calendars.json update reaches subscribed phones by itself.
function icsFeeds(): Plugin {
  const feeds = () => {
    const raw = JSON.parse(readFileSync(fileURLToPath(new URL('./public/calendars.json', import.meta.url)), 'utf8'))
    const terms = buildTerms(Array.isArray(raw) ? raw : raw.data || [])
    const files: Record<string, string> = {}
    for (const t of terms) files[`ics/${t.id}.ics`] = buildTermIcs(t)
    for (const p of PROGRAMS) if (terms.some(t => t.program === p.id)) files[`ics/${p.id}.ics`] = buildProgramIcs(terms, p.id)
    return files
  }
  return {
    name: 'ics-feeds',
    generateBundle() {
      const files = feeds()
      for (const [fileName, source] of Object.entries(files)) this.emitFile({ type: 'asset', fileName, source })
      console.log(`ics-feeds: wrote ${Object.keys(files).length} calendar feeds`)
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = req.url?.match(/^\/ics\/([a-z0-9-]+\.ics)/)
        const file = m && feeds()[`ics/${m[1]}`]
        if (!file) return next()
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
        res.end(file)
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), icsFeeds()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
