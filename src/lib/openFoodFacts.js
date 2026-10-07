import { isValidBarcode } from './validate.js'

const BASE_URL = 'https://world.openfoodfacts.org/api/v2/product'
const FIELDS = 'code,product_name,product_name_it,brands,categories_tags,labels_tags,nutriments'

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0009\u000B-\u001F\u007F]/g

// Tag di categoria Open Food Facts → sottocategoria (contracts/openfoodfacts.md).
const SUBTYPE_BY_TAG = {
  wine: [
    [/:sparkling-wines?$|:champagnes?$|:proseccos?$/, 'Bollicine'],
    [/:red-wines?$/, 'Rosso'],
    [/:white-wines?$/, 'Bianco'],
    [/:ros[eé]-wines?$/, 'Rosato'],
    [/:sweet-wines?$|:dessert-wines?$/, 'Passito'],
  ],
  beer: [
    [/:pilsners?$/, 'Pils'],
    [/:lagers?$/, 'Lager'],
    [/:ipas?$|:india-pale-ales?$/, 'IPA'],
    [/:stouts?$/, 'Stout'],
    [/:porters?$/, 'Porter'],
    [/:wheat-beers?$/, 'Wheat'],
    [/:bocks?$/, 'Bock'],
    [/:sour-beers?$/, 'Sour'],
    [/:ales?$/, 'Ale'],
  ],
}

// Etichette Open Food Facts → denominazione del vino (contracts/openfoodfacts.md).
const APPELLATION_BY_LABEL = [
  [/:docg$/, 'DOCG'],
  [/:doc$/, 'DOC'],
  [/:igt$/, 'IGT'],
  [/:igp$|:pgi$/, 'IGP'],
]

function cleanField(value) {
  if (typeof value !== 'string') return undefined
  const cleaned = value.replace(CONTROL_CHARS, '').trim()
  return cleaned.length > 0 ? cleaned.slice(0, 120) : undefined
}

/**
 * Mappa la risposta di Open Food Facts sui campi del modulo (contracts/openfoodfacts.md).
 * @param {object} product
 */
export function mapProduct(product) {
  if (!product) return {}
  const name = cleanField(product.product_name_it) ?? cleanField(product.product_name)
  const brandsField = cleanField(product.brands)
  const producer = brandsField ? brandsField.split(',')[0].trim().slice(0, 120) : undefined

  const tags = Array.isArray(product.categories_tags) ? product.categories_tags : []
  let type
  if (tags.some((t) => /wines?$/.test(t) || SUBTYPE_BY_TAG.wine.some(([re]) => re.test(t)))) type = 'wine'
  else if (tags.some((t) => /beers?$/.test(t) || SUBTYPE_BY_TAG.beer.some(([re]) => re.test(t)))) type = 'beer'

  let subtype
  if (type) {
    for (const [re, label] of SUBTYPE_BY_TAG[type]) {
      if (tags.some((t) => re.test(t))) {
        subtype = label
        break
      }
    }
  }

  const alcohol = Number(product.nutriments?.alcohol_100g ?? product.nutriments?.alcohol)
  const abv = Number.isFinite(alcohol) && alcohol > 0 && alcohol <= 70 ? Math.round(alcohol * 10) / 10 : undefined

  const labels = Array.isArray(product.labels_tags) ? product.labels_tags : []
  let appellation
  if (type === 'wine') {
    appellation = APPELLATION_BY_LABEL.find(([re]) => labels.some((l) => re.test(l)))?.[1]
  }

  return { name, producer, type, subtype, appellation, abv, vintage: undefined }
}

/**
 * Cerca un codice a barre su Open Food Facts, in sola lettura (contracts/openfoodfacts.md).
 * @param {string} code
 * @param {{fetchImpl?: typeof fetch, timeoutMs?: number, online?: boolean}} [opts]
 * @returns {Promise<{status:'found'|'not_found'|'offline'|'error', fields?: object}>}
 */
export async function lookupBarcode(
  code,
  { fetchImpl = fetch, timeoutMs = 6000, online = typeof navigator !== 'undefined' ? navigator.onLine : true } = {},
) {
  if (!online) return { status: 'offline' }
  if (!isValidBarcode(code)) return { status: 'error' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const url = `${BASE_URL}/${code}.json?fields=${FIELDS}`
    const response = await fetchImpl(url, { signal: controller.signal, credentials: 'omit' })
    if (!response.ok) {
      return response.status === 404 ? { status: 'not_found' } : { status: 'error' }
    }
    const body = await response.json()
    if (!body || body.status === 0) return { status: 'not_found' }
    return { status: 'found', fields: mapProduct(body.product) }
  } catch {
    return { status: 'error' }
  } finally {
    clearTimeout(timer)
  }
}
