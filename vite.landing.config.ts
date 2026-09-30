import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// ── Landing/marketing site build ──────────────────────────────────────────
//
// Deliberately separate from vite.config.ts (the extension build). The
// marketing site is a standalone React app that ships nothing to the
// browser-extension bundle and shares no build inputs with it — only
// source under src/pages, src/components, src/data, src/config, src/styles.

export default defineConfig({
  plugins: [react()],
  base: './',

  build: {
    outDir: 'dist-landing',
    rollupOptions: {
      input: {
        landing: `${import.meta.dirname}/landing/index.html`,
      },
    },
  },

  resolve: {
    alias: {
      '@landing': `${import.meta.dirname}/src/landing`,
      '@components': `${import.meta.dirname}/src/components`,
      '@data': `${import.meta.dirname}/src/data`,
      '@config': `${import.meta.dirname}/src/config`,
      '@styles': `${import.meta.dirname}/src/styles`,
    },
  },
})
