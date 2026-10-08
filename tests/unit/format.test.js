import { describe, it, expect } from 'vitest'
import { toDateAndTime, fromDateAndTime, formatMove, kindLabel } from '../../src/lib/format.js'

describe('data e ora separate', () => {
  it('andata e ritorno conservano data e ora (al minuto)', () => {
    const iso = new Date(2026, 9, 7, 21, 35).toISOString()
    const { date, time } = toDateAndTime(iso)
    expect(date).toBe('2026-10-07')
    expect(time).toBe('21:35')
    expect(fromDateAndTime(date, time)).toBe(iso)
  })

  it('senza ora usa mezzogiorno', () => {
    expect(fromDateAndTime('2026-10-07', '')).toBe(new Date(2026, 9, 7, 12, 0).toISOString())
  })
})

describe('formatMove', () => {
  it('descrive ogni tipo di movimento della cantina', () => {
    expect(formatMove({ type: 'out', qty: 1 })).toBe('Uscita · 1 bottiglia')
    expect(formatMove({ type: 'in', qty: 1 })).toBe('Entrata · 1 bottiglia')
    expect(formatMove({ type: 'in', qty: 3 })).toBe('Entrata · 3 bottiglie')
    expect(formatMove({ type: 'adjust', from: 4, to: 3 })).toBe('Rettifica · da 4 a 3')
    expect(formatMove({ type: 'first' })).toBe('Prima registrazione')
  })
})

describe('kindLabel con vitigno', () => {
  const wine = { type: 'wine', subtype: 'Rosso', appellation: 'DOCG' }

  it('il vitigno prende il posto di "Vino"', () => {
    expect(kindLabel({ ...wine, grape: 'Nebbiolo' })).toBe('Nebbiolo · Rosso · DOCG')
    expect(kindLabel({ ...wine, grape: 'Nebbiolo' }, ' ')).toBe('Nebbiolo Rosso DOCG')
  })

  it('senza vitigno resta "Vino"', () => {
    expect(kindLabel(wine)).toBe('Vino · Rosso · DOCG')
    expect(kindLabel({ ...wine, grape: null }, ' ')).toBe('Vino Rosso DOCG')
  })

  it('la birra ignora il vitigno', () => {
    expect(kindLabel({ type: 'beer', subtype: 'IPA', grape: 'Nebbiolo' })).toBe('Birra · IPA')
  })
})
