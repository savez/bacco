// Invito all'installazione (FR-020, research.md R6). Mai bloccante.

let deferredPrompt

/** Da chiamare in main.js, prima del mount, per non perdere l'evento del browser. */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event
  })
}

/** @returns {boolean} true se l'app è già stata installata (standalone). */
export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  )
}


/** @returns {boolean} true se il browser supporta l'invito automatico (Chromium/Android). */
export function canPromptInstall() {
  return !!deferredPrompt
}

/** Mostra l'invito nativo del browser (solo se canPromptInstall() è vero). */
export async function promptInstall() {
  if (!deferredPrompt) return
  await deferredPrompt.prompt()
  deferredPrompt = null
}

/**
 * @param {{dismissedAt: string|null, now?: Date}} params
 */
export function shouldShowInstallInvite({ dismissedAt, now = new Date() }) {
  if (isStandalone()) return false
  if (!dismissedAt) return true
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
  return now.getTime() - new Date(dismissedAt).getTime() > THIRTY_DAYS_MS
}

/**
 * Come proporre l'installazione su questa piattaforma.
 * - `prompt`: il browser ha un invito nativo, basta un pulsante "Installa";
 * - `steps`: istruzioni a mano (iPhone/iPad, Safari su Mac, altri browser Android);
 * - `null`: il browser non sa installare PWA (es. Firefox sul computer): niente invito.
 * @param {{os: string, browser: string}} platform da detectPlatform()
 * @param {boolean} canPrompt
 * @returns {{mode: 'prompt'} | {mode: 'steps', steps: string[], note?: string} | null}
 */
export function installPlan({ os, browser }, canPrompt) {
  if (canPrompt) return { mode: 'prompt' }
  if (os === 'ios') {
    return {
      mode: 'steps',
      steps: [
        'Tocca Condividi, il quadrato con la freccia verso l’alto.',
        'Scorri e scegli «Aggiungi alla schermata Home».',
        'Conferma con «Aggiungi».',
      ],
      note: 'Installata, Bacco protegge meglio i tuoi dati: Safari può cancellare quelli dei siti non aperti da 7 giorni.',
    }
  }
  if (os === 'android') {
    return {
      mode: 'steps',
      steps: ['Apri il menu del browser (⋮ o ≡).', 'Scegli «Installa app» o «Aggiungi alla schermata Home».'],
    }
  }
  if (os === 'mac' && browser === 'Safari') {
    return { mode: 'steps', steps: ['Nella barra dei menu apri «File».', 'Scegli «Aggiungi al Dock».'] }
  }
  if (browser === 'Chrome' || browser === 'Edge') {
    return {
      mode: 'steps',
      steps: ['Clicca l’icona di installazione a destra nella barra degli indirizzi, oppure apri il menu e scegli «Installa Bacco».'],
    }
  }
  return null
}
