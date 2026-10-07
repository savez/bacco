import { describe, it, expect } from 'vitest'
import { normalizeText, filterBottles, groupByMonth, availableYears, availableMonths } from '../../src/lib/search.js'

describe('normalizeText', () => {
  it('rimuove accenti e porta in minuscolo', () => {
    expect(normalizeText("Nebbiolo d'Alba")).toBe("nebbiolo d'alba")
    expect(normalizeText('Peró')).toBe('pero')
  })
})

const bottle = (overrides) => ({
  id: crypto.randomUUID(),
  name: 'Barolo Cannubi',
  producer: 'Borgogno',
  type: 'wine',
  consumedAt: new Date().toISOString(),
  rating: 4,
  ...overrides,
})

describe('filterBottles', () => {
  const list = [
    bottle({ name: 'Barolo Cannubi', producer: 'Borgogno', type: 'wine' }),
    bottle({ name: 'Tipopils', producer: 'Birrificio Italiano', type: 'beer' }),
  ]

  it('filtra per testo su nome o produttore', () => {
    expect(filterBottles(list, { query: 'baro' })).toHaveLength(1)
    expect(filterBottles(list, { query: 'birrificio' })).toHaveLength(1)
    expect(filterBottles(list, { query: 'xyz' })).toHaveLength(0)
  })

  it('filtra per tipo', () => {
    expect(filterBottles(list, { type: 'wine' })).toHaveLength(1)
    expect(filterBottles(list, { type: 'beer' })).toHaveLength(1)
  })

  it('senza filtri restituisce tutto', () => {
    expect(filterBottles(list, {})).toHaveLength(2)
  })

  it('combina testo e tipo', () => {
    expect(filterBottles(list, { query: 'baro', type: 'beer' })).toHaveLength(0)
  })
})

describe('groupByMonth', () => {
  it('raggruppa rispettando l\'ordine di arrivo (il chiamante ordina in modo discendente)', () => {
    const list = [
      bottle({ consumedAt: '2026-10-05T10:00:00.000Z' }),
      bottle({ consumedAt: '2026-10-01T10:00:00.000Z' }),
      bottle({ consumedAt: '2026-09-15T10:00:00.000Z' }),
    ]
    const groups = groupByMonth(list)
    expect(groups).toHaveLength(2)
    expect(groups[0].key).toBe('2026-10')
    expect(groups[0].items).toHaveLength(2)
    expect(groups[1].key).toBe('2026-09')
  })
})

describe('prestazioni', () => {
  it('filtra 1000 bottiglie in meno di 50ms', () => {
    const list = Array.from({ length: 1000 }, (_, i) => bottle({ name: `Vino ${i}` }))
    const start = performance.now()
    filterBottles(list, { query: 'vino 5' })
    expect(performance.now() - start).toBeLessThan(50)
  })
})

describe('filtri per periodo', () => {
  // Date costruite in ora locale, come le confronta il filtro.
  const at = (y, m, d) => new Date(y, m - 1, d, 20, 0).toISOString()
  const list = [
    bottle({ consumedAt: at(2026, 10, 5) }),
    bottle({ consumedAt: at(2026, 3, 1) }),
    bottle({ consumedAt: at(2025, 10, 20) }),
  ]

  it('filtra per anno, per mese e per entrambi', () => {
    expect(filterBottles(list, { year: 2026 })).toHaveLength(2)
    expect(filterBottles(list, { month: 10 })).toHaveLength(2)
    expect(filterBottles(list, { year: 2026, month: 10 })).toHaveLength(1)
    expect(filterBottles(list, { year: 2024 })).toHaveLength(0)
  })

  it('elenca anni e mesi presenti', () => {
    expect(availableYears(list)).toEqual([2026, 2025])
    expect(availableMonths(list)).toEqual([3, 10])
    expect(availableMonths(list, 2025)).toEqual([10])
  })
})
