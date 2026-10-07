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

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
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
