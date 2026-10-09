import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { showBanner, dismissBanner, useBanner } from '../../src/composables/useBanner.js'

const { current } = useBanner()

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  while (current.value) dismissBanner(current.value.id)
  vi.useRealTimers()
})

describe('showBanner', () => {
  it('una conferma è "success" e sparisce da sola dopo 3 secondi', () => {
    showBanner({ id: 'ok', message: 'Bottiglia salvata' })
    expect(current.value).toMatchObject({ id: 'ok', tone: 'success', timeout: 3000 })
    vi.advanceTimersByTime(2999)
    expect(current.value?.id).toBe('ok')
    vi.advanceTimersByTime(1)
    expect(current.value).toBeNull()
  })

  it('un messaggio con azioni resta finché non si sceglie', () => {
    showBanner({ id: 'upd', message: 'Nuova versione disponibile.', tone: 'info', actions: [{ label: 'Aggiorna', onClick() {} }] })
    expect(current.value.timeout).toBeUndefined()
    vi.advanceTimersByTime(60000)
    expect(current.value?.id).toBe('upd')
  })

  it('rispetta una durata esplicita (Annulla dopo Stappa)', () => {
    showBanner({ id: 'cellar-op', message: 'Stappata 1 bottiglia', timeout: 8000, actions: [{ label: 'Annulla', onClick() {} }] })
    vi.advanceTimersByTime(7999)
    expect(current.value?.id).toBe('cellar-op')
    vi.advanceTimersByTime(1)
    expect(current.value).toBeNull()
  })

  it('un errore resta finché non si chiude', () => {
    showBanner({ id: 'err', message: 'Impossibile salvare', tone: 'error', priority: 100 })
    expect(current.value.timeout).toBeUndefined()
    vi.advanceTimersByTime(60000)
    expect(current.value?.id).toBe('err')
    dismissBanner('err')
    expect(current.value).toBeNull()
  })

  it('mostra prima il messaggio più importante e poi quello in coda', () => {
    showBanner({ id: 'ok', message: 'Bottiglia salvata', priority: 30 })
    showBanner({ id: 'err', message: 'Errore', tone: 'error', priority: 100 })
    expect(current.value.id).toBe('err')
    dismissBanner('err')
    expect(current.value.id).toBe('ok')
  })
})
