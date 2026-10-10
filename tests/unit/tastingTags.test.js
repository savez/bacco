import { describe, it, expect } from 'vitest'
import { WINE_AROMAS, BEER_AROMAS, PAIRINGS, ALL_AROMAS, cleanTags } from '../../src/lib/tastingTags.js'

describe('vocabolari', () => {
  it('aromi del vino, della birra e abbinamenti come da specifica', () => {
    expect(WINE_AROMAS).toEqual(['Fruttato', 'Floreale', 'Speziato', 'Erbaceo', 'Tostato', 'Minerale', 'Tannico', 'Fresco', 'Morbido', 'Sapido', 'Lungo', 'Corto'])
    expect(BEER_AROMAS).toEqual(['Luppolato', 'Maltato', 'Caramello', 'Tostato', 'Agrumato', 'Erbaceo', 'Amaro', 'Fresco', 'Corposo', 'Leggero', 'Secco', 'Dolce'])
    expect(PAIRINGS).toEqual(['Carne', 'Pesce', 'Formaggi', 'Pizza', 'Salumi', 'Dolci'])
  })

})



describe('cleanTags', () => {
  it('tiene le voci nuove, toglie i doppioni per chiave e segue l\'ordine dato', () => {
    expect(cleanTags(['Sushi', 'pizza', 'Pizza', 'SUSHI '], PAIRINGS)).toEqual(['Sushi', 'Pizza'])
  })

  it('riporta alla voce canonica', () => {
    expect(cleanTags(['fruttato', 'Balsamico'], ALL_AROMAS)).toEqual(['Fruttato', 'Balsamico'])
  })

  it('scarta vuoti e non testi, accetta valori che non sono elenchi', () => {
    expect(cleanTags(['  ', 3, null, 'Carne'], PAIRINGS)).toEqual(['Carne'])
    expect(cleanTags(undefined, PAIRINGS)).toEqual([])
    expect(cleanTags('Carne', PAIRINGS)).toEqual([])
  })

  it('limiti: scarta le voci troppo lunghe e tiene le prime maxCount', () => {
    expect(cleanTags(['a'.repeat(41), 'b'], [], { maxLength: 40 })).toEqual(['b'])
    expect(cleanTags(['a', 'b', 'c'], [], { maxCount: 2 })).toEqual(['a', 'b'])
  })

  it('ALL_AROMAS non ha doppioni e contiene vino e birra', () => {
    expect(new Set(ALL_AROMAS).size).toBe(ALL_AROMAS.length)
    expect(ALL_AROMAS).toEqual(expect.arrayContaining(['Tannico', 'Luppolato', 'Fresco']))
  })
})
