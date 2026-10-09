import { describe, it, expect } from 'vitest'
import { WINE_SUBTYPES, BEER_SUBTYPES } from '../../src/lib/subtypes.js'
import { normalizeText, filterBottles, groupByMonth, availableYears, availableMonths, cellarSummary, filterWishes, availableSubtypes } from '../../src/lib/search.js'

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

describe('filtri Punteggio e Gradazione', () => {
  const list = [
    bottle({ name: 'Barolo', rating: 5, abv: 14.5 }),
    bottle({ name: 'Dolcetto', rating: 3, abv: 13 }),
    bottle({ name: 'Tipopils', type: 'beer', rating: 4, abv: 5.2 }),
    bottle({ name: 'Senza gradazione', rating: 4 }),
    bottle({ name: 'In cantina', tastedAt: null, rating: null, abv: 13.5, cellarCount: 2 }),
  ]
  const names = (filters) => filterBottles(list, filters).map((b) => b.name).sort()

  it('il punteggio è un minimo', () => {
    expect(names({ minRating: 4 })).toEqual(['Barolo', 'Senza gradazione', 'Tipopils'])
    expect(names({ minRating: 5 })).toEqual(['Barolo'])
  })

  it('la gradazione va per fasce con gli estremi compresi', () => {
    expect(names({ abv: '13-14' })).toEqual(['Dolcetto'])
    expect(names({ abv: '12-13' })).toEqual(['Dolcetto'])
    expect(names({ abv: '14-15' })).toEqual(['Barolo'])
    expect(names({ abv: 'lt6' })).toEqual(['Tipopils'])
  })

  it('"Oltre 15%" esclude il 15 e "Meno di 6%" esclude il 6', () => {
    const edge = [
      bottle({ name: 'Quindici', abv: 15 }),
      bottle({ name: 'Quindici e uno', abv: 15.1 }),
      bottle({ name: 'Sei', abv: 6 }),
      bottle({ name: 'Quattordici', abv: 14 }),
    ]
    const ids = (abv) => filterBottles(edge, { abv }).map((b) => b.name).sort()
    expect(ids('gt15')).toEqual(['Quindici e uno'])
    expect(ids('14-15')).toEqual(['Quattordici', 'Quindici'])
    expect(ids('lt6')).toEqual([])
    expect(ids('6-9')).toEqual(['Sei'])
  })

  it('in cantina vale la gradazione ma non il punteggio', () => {
    expect(names({ cellar: true, abv: '13-14' })).toEqual(['In cantina'])
    expect(names({ cellar: true, minRating: 4 })).toEqual(['In cantina'])
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

describe('Home: etichette assaggiate per data del primo assaggio', () => {
  const at = (y, m, d) => new Date(y, m - 1, d, 20, 0).toISOString()
  const list = [
    // Registrata in agosto (in cantina), assaggiata a ottobre.
    bottle({ name: 'Barolo', consumedAt: at(2026, 8, 1), tastedAt: at(2026, 10, 5) }),
    bottle({ name: 'Da assaggiare', consumedAt: at(2026, 9, 1), tastedAt: null, rating: null, cellarCount: 6 }),
    bottle({ name: 'Tipopils', consumedAt: at(2026, 9, 20), tastedAt: at(2026, 9, 20) }),
  ]

  it('esclude le etichette da assaggiare e ordina per primo assaggio, dal più recente', () => {
    expect(filterBottles(list, {}).map((b) => b.name)).toEqual(['Barolo', 'Tipopils'])
  })

  it('raggruppa per mese del primo assaggio', () => {
    const groups = groupByMonth(filterBottles(list, {}))
    expect(groups.map((g) => [g.key, g.items.length])).toEqual([['2026-10', 1], ['2026-09', 1]])
  })

  it('anno e mese filtrano sul primo assaggio, e le etichette da assaggiare non creano voci', () => {
    expect(filterBottles(list, { month: 8 })).toHaveLength(0)
    expect(filterBottles(list, { month: 10 }).map((b) => b.name)).toEqual(['Barolo'])
    expect(availableMonths(list)).toEqual([9, 10])
    expect(availableYears(list)).toEqual([2026])
  })
})

describe('filtro "In cantina"', () => {
  const list = [
    bottle({ name: 'Barolo', type: 'wine', cellarCount: 6, tastedAt: null, rating: null, cellarUpdatedAt: '2026-10-01T10:00:00.000Z' }),
    bottle({ name: 'Tipopils', type: 'beer', cellarCount: 2, cellarUpdatedAt: '2026-10-05T10:00:00.000Z' }),
    bottle({ name: 'Chianti', type: 'wine', cellarCount: 1, cellarUpdatedAt: '2026-09-01T10:00:00.000Z' }),
    bottle({ name: 'Finito', type: 'wine', cellarCount: 0, cellarUpdatedAt: '2026-10-06T10:00:00.000Z' }),
  ]

  it('mostra le etichette con bottiglie in casa, anche da assaggiare, dall\'ultima entrata', () => {
    expect(filterBottles(list, { cellar: true }).map((b) => b.name)).toEqual(['Tipopils', 'Barolo', 'Chianti'])
  })

  it('si combina con tipo e ricerca', () => {
    expect(filterBottles(list, { cellar: true, type: 'wine' }).map((b) => b.name)).toEqual(['Barolo', 'Chianti'])
    expect(filterBottles(list, { cellar: true, query: 'tipo' }).map((b) => b.name)).toEqual(['Tipopils'])
  })

  it('riepilogo: etichette e bottiglie', () => {
    expect(cellarSummary(filterBottles(list, { cellar: true }))).toEqual({ labels: 3, bottles: 9 })
  })
})

describe('etichette da assaggiare rimaste a 0 bottiglie', () => {
  it('restano raggiungibili dal filtro "In cantina"', () => {
    const list = [bottle({ name: 'Mai assaggiato', tastedAt: null, rating: null, cellarCount: 0, cellarUpdatedAt: '2026-10-01T10:00:00.000Z' })]
    expect(filterBottles(list, {})).toHaveLength(0)
    expect(filterBottles(list, { cellar: true }).map((b) => b.name)).toEqual(['Mai assaggiato'])
  })
})

describe('ricerca su aromi e abbinamenti', () => {
  const list = [
    bottle({ name: 'Barolo', aromaTags: ['Tannico', 'Speziato'], pairingTags: ['Carne'] }),
    bottle({ name: 'Tipopils', type: 'beer', aromaTags: ['Luppolato'], pairingTags: ['Pizza'] }),
  ]
  it('trova le bottiglie per aroma o abbinamento, senza badare a maiuscole', () => {
    expect(filterBottles(list, { query: 'tannico' }).map((b) => b.name)).toEqual(['Barolo'])
    expect(filterBottles(list, { query: 'PIZZA' }).map((b) => b.name)).toEqual(['Tipopils'])
  })
  it('anche nella cantina', () => {
    const cellar = list.map((b) => ({ ...b, cellarCount: 2 }))
    expect(filterBottles(cellar, { query: 'carne', cellar: true }).map((b) => b.name)).toEqual(['Barolo'])
  })
})

describe('ricerca per vitigno', () => {
  const list = [
    bottle({ name: 'Barolo', grape: 'Nebbiolo' }),
    bottle({ name: 'Traminer', grape: 'Gewürztraminer' }),
    bottle({ name: 'Senza vitigno' }),
  ]
  it('trova i vini per vitigno, senza badare a maiuscole e accenti', () => {
    expect(filterBottles(list, { query: 'nebb' }).map((b) => b.name)).toEqual(['Barolo'])
    expect(filterBottles(list, { query: 'NEBBIOLO' }).map((b) => b.name)).toEqual(['Barolo'])
    expect(filterBottles(list, { query: 'gewurz' }).map((b) => b.name)).toEqual(['Traminer'])
  })
  it('anche nella cantina', () => {
    const cellar = list.map((b) => ({ ...b, cellarCount: 1 }))
    expect(filterBottles(cellar, { query: 'nebb', cellar: true }).map((b) => b.name)).toEqual(['Barolo'])
  })
})

describe('filterWishes', () => {
  const wishes = [
    { id: 'a', type: 'wine', name: 'Timorasso Derthona', producer: 'Vigneti Massa', notes: 'Consigliato da Marco', createdAt: '2026-10-01T10:00:00.000Z' },
    { id: 'b', type: 'beer', name: 'Tipopils', producer: null, notes: '', createdAt: '2026-10-03T10:00:00.000Z' },
    { id: 'c', type: 'wine', name: 'Barolo', producer: 'Café du Vin', notes: '', createdAt: '2026-10-02T10:00:00.000Z' },
  ]
  const ids = (list) => list.map((w) => w.id)

  it('senza filtri ordina dal più recente', () => {
    expect(ids(filterWishes(wishes))).toEqual(['b', 'c', 'a'])
  })

  it('filtra per tipo', () => {
    expect(ids(filterWishes(wishes, { type: 'beer' }))).toEqual(['b'])
    expect(ids(filterWishes(wishes, { type: 'wine' }))).toEqual(['c', 'a'])
  })

  it('cerca in nome, produttore e note senza badare a maiuscole e accenti', () => {
    expect(ids(filterWishes(wishes, { query: 'marco' }))).toEqual(['a'])
    expect(ids(filterWishes(wishes, { query: 'MASSA' }))).toEqual(['a'])
    expect(ids(filterWishes(wishes, { query: 'cafe' }))).toEqual(['c'])
    expect(ids(filterWishes(wishes, { query: 'pils' }))).toEqual(['b'])
  })

  it('combina ricerca e tipo', () => {
    expect(filterWishes(wishes, { query: 'ti', type: 'beer' }).map((w) => w.id)).toEqual(['b'])
  })
})

describe('filtro Tipologia (sottocategoria) di Diario e Cantina', () => {
  const now = new Date().toISOString()
  const list = [
    bottle({ id: 'rosso', type: 'wine', subtype: 'Rosso', tastedAt: now }),
    bottle({ id: 'bianco', type: 'wine', subtype: 'Bianco', tastedAt: now }),
    bottle({ id: 'orange', type: 'wine', subtype: 'Orange', tastedAt: now }),
    bottle({ id: 'ipa', type: 'beer', subtype: 'IPA', tastedAt: now }),
    bottle({ id: 'senza', type: 'beer', subtype: null, tastedAt: now }),
    bottle({ id: 'stout-cantina', type: 'beer', subtype: 'Stout', tastedAt: null, rating: null, cellarCount: 3 }),
  ]
  const ids = (l) => l.map((b) => b.id).sort()

  it('filterBottles tiene solo la tipologia scelta, insieme al tipo', () => {
    expect(ids(filterBottles(list, { subtype: 'Rosso' }))).toEqual(['rosso'])
    expect(ids(filterBottles(list, { type: 'beer', subtype: 'IPA' }))).toEqual(['ipa'])
    expect(ids(filterBottles(list, { cellar: true, subtype: 'Stout' }))).toEqual(['stout-cantina'])
    expect(filterBottles(list, { subtype: 'Stout' })).toEqual([])
  })

  it('availableSubtypes elenca sempre le predefinite e, dopo, quelle scritte a mano della scheda', () => {
    expect(availableSubtypes(list)).toEqual([
      { type: 'wine', label: 'Vino', subtypes: [...WINE_SUBTYPES, 'Orange'] },
      { type: 'beer', label: 'Birra', subtypes: BEER_SUBTYPES },
    ])
    expect(availableSubtypes(list, { type: 'beer' })).toEqual([{ type: 'beer', label: 'Birra', subtypes: BEER_SUBTYPES }])
    // In cantina non c'è l'Orange (è solo nel diario), ma le predefinite sì.
    expect(availableSubtypes(list, { cellar: true, type: 'wine' })).toEqual([{ type: 'wine', label: 'Vino', subtypes: WINE_SUBTYPES }])
    expect(availableSubtypes([])).toHaveLength(2)
  })
})
