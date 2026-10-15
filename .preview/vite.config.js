// Preview-only: serves the app with sample data instead of the live Supabase project.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const root = path.resolve(__dirname, '..')
const mock = path.resolve(__dirname, 'mock-supabase.js')

export default defineConfig({
  root,
  plugins: [react(), {
    name: 'mock-supabase',
    enforce: 'pre',
    resolveId(id, importer) {
      if (!importer || importer === mock) return null
      if (/(^|\/)supabase(\.js)?$/.test(id) && id.startsWith('.')) {
        const p = path.resolve(path.dirname(importer), id)
        if (p.replace(/\.js$/, '') === path.join(root, 'src/supabase')) return mock
      }
      return null
    },
  }],
  server: { port: 5199, strictPort: true },
})
