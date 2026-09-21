// ============================================================
// vite.config.local.js — Configuração Vite STANDALONE
// ============================================================
// Use este arquivo no Trae IDE / VS Code (ambiente local).
// Não depende do @base44/vite-plugin.
//
// COMO USAR:
//   1. Substitua vite.config.js por este arquivo:
//      cp vite.config.local.js vite.config.js
//   2. Instale as dependências:
//      npm install
//   3. Rode o dev server:
//      npm run dev
// ============================================================

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  logLevel: 'error',
  server: {
    proxy: {
      '/server-api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/server-api/, '/api'),
      },
    },
    watch: {
      ignored: ['**/server/**'],
    },
  },
  optimizeDeps: {
    entries: ['src/**/*.{js,jsx,ts,tsx}'],
    exclude: ['server'],
  },
  plugins: [
    // Bloqueia o Vite de processar qualquer arquivo da pasta /server (backend próprio)
    {
      name: 'exclude-server-dir',
      enforce: 'pre',
      resolveId(id, importer) {
        if (id.includes('/server/') || (importer && importer.includes('/server/'))) {
          return { id: '\0virtual:server-excluded', external: false };
        }
      },
      load(id) {
        if (id === '\0virtual:server-excluded' || id.includes('/server/')) {
          return 'export default {}';
        }
      },
    },
    react(),
  ]
});