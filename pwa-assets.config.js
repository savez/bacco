import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Icone PWA da public/icons/icon.svg. L'SVG ha già fondo pieno e margini per la safe
// zone maskable: niente padding aggiunto (che lascerebbe bordi chiari).
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#1C1613' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#1C1613' } },
  },
  images: ['public/icons/icon.svg'],
})
