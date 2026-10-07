import { describe, it, expect, vi } from 'vitest'
import { lookupBarcode, mapProduct } from '../../src/lib/openFoodFacts.js'

function mockFetchJson(body, { ok = true, status = 200 } = {}) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  })
}

describe('mapProduct', () => {
  it('preferisce product_name_it e il primo brand prima della virgola', () => {
    const fields = mapProduct({
      product_name: 'Generic Name',
      product_name_it: 'Nome Italiano',
      brands: 'Marca A, Marca B',
      categories_tags: ['en:beverages', 'en:alcoholic-beverages', 'en:wines'],
    })
    expect(fields.name).toBe('Nome Italiano')
    expect(fields.producer).toBe('Marca A')
    expect(fields.type).toBe('wine')
    expect(fields.vintage).toBeUndefined()
  })

  it('usa product_name se product_name_it è assente, riconosce la birra', () => {
    const fields = mapProduct({
      product_name: 'Some Beer',
      brands: 'Birrificio',
      categories_tags: ['en:beverages', 'en:beers'],
    })
    expect(fields.name).toBe('Some Beer')
    expect(fields.type).toBe('beer')
  })

  it('non precompila il tipo se non riconosciuto', () => {
    const fields = mapProduct({ product_name: 'Mistero', categories_tags: ['en:beverages'] })
    expect(fields.type).toBeUndefined()
  })

  it('rimuove caratteri di controllo e tronca a 120 caratteri', () => {
    const fields = mapProduct({ product_name: 'a'.repeat(130) + '\u0000' })
    expect(fields.name.length).toBe(120)
  })
})

describe('mapProduct: denominazione', () => {
  it('legge DOCG, DOC, IGT, IGP dalle etichette, solo per il vino', () => {
    const wine = (labels) => mapProduct({ product_name: 'X', categories_tags: ['en:wines'], labels_tags: labels })
    expect(wine(['it:docg']).appellation).toBe('DOCG')
    expect(wine(['en:doc']).appellation).toBe('DOC')
    expect(wine(['it:igt']).appellation).toBe('IGT')
    expect(wine(['en:pgi']).appellation).toBe('IGP')
    expect(wine(['en:organic']).appellation).toBeUndefined()
    expect(
      mapProduct({ product_name: 'X', categories_tags: ['en:beers'], labels_tags: ['it:docg'] }).appellation,
    ).toBeUndefined()
  })
})

describe('mapProduct: gradazione', () => {
  it('legge la gradazione dai nutrienti', () => {
    expect(mapProduct({ product_name: 'X', nutriments: { alcohol_100g: 13.5 } }).abv).toBe(13.5)
    expect(mapProduct({ product_name: 'X', nutriments: { alcohol: '5' } }).abv).toBe(5)
  })

  it('ignora valori assenti o fuori intervallo', () => {
    expect(mapProduct({ product_name: 'X' }).abv).toBeUndefined()
    expect(mapProduct({ product_name: 'X', nutriments: { alcohol_100g: 0 } }).abv).toBeUndefined()
    expect(mapProduct({ product_name: 'X', nutriments: { alcohol_100g: 95 } }).abv).toBeUndefined()
  })
})

describe('mapProduct: sottocategoria', () => {
  it.each([
    [['en:wines', 'en:red-wines'], 'wine', 'Rosso'],
    [['en:wines', 'en:sparkling-wines'], 'wine', 'Bollicine'],
    [['en:beers', 'en:stouts'], 'beer', 'Stout'],
    [['en:beers', 'en:wheat-beers'], 'beer', 'Wheat'],
  ])('%j → %s %s', (tags, type, subtype) => {
    const fields = mapProduct({ product_name: 'X', categories_tags: tags })
    expect(fields.type).toBe(type)
    expect(fields.subtype).toBe(subtype)
  })

  it('non precompila la sottocategoria se non riconosciuta', () => {
    expect(mapProduct({ product_name: 'X', categories_tags: ['en:wines'] }).subtype).toBeUndefined()
  })
})

describe('lookupBarcode', () => {
  it('non chiama fetch se offline', async () => {
    const fetchImpl = mockFetchJson({ status: 1 })
    const result = await lookupBarcode('8000000000000', { fetchImpl, online: false })
    expect(result.status).toBe('offline')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('non chiama fetch con un codice non valido', async () => {
    const fetchImpl = mockFetchJson({ status: 1 })
    const result = await lookupBarcode('abc', { fetchImpl, online: true })
    expect(result.status).toBe('error')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('restituisce found con i campi mappati', async () => {
    const fetchImpl = mockFetchJson({
      status: 1,
      product: { product_name_it: 'Nome', brands: 'Marca', categories_tags: ['en:wines'] },
    })
    const result = await lookupBarcode('8000000000000', { fetchImpl, online: true })
    expect(result.status).toBe('found')
    expect(result.fields.name).toBe('Nome')
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('world.openfoodfacts.org/api/v2/product/8000000000000.json'),
      expect.objectContaining({ credentials: 'omit' }),
    )
  })

  it('restituisce not_found per status 0', async () => {
    const fetchImpl = mockFetchJson({ status: 0 })
    const result = await lookupBarcode('8000000000000', { fetchImpl, online: true })
    expect(result.status).toBe('not_found')
  })

  it('restituisce not_found per HTTP 404', async () => {
    const fetchImpl = mockFetchJson({}, { ok: false, status: 404 })
    const result = await lookupBarcode('8000000000000', { fetchImpl, online: true })
    expect(result.status).toBe('not_found')
  })

  it('restituisce error per HTTP 500', async () => {
    const fetchImpl = mockFetchJson({}, { ok: false, status: 500 })
    const result = await lookupBarcode('8000000000000', { fetchImpl, online: true })
    expect(result.status).toBe('error')
  })

  it('restituisce error se la risposta non è JSON valido', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('invalid json')
      },
    })
    const result = await lookupBarcode('8000000000000', { fetchImpl, online: true })
    expect(result.status).toBe('error')
  })

  it('restituisce error in caso di timeout', async () => {
    const fetchImpl = vi.fn().mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new DOMException('aborted', 'AbortError')), 20)
        }),
    )
    const result = await lookupBarcode('8000000000000', { fetchImpl, online: true, timeoutMs: 5 })
    expect(result.status).toBe('error')
  })
})
