import { ref, watch } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { showBanner } from './useBanner.js'

// Stato condiviso tra App.vue (registrazione) e Impostazioni (controllo manuale).
// 'idle' | 'checking' | 'updating' | 'up-to-date' | 'unavailable' | 'error'
const updateCheckStatus = ref('idle')
let registration = null
let applyUpdate = null
let manualCheck = false
let manualTimeout = null

const UPDATE_INTERVAL_MS = 60 * 60 * 1000
// Tempo massimo per scaricare e installare la nuova versione dopo un controllo manuale.
const INSTALL_TIMEOUT_MS = 30 * 1000

/**
 * Registra il service worker (una sola volta, qui) ed espone i banner di
 * aggiornamento/pronto-offline. Chiamato da App.vue, quindi attivo fin dal primo
 * avvio dell'app (non solo da US7): l'offline di US1 dipende da questa registrazione.
 */
export function usePwaUpdate() {
  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, r) {
      registration = r ?? null
      if (!registration) return
      // Controlla periodicamente e ogni volta che l'app torna in primo piano: una PWA
      // installata e sempre aperta altrimenti resterebbe indietro.
      setInterval(() => registration.update().catch(() => {}), UPDATE_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {})
      })
    },
  })
  applyUpdate = () => updateServiceWorker(true)

  watch(needRefresh, (value) => {
    if (!value) return
    // Controllo chiesto dall'utente: la nuova versione si applica subito (ricarica l'app).
    if (manualCheck) {
      clearTimeout(manualTimeout)
      applyUpdate()
      return
    }
    showBanner({
      id: 'pwa-update',
      message: 'Nuova versione disponibile.',
      actions: [{ label: 'Aggiorna', onClick: applyUpdate }],
      priority: 40,
    })
  })

  watch(offlineReady, (value) => {
    if (value) {
      showBanner({
        id: 'pwa-offline-ready',
        message: 'Bacco è pronto per funzionare offline.',
        priority: 20,
      })
    }
  })
}

/**
 * Controllo manuale (Impostazioni): chiede al server se c'è un nuovo service worker.
 * Se c'è, lo installa e ricarica l'app; se ce n'è già uno in attesa lo applica subito.
 */
export async function checkForUpdate() {
  if (!registration) {
    updateCheckStatus.value = 'unavailable'
    return
  }
  updateCheckStatus.value = 'checking'
  try {
    if (registration.waiting) {
      updateCheckStatus.value = 'updating'
      applyUpdate?.()
      return
    }
    await registration.update()
    if (registration.installing || registration.waiting) {
      updateCheckStatus.value = 'updating'
      manualCheck = true
      // `needRefresh` diventa vero a installazione finita e applica l'aggiornamento.
      if (registration.waiting) applyUpdate?.()
      manualTimeout = setTimeout(() => {
        manualCheck = false
        updateCheckStatus.value = 'error'
      }, INSTALL_TIMEOUT_MS)
    } else {
      updateCheckStatus.value = 'up-to-date'
    }
  } catch {
    updateCheckStatus.value = 'error'
  }
}

export function useUpdateCheck() {
  return { updateCheckStatus, checkForUpdate }
}
