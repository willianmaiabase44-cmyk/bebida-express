import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  // Ignora a pasta /server (backend próprio — não faz parte do bundle do frontend)
  server: {
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
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ]
});