import { describe, it, expect } from 'vitest'
import { shouldShowBackupReminder } from '../../src/lib/backupReminder.js'

const now = new Date('2026-10-07T12:00:00.000Z')
const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

describe('shouldShowBackupReminder', () => {
  it('non mostra nulla con il registro vuoto', () => {
    expect(
      shouldShowBackupReminder({ bottleCount: 0, lastExportAt: null, firstUseAt: daysAgo(40), snoozedAt: null, now }),
    ).toBe(false)
  })

  it('mostra il promemoria se non è mai stato fatto un backup e sono passati più di 30 giorni dal primo uso', () => {
    expect(
      shouldShowBackupReminder({ bottleCount: 3, lastExportAt: null, firstUseAt: daysAgo(31), snoozedAt: null, now }),
    ).toBe(true)
  })

  it('non mostra nulla se il primo uso risale a meno di 30 giorni fa', () => {
    expect(
      shouldShowBackupReminder({ bottleCount: 3, lastExportAt: null, firstUseAt: daysAgo(29), snoozedAt: null, now }),
    ).toBe(false)
  })

  it('non mostra nulla se l\'ultimo backup risale a 29 giorni fa', () => {
    expect(
      shouldShowBackupReminder({
        bottleCount: 3,
        lastExportAt: daysAgo(29),
        firstUseAt: daysAgo(90),
        snoozedAt: null,
        now,
      }),
    ).toBe(false)
  })

  it('mostra il promemoria se l\'ultimo backup risale a 31 giorni fa', () => {
    expect(
      shouldShowBackupReminder({
        bottleCount: 3,
        lastExportAt: daysAgo(31),
        firstUseAt: daysAgo(90),
        snoozedAt: null,
        now,
      }),
    ).toBe(true)
  })

  it('non mostra nulla se rinviato di recente', () => {
    expect(
      shouldShowBackupReminder({
        bottleCount: 3,
        lastExportAt: daysAgo(90),
        firstUseAt: daysAgo(120),
        snoozedAt: daysAgo(2),
        now,
      }),
    ).toBe(false)
  })

  it('torna a mostrarlo se sono passati più di 30 giorni anche dal rinvio', () => {
    expect(
      shouldShowBackupReminder({
        bottleCount: 3,
        lastExportAt: daysAgo(90),
        firstUseAt: daysAgo(120),
        snoozedAt: daysAgo(31),
        now,
      }),
    ).toBe(true)
  })
})
