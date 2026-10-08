// Unica fonte dei dati della landing.
const repo = 'https://github.com/savez/bacco'

export const meta = {
  appName: 'Bacco',
  tagline: 'Ogni bottiglia che apri, nel tuo registro.',
  description:
    'PWA open source per vini e birre: il diario di quello che bevi, la cantina di casa e la wishlist di quello che vuoi provare. Offline, i dati restano sul telefono.',
  appUrl: 'https://bacco-8in8.onrender.com',
  githubUrl: repo,
  releasesUrl: `${repo}/releases`,
  contributingUrl: `${repo}/blob/main/CONTRIBUTING.md`,
  securityUrl: `${repo}/blob/main/SECURITY.md`,
  licenseUrl: `${repo}/blob/main/LICENSE`,
  issuesUrl: `${repo}/issues/new/choose`,
  authorHandle: '@savez',
  authorUrl: 'https://github.com/savez',
  supportUrl: 'https://buymeacoffee.com/goeokwihgz',
  version: import.meta.env.PUBLIC_APP_VERSION ?? 'dev',
}

// Livelli del punteggio: stessi testi dell'app (src/lib/rating.js su main).
export const ratingLevels = [
  { value: 1, label: 'Difettoso', description: 'Difetti evidenti: sentore di tappo, ossidazione eccessiva.' },
  { value: 2, label: 'Non armonico', description: 'Squilibrata o di qualità percepita inferiore.' },
  { value: 3, label: 'Piacevole', description: 'Gradevole, senza particolari lodi o critiche.' },
  { value: 4, label: 'Ottimo', description: "Tipica dello stile o dell'annata, sopra la media." },
  { value: 5, label: 'Memorabile', description: 'Da ricordare per complessità, eleganza o significato.' },
]
