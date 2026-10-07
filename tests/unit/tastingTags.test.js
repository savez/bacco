import { describe, it, expect } from 'vitest'
import { WINE_AROMAS, BEER_AROMAS, PAIRINGS, aromasFor, keepValidAromas, normalizeTags } from '../../src/lib/tastingTags.js'

describe('vocabolari', () => {
  it('aromi del vino, della birra e abbinamenti come da specifica', () => {
    expect(WINE_AROMAS).toEqual(['Fruttato', 'Floreale', 'Speziato', 'Erbaceo', 'Tostato', 'Minerale', 'Tannico', 'Fresco', 'Morbido', 'Sapido', 'Lungo', 'Corto'])
    expect(BEER_AROMAS).toEqual(['Luppolato', 'Maltato', 'Caramello', 'Tostato', 'Agrumato', 'Erbaceo', 'Amaro', 'Fresco', 'Corposo', 'Leggero', 'Secco', 'Dolce'])
    expect(PAIRINGS).toEqual(['Carne', 'Pesce', 'Formaggi', 'Pizza', 'Salumi', 'Dolci'])
  })

  it('aromasFor sceglie l\'elenco del tipo', () => {
    expect(aromasFor('wine')).toBe(WINE_AROMAS)
    expect(aromasFor('beer')).toBe(BEER_AROMAS)
    expect(aromasFor(null)).toEqual([])
  })
})

describe('keepValidAromas', () => {
  it('passando da vino a birra restano solo gli aromi comuni', () => {
    expect(keepValidAromas(['Tannico', 'Fresco', 'Tostato'], 'beer')).toEqual(['Tostato', 'Fresco'])
  })
})

describe('normalizeTags', () => {
  it('toglie voci sconosciute e doppioni e segue l\'ordine del vocabolario', () => {
    expect(normalizeTags(['Pizza', 'Carne', 'Pizza', 'Sushi'], PAIRINGS)).toEqual(['Carne', 'Pizza'])
  })

  it('accetta valori mancanti o non elenchi', () => {
    expect(normalizeTags(undefined, PAIRINGS)).toEqual([])
    expect(normalizeTags('Carne', PAIRINGS)).toEqual([])
  })
})
