import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

// Finto `useRegisterSW`: espone la registrazione al codice e permette di simulare `needRefresh`.
let needRefresh = ref(false)
const updateServiceWorker = vi.fn()
let registration
vi.mock('virtual:pwa-register/vue', () => ({
  useRegisterSW: ({ onRegisteredSW }) => {
    onRegisteredSW('/sw.js', registration)
    return { needRefresh, offlineReady: ref(false), updateServiceWorker }
  },
}))

async function setup(reg) {
  vi.resetModules()
  registration = reg
  // Un ref nuovo per ogni test: i moduli dei test precedenti osservano ancora quello vecchio.
  needRefresh = ref(false)
  updateServiceWorker.mockClear()
  const mod = await import('../../src/composables/usePwaUpdate.js')
  if (reg !== undefined) mod.usePwaUpdate()
  return mod
}

// I test girano in Node: bastano gli eventi di visibilità e timer finti per il controllo orario.
vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: vi.fn() })

describe('controllo manuale degli aggiornamenti', () => {
  beforeEach(() => vi.useFakeTimers())

  it('senza service worker registrato il controllo non è disponibile', async () => {
    const { checkForUpdate, useUpdateCheck } = await setup(undefined)
    await checkForUpdate()
    expect(useUpdateCheck().updateCheckStatus.value).toBe('unavailable')
  })

  it('nessuna nuova versione: "già aggiornata"', async () => {
    const reg = { installing: null, waiting: null, update: vi.fn().mockResolvedValue() }
    const { checkForUpdate, useUpdateCheck } = await setup(reg)
    await checkForUpdate()
    expect(reg.update).toHaveBeenCalled()
    expect(useUpdateCheck().updateCheckStatus.value).toBe('up-to-date')
    expect(updateServiceWorker).not.toHaveBeenCalled()
  })

  it('nuova versione trovata: la installa e la applica subito', async () => {
    const reg = { installing: null, waiting: null }
    reg.update = vi.fn(async () => {
      reg.installing = {}
    })
    const { checkForUpdate, useUpdateCheck } = await setup(reg)
    await checkForUpdate()
    expect(useUpdateCheck().updateCheckStatus.value).toBe('updating')
    // Installazione finita: vite-plugin-pwa segnala needRefresh.
    needRefresh.value = true
    await nextTick()
    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('versione già in attesa: la applica senza scaricare di nuovo', async () => {
    const reg = { installing: null, waiting: {}, update: vi.fn() }
    const { checkForUpdate, useUpdateCheck } = await setup(reg)
    await checkForUpdate()
    expect(reg.update).not.toHaveBeenCalled()
    expect(updateServiceWorker).toHaveBeenCalledWith(true)
    expect(useUpdateCheck().updateCheckStatus.value).toBe('updating')
  })

  it('errore di rete: stato di errore', async () => {
    const reg = { installing: null, waiting: null, update: vi.fn().mockRejectedValue(new Error('offline')) }
    const { checkForUpdate, useUpdateCheck } = await setup(reg)
    await checkForUpdate()
    expect(useUpdateCheck().updateCheckStatus.value).toBe('error')
  })

  it('aggiornamento trovato in automatico (senza controllo manuale): mostra il banner, non ricarica', async () => {
    const reg = { installing: null, waiting: null, update: vi.fn().mockResolvedValue() }
    await setup(reg)
    const { useBanner } = await import('../../src/composables/useBanner.js')
    needRefresh.value = true
    await nextTick()
    expect(updateServiceWorker).not.toHaveBeenCalled()
    expect(useBanner().current.value?.id).toBe('pwa-update')
  })
})
