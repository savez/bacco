// Nota: l'export map di @fontsource vuole il percorso SENZA estensione .css
// (l'aggiunge da sé), altrimenti Rollup non lo risolve in build.
import '@fontsource/big-shoulders-stencil-display/latin-700'
import '@fontsource/atkinson-hyperlegible-next/latin-400'
import '@fontsource/atkinson-hyperlegible-next/latin-700'
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router.js'
import { applyTheme, getThemePreference } from './lib/theme.js'
import { requestPersistentStorage, openDatabase } from './db/db.js'
import { getSetting, setSetting } from './db/settings.js'
import { captureInstallPrompt } from './lib/install.js'

applyTheme(getThemePreference())
requestPersistentStorage()
openDatabase()
captureInstallPrompt()

getSetting('firstUseAt').then((value) => {
  if (!value) setSetting('firstUseAt', new Date().toISOString())
})

if (import.meta.env.DEV) {
  import('./dev/seed.js')
}

createApp(App).use(router).mount('#app')
