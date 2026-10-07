import { defineConfig } from 'astro/config'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Versione dell'app mostrata nella pagina. Il branch `landing` non riceve i bump di
// release-please: la versione vera vive su `main`. Ordine: variabile d'ambiente (CI),
// `origin/main:package.json`, package.json della radice come ultima risorsa.
function appVersion() {
  if (process.env.PUBLIC_APP_VERSION) return process.env.PUBLIC_APP_VERSION
  try {
    const raw = execFileSync('git', ['show', 'origin/main:package.json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return JSON.parse(raw).version
  } catch {
    try {
      return JSON.parse(readFileSync('../package.json', 'utf8')).version
    } catch {
      return 'dev'
    }
  }
}

// Indirizzo e percorso arrivano dalla pipeline (actions/configure-pages): con il dominio
// di GitHub sono `https://savez.github.io` e `/bacco`; con un dominio personalizzato il
// percorso diventa `/` senza toccare niente qui.
export default defineConfig({
  site: process.env.SITE_URL || 'https://savez.github.io',
  base: process.env.BASE_PATH || '/bacco',
  output: 'static',
  trailingSlash: 'always',
  vite: {
    define: {
      'import.meta.env.PUBLIC_APP_VERSION': JSON.stringify(appVersion()),
    },
  },
})
