import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base: '/fiscai/' solo in build, perché GitHub Pages serve il sito sotto questo sottopercorso
// (https://<utente>.github.io/fiscai/). In sviluppo locale (npm run dev) si resta sulla root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/fiscai/' : '/',
  plugins: [react()],
}))
