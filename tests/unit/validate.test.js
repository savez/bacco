import { describe, it, expect } from 'vitest'
import { validateBottle, validateMove, validateWish, isValidBarcode, isHttpsUrl } from '../../src/lib/validate.js'

const base = () => ({
  name: 'Barolo Cannubi',
  type: 'wine',
  rating: 4,
})

describe('validateBottle', () => {
  it('accetta un input minimo valido', () => {
    const res = validateBottle(base())
    expect(res.ok).toBe(true)
    expect(res.value.name).toBe('Barolo Cannubi')
    expect(res.value.producer).toBeNull()
    expect(res.value.vintage).toBeNull()
    expect(res.value.notes).toBe('')
    expect(res.value.barcode).toBeNull()
    expect(res.value.externalUrl).toBeNull()
    expect(res.value.location).toBeNull()
  })

  it('rifiuta il nome vuoto', () => {
    const res = validateBottle({ ...base(), name: '   ' })
    expect(res.ok).toBe(false)
    expect(res.errors.name).toBeTruthy()
  })

  it('rifiuta il nome troppo lungo', () => {
    const res = validateBottle({ ...base(), name: 'a'.repeat(121) })
    expect(res.ok).toBe(false)
    expect(res.errors.name).toBeTruthy()
  })

  it('rifiuta un tipo fuori enum', () => {
    const res = validateBottle({ ...base(), type: 'cocktail' })
    expect(res.ok).toBe(false)
    expect(res.errors.type).toBeTruthy()
  })

  it("rifiuta un'annata troppo vecchia", () => {
    const res = validateBottle({ ...base(), vintage: 1899 })
    expect(res.ok).toBe(false)
    expect(res.errors.vintage).toBeTruthy()
  })

  it("rifiuta un'annata futura", () => {
    const res = validateBottle({ ...base(), vintage: new Date().getFullYear() + 1 })
    expect(res.ok).toBe(false)
    expect(res.errors.vintage).toBeTruthy()
  })

  it("accetta l'annata dell'anno corrente", () => {
    const res = validateBottle({ ...base(), vintage: new Date().getFullYear() })
    expect(res.ok).toBe(true)
  })

  it.each([0, 6, 2.5])('rifiuta il punteggio non valido %s', (rating) => {
    const res = validateBottle({ ...base(), rating })
    expect(res.ok).toBe(false)
    expect(res.errors.rating).toBeTruthy()
  })

  it('rifiuta consumedAt nel futuro oltre la tolleranza', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const res = validateBottle({ ...base(), consumedAt: future })
    expect(res.ok).toBe(false)
    expect(res.errors.consumedAt).toBeTruthy()
  })

  it('accetta consumedAt entro la tolleranza di 5 minuti', () => {
    const soon = new Date(Date.now() + 2 * 60 * 1000).toISOString()
    const res = validateBottle({ ...base(), consumedAt: soon })
    expect(res.ok).toBe(true)
  })

  it('rifiuta note troppo lunghe', () => {
    const res = validateBottle({ ...base(), notes: 'a'.repeat(5001) })
    expect(res.ok).toBe(false)
    expect(res.errors.notes).toBeTruthy()
  })

  it.each(['123', '123456789012345', 'abcdefgh'])(
    'rifiuta un barcode non valido %s',
    (barcode) => {
      const res = validateBottle({ ...base(), barcode })
      expect(res.ok).toBe(false)
      expect(res.errors.barcode).toBeTruthy()
    },
  )

  it('accetta un barcode EAN-13 valido', () => {
    const res = validateBottle({ ...base(), barcode: '8000000000000' })
    expect(res.ok).toBe(true)
    expect(res.value.barcode).toBe('8000000000000')
  })

  it.each(['http://example.com', 'javascript:alert(1)', 'non-un-url'])(
    'rifiuta externalUrl non https %s',
    (externalUrl) => {
      const res = validateBottle({ ...base(), externalUrl })
      expect(res.ok).toBe(false)
      expect(res.errors.externalUrl).toBeTruthy()
    },
  )

  it('accetta un externalUrl https valido', () => {
    const res = validateBottle({ ...base(), externalUrl: 'https://example.com/scheda' })
    expect(res.ok).toBe(true)
  })

  it.each([
    { lat: 91, lon: 0 },
    { lat: 0, lon: 181 },
    { lat: -91, lon: 0 },
  ])('rifiuta location fuori intervallo %o', (location) => {
    const res = validateBottle({ ...base(), location })
    expect(res.ok).toBe(false)
    expect(res.errors.location).toBeTruthy()
  })

  it('accetta e arrotonda una location valida', () => {
    const res = validateBottle({
      ...base(),
      location: { lat: 44.612345678, lon: 7.934567891, accuracy: 25.6 },
    })
    expect(res.ok).toBe(true)
    expect(res.value.location.lat).toBe(44.61235)
    expect(res.value.location.lon).toBe(7.93457)
  })

  it('normalizza con trim i campi di testo', () => {
    const res = validateBottle({ ...base(), name: '  Barolo  ', producer: '  Borgogno  ' })
    expect(res.ok).toBe(true)
    expect(res.value.name).toBe('Barolo')
    expect(res.value.producer).toBe('Borgogno')
  })

  it('trasforma stringhe facoltative vuote in null', () => {
    const res = validateBottle({ ...base(), producer: '   ', barcode: '', externalUrl: '' })
    expect(res.ok).toBe(true)
    expect(res.value.producer).toBeNull()
    expect(res.value.barcode).toBeNull()
    expect(res.value.externalUrl).toBeNull()
  })
})

describe('isValidBarcode', () => {
  it('accetta solo cifre tra 8 e 14 caratteri', () => {
    expect(isValidBarcode('12345678')).toBe(true)
    expect(isValidBarcode('12345678901234')).toBe(true)
    expect(isValidBarcode('1234567')).toBe(false)
    expect(isValidBarcode('123456789012345')).toBe(false)
    expect(isValidBarcode('1234567a')).toBe(false)
  })
})

describe('isHttpsUrl', () => {
  it('accetta solo https', () => {
    expect(isHttpsUrl('https://example.com')).toBe(true)
    expect(isHttpsUrl('http://example.com')).toBe(false)
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpsUrl('non valido')).toBe(false)
  })
})

describe('analisi organolettica, abbinamento, gradazione, sottocategoria', () => {
  it('accetta e normalizza i campi', () => {
    const res = validateBottle({
      ...base(),
      subtype: '  Rosso ',
      tasting: ' ciliegia, tannico ',
      pairing: 'brasato',
      abv: '13,5',
    })
    expect(res.ok).toBe(true)
    expect(res.value.subtype).toBe('Rosso')
    expect(res.value.tasting).toBe('ciliegia, tannico')
    expect(res.value.pairing).toBe('brasato')
    expect(res.value.abv).toBe(13.5)
  })

  it('usa i valori predefiniti quando mancano', () => {
    const res = validateBottle(base())
    expect(res.value.subtype).toBeNull()
    expect(res.value.tasting).toBe('')
    expect(res.value.pairing).toBe('')
    expect(res.value.abv).toBeNull()
  })

  it('unisce i vecchi campi profumi e sapore', () => {
    const res = validateBottle({ ...base(), aromas: 'viola', taste: 'secco' })
    expect(res.value.tasting).toBe('Profumi: viola\nSapore: secco')
    expect(res.value.aromas).toBeUndefined()
  })

  it('arrotonda la gradazione al decimo e rifiuta valori fuori intervallo', () => {
    expect(validateBottle({ ...base(), abv: 4.75 }).value.abv).toBe(4.8)
    expect(validateBottle({ ...base(), abv: -1 }).errors.abv).toBeTruthy()
    expect(validateBottle({ ...base(), abv: 80 }).errors.abv).toBeTruthy()
    expect(validateBottle({ ...base(), abv: 'tanto' }).errors.abv).toBeTruthy()
  })

  it('accetta la denominazione solo per il vino', () => {
    expect(validateBottle({ ...base(), appellation: 'docg' }).value.appellation).toBe('DOCG')
    expect(validateBottle({ ...base(), type: 'beer', appellation: 'DOC' }).value.appellation).toBeNull()
    expect(validateBottle(base()).value.appellation).toBeNull()
  })

  it('accetta una denominazione nuova così com’è, senza maiuscolo forzato', () => {
    expect(validateBottle({ ...base(), appellation: 'AOC' }).value.appellation).toBe('AOC')
    expect(validateBottle({ ...base(), appellation: 'Vin de France' }).value.appellation).toBe('Vin de France')
    expect(validateBottle({ ...base(), appellation: 'a'.repeat(31) }).errors.appellation).toBeTruthy()
  })

  it('rifiuta testi troppo lunghi', () => {
    const res = validateBottle({ ...base(), subtype: 'a'.repeat(41), tasting: 'b'.repeat(1001) })
    expect(res.ok).toBe(false)
    expect(res.errors.subtype).toBeTruthy()
    expect(res.errors.tasting).toBeTruthy()
  })
})

describe('campi della cantina', () => {
  it('bevuta subito: tastedAt = consumedAt, niente cantina', () => {
    const res = validateBottle({ ...base(), consumedAt: '2026-10-01T20:00:00.000Z' })
    expect(res.ok).toBe(true)
    expect(res.value).toMatchObject({ tastedAt: '2026-10-01T20:00:00.000Z', cellarCount: 0, cellarUpdatedAt: null })
  })

  it('da assaggiare: punteggio non richiesto e azzerato', () => {
    const res = validateBottle({ name: 'Barolo', type: 'wine', tastedAt: null, rating: '', cellarCount: 6 })
    expect(res.ok).toBe(true)
    expect(res.value).toMatchObject({ rating: null, tastedAt: null, cellarCount: 6 })
  })

  it('assaggiata senza punteggio: errore', () => {
    const res = validateBottle({ name: 'Barolo', type: 'wine', rating: null })
    expect(res.ok).toBe(false)
    expect(res.errors.rating).toBeTruthy()
  })

  it('bottiglie in cantina: intero da 0 a 999', () => {
    for (const bad of [-1, 1000, 2.5, 'tante']) {
      expect(validateBottle({ ...base(), cellarCount: bad }).errors?.cellarCount).toBeTruthy()
    }
    expect(validateBottle({ ...base(), cellarCount: 999 }).ok).toBe(true)
  })

  it('date della cantina: ISO o null', () => {
    expect(validateBottle({ ...base(), tastedAt: 'ieri' }).errors?.tastedAt).toBeTruthy()
    expect(validateBottle({ ...base(), cellarUpdatedAt: 'ieri' }).errors?.cellarUpdatedAt).toBeTruthy()
    const ok = validateBottle({ ...base(), cellarUpdatedAt: '2026-10-01T20:00:00.000Z' })
    expect(ok.value.cellarUpdatedAt).toBe('2026-10-01T20:00:00.000Z')
  })
})

describe('validateMove', () => {
  const at = '2026-10-01T20:00:00.000Z'
  const id = '11111111-1111-4111-8111-111111111111'
  const bottleId = '22222222-2222-4222-8222-222222222222'

  it('accetta i quattro tipi con le loro quantità', () => {
    expect(validateMove({ id, bottleId, type: 'first', at }).ok).toBe(true)
    expect(validateMove({ id, bottleId, type: 'in', qty: 6, at }).ok).toBe(true)
    expect(validateMove({ id, bottleId, type: 'out', qty: 1, at }).ok).toBe(true)
    expect(validateMove({ id, bottleId, type: 'adjust', from: 4, to: 3, at }).ok).toBe(true)
  })

  it('normalizza i campi non usati a null', () => {
    expect(validateMove({ id, bottleId, type: 'in', qty: 2, from: 9, at }).value).toEqual({
      id, bottleId, type: 'in', qty: 2, from: null, to: null, at,
    })
  })

  it('rifiuta movimenti non validi', () => {
    expect(validateMove({ id, bottleId, type: 'gift', at }).ok).toBe(false)
    expect(validateMove({ id, bottleId, type: 'in', qty: 0, at }).ok).toBe(false)
    expect(validateMove({ id, bottleId, type: 'in', qty: 1000, at }).ok).toBe(false)
    expect(validateMove({ id, bottleId, type: 'out', qty: 2, at }).ok).toBe(false)
    expect(validateMove({ id, bottleId, type: 'adjust', from: 4, to: -1, at }).ok).toBe(false)
    expect(validateMove({ id, bottleId, type: 'first', at: 'ieri' }).ok).toBe(false)
    expect(validateMove({ id: 'x', bottleId, type: 'first', at }).ok).toBe(false)
  })
})

describe('contrassegno di Stato', () => {
  const wine = () => ({ name: 'Barolo', type: 'wine', rating: 4 })

  it('è facoltativo', () => {
    expect(validateBottle(wine()).value.stateSeal).toBeNull()
  })

  it('normalizza maiuscole e spazi', () => {
    expect(validateBottle({ ...wine(), stateSeal: ' adk 007842971 ' }).value.stateSeal).toBe('ADK007842971')
  })

  it('accetta solo lettere e cifre, da 6 a 20 caratteri', () => {
    expect(validateBottle({ ...wine(), stateSeal: 'ADK-0078' }).errors?.stateSeal).toBeTruthy()
    expect(validateBottle({ ...wine(), stateSeal: 'AB12' }).errors?.stateSeal).toBeTruthy()
    expect(validateBottle({ ...wine(), stateSeal: 'A'.repeat(21) }).errors?.stateSeal).toBeTruthy()
  })

  it('vale solo per il vino', () => {
    expect(validateBottle({ name: 'Tipopils', type: 'beer', rating: 4, stateSeal: 'ADK007842971' }).value.stateSeal).toBeNull()
  })
})

describe('chip di aromi e abbinamenti', () => {
  const wine = () => ({ name: 'Barolo', type: 'wine', rating: 4 })

  it('default: elenchi vuoti, anche per record senza i campi', () => {
    const res = validateBottle(wine())
    expect(res.value.aromaTags).toEqual([])
    expect(res.value.pairingTags).toEqual([])
  })

  it('tiene le voci nuove, toglie i doppioni per chiave e segue l’ordine dato', () => {
    const res = validateBottle({ ...wine(), aromaTags: ['Tannico', 'tannico', 'Balsamico'], pairingTags: ['Sushi', 'pizza'] })
    expect(res.ok).toBe(true)
    expect(res.value.aromaTags).toEqual(['Tannico', 'Balsamico'])
    expect(res.value.pairingTags).toEqual(['Sushi', 'Pizza'])
  })

  it('non filtra gli aromi per tipo: una voce del vino può essere di una birra', () => {
    const res = validateBottle({ name: 'Tipopils', type: 'beer', rating: 4, aromaTags: ['Speziato', 'Luppolato'] })
    expect(res.value.aromaTags).toEqual(['Speziato', 'Luppolato'])
  })

  it('riporta una predefinita (di vino o di birra) scritta a mano alla voce canonica', () => {
    expect(validateBottle({ name: 'Tipopils', type: 'beer', rating: 4, aromaTags: ['fruttato'] }).value.aromaTags).toEqual(['Fruttato'])
  })

  it('rifiuta voci oltre 40 caratteri e più di 30 voci', () => {
    expect(validateBottle({ ...wine(), aromaTags: ['a'.repeat(41)] }).errors.aromaTags).toBeTruthy()
    expect(validateBottle({ ...wine(), pairingTags: ['b'.repeat(41)] }).errors.pairingTags).toBeTruthy()
    const many = Array.from({ length: 31 }, (_, i) => `voce ${i}`)
    expect(validateBottle({ ...wine(), aromaTags: many }).errors.aromaTags).toBeTruthy()
    expect(validateBottle({ ...wine(), pairingTags: many }).errors.pairingTags).toBeTruthy()
  })

  it('scarta voci vuote o non testo', () => {
    expect(validateBottle({ ...wine(), aromaTags: ['  ', 4, 'Tannico'] }).value.aromaTags).toEqual(['Tannico'])
  })
})

describe('vitigno', () => {
  const wine = () => ({ name: 'Barolo', type: 'wine', rating: 4 })

  it('assente → null', () => {
    expect(validateBottle(wine()).value.grape).toBeNull()
  })

  it('una voce d’elenco scritta a mano diventa la voce canonica', () => {
    expect(validateBottle({ ...wine(), grape: 'nebbiolo' }).value.grape).toBe('Nebbiolo')
  })

  it('un testo libero resta com’è', () => {
    expect(validateBottle({ ...wine(), grape: 'Timorasso' }).value.grape).toBe('Timorasso')
  })

  it('solo spazi → null senza errore', () => {
    const res = validateBottle({ ...wine(), grape: '   ' })
    expect(res.ok).toBe(true)
    expect(res.value.grape).toBeNull()
  })

  it('oltre 60 caratteri → errore', () => {
    expect(validateBottle({ ...wine(), grape: 'A'.repeat(61) }).errors?.grape).toBeTruthy()
    expect(validateBottle({ ...wine(), grape: 'A'.repeat(60) }).ok).toBe(true)
  })

  it('vale solo per il vino', () => {
    const res = validateBottle({ name: 'Tipopils', type: 'beer', rating: 4, grape: 'Nebbiolo' })
    expect(res.ok).toBe(true)
    expect(res.value.grape).toBeNull()
  })
})

describe('validateWish', () => {
  const now = new Date('2026-10-08T12:00:00Z')
  const wish = (extra = {}) => validateWish({ type: 'wine', name: 'Timorasso', ...extra }, { now })

  it('accetta tipo e nome soltanto', () => {
    const res = wish()
    expect(res).toEqual({
      ok: true,
      value: { type: 'wine', name: 'Timorasso', producer: null, vintage: null, notes: '', externalUrl: null },
    })
  })

  it('ripulisce gli spazi e conserva gli a capo delle note', () => {
    const res = wish({ name: '  Timorasso  ', producer: ' Vigneti Massa ', notes: ' Consigliato da Marco\nminerale ' })
    expect(res.value).toMatchObject({ name: 'Timorasso', producer: 'Vigneti Massa', notes: 'Consigliato da Marco\nminerale' })
  })

  it('richiede il nome e ne limita la lunghezza', () => {
    expect(wish({ name: '' }).errors.name).toBeTruthy()
    expect(wish({ name: '   ' }).errors.name).toBeTruthy()
    expect(wish({ name: 'x'.repeat(121) }).errors.name).toBeTruthy()
    expect(wish({ name: 'x'.repeat(120) }).ok).toBe(true)
  })

  it('richiede vino o birra', () => {
    expect(validateWish({ name: 'Timorasso' }, { now }).errors.type).toBeTruthy()
    expect(wish({ type: 'beer' }).ok).toBe(true)
  })

  it('limita il produttore a 120 caratteri', () => {
    expect(wish({ producer: 'x'.repeat(121) }).errors.producer).toBeTruthy()
    expect(wish({ producer: '' }).value.producer).toBeNull()
  })

  it('accetta l\'annata tra 1900 e l\'anno corrente', () => {
    expect(wish({ vintage: '2021' }).value.vintage).toBe(2021)
    expect(wish({ vintage: '' }).value.vintage).toBeNull()
    expect(wish({ vintage: 1899 }).errors.vintage).toBeTruthy()
    expect(wish({ vintage: 2027 }).errors.vintage).toBeTruthy()
    expect(wish({ vintage: 2026 }).ok).toBe(true)
  })

  it('limita le note a 5000 caratteri', () => {
    expect(wish({ notes: 'x'.repeat(5001) }).errors.notes).toBeTruthy()
    expect(wish({ notes: 'x'.repeat(5000) }).ok).toBe(true)
  })

  it('accetta solo link https', () => {
    expect(wish({ externalUrl: 'http://x.it' }).errors.externalUrl).toBeTruthy()
    expect(wish({ externalUrl: 'ciao' }).errors.externalUrl).toBeTruthy()
    expect(wish({ externalUrl: ' https://x.it/a ' }).value.externalUrl).toBe('https://x.it/a')
  })
})
