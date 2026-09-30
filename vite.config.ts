import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// ── Build architecture ────────────────────────────────────────────────────
//
// Five outputs land in /dist:
//
//   index.html + assets/main.js
//     The popup React app. Chrome shows this when you click the extension icon.
//
//   background.js
//     The background service worker. Runs as an ES module (type: "module"
//     in manifest). Handles wallet logic, signing, and approval flow.
//
//   contentScript.js
//     Injected into every tab by Chrome (see manifest content_scripts).
//     Runs in Chrome's "isolated world" — has access to chrome.* APIs
//     but shares the page DOM. Its only job is to inject injectProvider.js
//     and bridge postMessage ↔ chrome.runtime.sendMessage.
//
//   injectProvider.js
//     Injected by contentScript.js into the page's MAIN JavaScript world.
//     Creates window.ethereum that dApps call directly.
//     Must be a self-contained IIFE (no imports) because it runs in the
//     page context, not the extension context.

export default defineConfig({
  plugins: [react()],
  base: './',  // relative paths so extension can load local files

  build: {
    outDir: 'dist',
    // Use relative asset paths so index.html works as a local file
    // inside the extension (no server, no absolute /assets/ paths).
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main:           `${import.meta.dirname}/index.html`,
        background:     `${import.meta.dirname}/src/background/index.ts`,
        contentScript:  `${import.meta.dirname}/src/content/contentScript.ts`,
        injectProvider: `${import.meta.dirname}/src/content/injectProvider.ts`,
      },
      output: {
        // Entry points: flat names for the three scripts Chrome loads by name.
        // The popup bundle goes into assets/ with a stable (non-hashed) name.
        entryFileNames: (chunk) => {
          const flat = ['background', 'contentScript', 'injectProvider']
          return flat.includes(chunk.name) ? `${chunk.name}.js` : 'assets/[name].js'
        },
        // Shared chunks get stable names too — so background.js imports
        // don't break across rebuilds.
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },

  resolve: {
    alias: {
      '@core':       `${import.meta.dirname}/src/core`,
      '@state':      `${import.meta.dirname}/src/state`,
      '@ui':         `${import.meta.dirname}/src/ui`,
      '@background': `${import.meta.dirname}/src/background`,
    },
  },
})
