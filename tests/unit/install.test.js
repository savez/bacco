import { describe, it, expect, vi } from 'vitest'
import { installPlan, shouldShowInstallInvite } from '../../src/lib/install.js'

describe('installPlan', () => {
  it('con l’invito nativo del browser basta il pulsante "Installa"', () => {
    expect(installPlan({ os: 'android', browser: 'Chrome' }, true)).toEqual({ mode: 'prompt' })
    expect(installPlan({ os: 'windows', browser: 'Edge' }, true)).toEqual({ mode: 'prompt' })
  })

  it('iPhone e iPad: Condividi → Aggiungi alla schermata Home, con la nota sui 7 giorni', () => {
    const plan = installPlan({ os: 'ios', browser: 'Safari' }, false)
    expect(plan.mode).toBe('steps')
    expect(plan.steps.join(' ')).toContain('Aggiungi alla schermata Home')
    expect(plan.note).toContain('7 giorni')
  })

  it('Safari su Mac: Aggiungi al Dock', () => {
    expect(installPlan({ os: 'mac', browser: 'Safari' }, false).steps.join(' ')).toContain('Aggiungi al Dock')
  })

  it('Android senza invito nativo: dal menu del browser', () => {
    expect(installPlan({ os: 'android', browser: 'Firefox' }, false).steps.join(' ')).toContain('Installa app')
  })

  it('browser che non installano PWA (Firefox sul computer): nessun invito', () => {
    expect(installPlan({ os: 'windows', browser: 'Firefox' }, false)).toBeNull()
    expect(installPlan({ os: 'mac', browser: 'Firefox' }, false)).toBeNull()
  })
})

describe('shouldShowInstallInvite', () => {
  // In Node non c'è `window`: simula un browser in cui Bacco non è installata.
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }), navigator: {} })
  const now = new Date('2026-10-07T12:00:00Z')

  it('mai rifiutato: si mostra', () => {
    expect(shouldShowInstallInvite({ dismissedAt: null, now })).toBe(true)
  })

  it('"Non ora" da meno di 30 giorni: non si mostra; da più di 30: sì', () => {
    expect(shouldShowInstallInvite({ dismissedAt: '2026-09-20T12:00:00Z', now })).toBe(false)
    expect(shouldShowInstallInvite({ dismissedAt: '2026-08-01T12:00:00Z', now })).toBe(true)
  })
})

describe('shouldShowInstallInvite con Bacco già installata', () => {
  it('non si mostra mai', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }), navigator: {} })
    expect(shouldShowInstallInvite({ dismissedAt: null })).toBe(false)
  })
})
