import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Vedi specs/001-bottle-logging/research.md (R5, R14) per le motivazioni di queste scelte.
export default defineConfig({
  // Versione mostrata in Impostazioni.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        name: 'Bacco',
        short_name: 'Bacco',
        lang: 'it',
        description: 'Il tuo registro di vini e birre',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        background_color: '#1C1613',
        theme_color: '#1C1613',
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    // Con Docker su macOS gli eventi del file system non arrivano sempre al container:
    // senza polling Vite continuerebbe a servire la versione vecchia dei file.
    watch: process.env.VITE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
  },
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.js'],
  },
})
