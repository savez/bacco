import { setSetting } from '../db/settings.js'

const STORAGE_KEY = 'bacco-theme'

/** @returns {'system'|'light'|'dark'} */
export function getThemePreference() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // localStorage non disponibile: si resta sul default.
  }
  return 'system'
}

/** @param {'system'|'light'|'dark'} pref */
export async function setThemePreference(pref) {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // Non bloccante: la preferenza vale comunque per la sessione corrente.
  }
  applyTheme(pref)
  await setSetting('theme', pref)
}

let mediaQuery
let mediaListener

/** @param {'system'|'light'|'dark'} pref */
export function applyTheme(pref) {
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener('change', mediaListener)
    mediaQuery = undefined
    mediaListener = undefined
  }

  const wantsDark = () =>
    pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  document.documentElement.classList.toggle('dark', wantsDark())

  if (pref === 'system') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaListener = () => document.documentElement.classList.toggle('dark', wantsDark())
    mediaQuery.addEventListener('change', mediaListener)
  }
}
