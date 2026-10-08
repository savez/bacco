// Regole del data model (specs/001-bottle-logging/data-model.md). Unica fonte di verità
// per la validazione di una bottiglia: usata da src/db/bottles.js e dall'importazione del
// backup (src/backup/importJson.js).

import { APPELLATIONS } from './subtypes.js'
import { GRAPE_MAX, canonicalGrape } from './grapes.js'
import { PAIRINGS, keepValidAromas, normalizeTags } from './tastingTags.js'

const NAME_MAX = 120
const NOTES_MAX = 5000
const SUBTYPE_MAX = 40
const TASTING_MAX = 1000
const PAIRING_MAX = 500
const ABV_MAX = 70
const URL_MAX = 2048
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000
// Cantina (specs/002-cellar-inventory): bottiglie in casa per etichetta.
export const CELLAR_MAX = 999
const MOVE_TYPES = ['first', 'in', 'out', 'adjust']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isIsoDate = (value) => typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
const isCellarQty = (value, min) => Number.isInteger(value) && value >= min && value <= CELLAR_MAX

/** @param {string} code */
export function isValidBarcode(code) {
  return typeof code === 'string' && /^\d{8,14}$/.test(code)
}

/** @param {string} url */
export function isHttpsUrl(url) {
  if (typeof url !== 'string' || url.length === 0 || url.length > URL_MAX) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function cleanText(value) {
  if (typeof value !== 'string') return ''
  // Rimuove caratteri di controllo tranne il newline (le note usano "\n" per gli elenchi).
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim()
}

/**
 * Unisce i vecchi campi "profumi" e "sapore" nell'analisi organolettica (migrazione v2 e
 * backup precedenti). Restituisce '' se entrambi sono vuoti.
 * @param {string} [aromas] @param {string} [taste]
 */
export function mergeLegacyTasting(aromas, taste) {
  const parts = []
  const a = cleanText(aromas ?? '')
  const t = cleanText(taste ?? '')
  if (a) parts.push(`Profumi: ${a}`)
  if (t) parts.push(`Sapore: ${t}`)
  return parts.join('\n')
}

function round5(n) {
  return Math.round(n * 1e5) / 1e5
}

/**
 * Valida e normalizza l'input di una bottiglia.
 * @param {object} input
 * @param {{now?: Date}} [opts]
 * @returns {{ok: true, value: object} | {ok: false, errors: Record<string,string>}}
 */
export function validateBottle(input, { now = new Date() } = {}) {
  const errors = {}
  const value = {}
  const data = input && typeof input === 'object' ? input : {}

  const name = cleanText(data.name)
  if (name.length < 1 || name.length > NAME_MAX) {
    errors.name = `Il nome deve avere tra 1 e ${NAME_MAX} caratteri.`
  }
  value.name = name

  const producer = cleanText(data.producer ?? '')
  if (producer.length > NAME_MAX) {
    errors.producer = `Il produttore può avere al massimo ${NAME_MAX} caratteri.`
  }
  value.producer = producer.length > 0 ? producer : null

  if (data.type !== 'wine' && data.type !== 'beer') {
    errors.type = 'Scegli vino o birra.'
  }
  value.type = data.type

  const subtype = cleanText(data.subtype ?? '')
  if (subtype.length > SUBTYPE_MAX) {
    errors.subtype = `La sottocategoria può avere al massimo ${SUBTYPE_MAX} caratteri.`
  }
  value.subtype = subtype.length > 0 ? subtype : null

  // Denominazione: solo per il vino; per la birra viene ignorata (FR-032).
  const appellation = cleanText(data.appellation ?? '').toUpperCase()
  if (data.type !== 'wine' || appellation.length === 0) {
    value.appellation = null
  } else if (!APPELLATIONS.includes(appellation)) {
    errors.appellation = `Scegli una denominazione tra ${APPELLATIONS.join(', ')}.`
    value.appellation = appellation
  } else {
    value.appellation = appellation
  }

  // Contrassegno di Stato: il seriale della fascetta dei vini DOC e DOCG (es. ADK007842971).
  // Si verifica con l'app ufficiale "Trust your wine" del Poligrafico; qui lo si conserva soltanto.
  const stateSeal = cleanText(data.stateSeal ?? '').replace(/\s+/g, '').toUpperCase()
  if (data.type !== 'wine' || stateSeal.length === 0) {
    value.stateSeal = null
  } else if (!/^[A-Z0-9]{6,20}$/.test(stateSeal)) {
    errors.stateSeal = 'Il contrassegno ha solo lettere e cifre, es. ADK007842971.'
    value.stateSeal = stateSeal
  } else {
    value.stateSeal = stateSeal
  }

  // Vitigno (specs/004-vitigno): solo per il vino; una voce d'elenco scritta a mano diventa
  // la voce canonica, un testo libero resta com'è.
  const grape = data.type === 'wine' ? canonicalGrape(data.grape) : null
  if (grape && grape.length > GRAPE_MAX) {
    errors.grape = `Il vitigno può avere al massimo ${GRAPE_MAX} caratteri.`
  }
  value.grape = grape

  const tasting = cleanText(data.tasting || mergeLegacyTasting(data.aromas, data.taste))
  if (tasting.length > TASTING_MAX) {
    errors.tasting = `L'analisi organolettica può avere al massimo ${TASTING_MAX} caratteri.`
  }
  value.tasting = tasting

  // Note organolettiche a chip (specs/003-cantina-viva-ui): solo voci dei vocabolari fissi;
  // valori sconosciuti scartati senza errore (un backup futuro con voci nuove resta importabile).
  value.aromaTags = keepValidAromas(data.aromaTags, data.type)
  value.pairingTags = normalizeTags(data.pairingTags, PAIRINGS)

  const pairing = cleanText(data.pairing ?? '')
  if (pairing.length > PAIRING_MAX) {
    errors.pairing = `L'abbinamento può avere al massimo ${PAIRING_MAX} caratteri.`
  }
  value.pairing = pairing

  if (data.abv === null || data.abv === undefined || String(data.abv).trim() === '') {
    value.abv = null
  } else {
    // Accetta anche la virgola decimale ("13,5").
    const abv = Number(String(data.abv).trim().replace(',', '.'))
    if (!Number.isFinite(abv) || abv < 0 || abv > ABV_MAX) {
      errors.abv = `La gradazione deve essere tra 0 e ${ABV_MAX} % vol.`
    }
    value.abv = Math.round(abv * 10) / 10
  }

  if (data.vintage === null || data.vintage === undefined || data.vintage === '') {
    value.vintage = null
  } else {
    const vintage = Number(data.vintage)
    const currentYear = now.getFullYear()
    if (!Number.isInteger(vintage) || vintage < 1900 || vintage > currentYear) {
      errors.vintage = `L'annata deve essere tra 1900 e ${currentYear}.`
    }
    value.vintage = vintage
  }

  // Un'etichetta "da assaggiare" (tastedAt === null, in cantina e mai stappata) non ha
  // ancora punteggio: lo riceve al primo stappo. Tutte le altre lo richiedono.
  const untasted = data.tastedAt === null
  if (untasted) {
    value.rating = null
  } else {
    const rating = Number(data.rating)
    if (data.rating === null || data.rating === '' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      errors.rating = 'Scegli un punteggio da 1 a 5.'
    }
    value.rating = rating
  }

  const consumedAtRaw = data.consumedAt ?? now.toISOString()
  const consumedAtDate = new Date(consumedAtRaw)
  if (Number.isNaN(consumedAtDate.getTime())) {
    errors.consumedAt = 'Data non valida.'
  } else if (consumedAtDate.getTime() - now.getTime() > FUTURE_TOLERANCE_MS) {
    errors.consumedAt = 'La data non può essere nel futuro.'
  }
  value.consumedAt = consumedAtDate.toISOString()

  // Primo assaggio: per una bevuta subito coincide con "quando" (consumedAt).
  if (untasted) {
    value.tastedAt = null
  } else if (data.tastedAt === undefined) {
    value.tastedAt = value.consumedAt
  } else if (!isIsoDate(data.tastedAt)) {
    errors.tastedAt = 'Data del primo assaggio non valida.'
  } else {
    value.tastedAt = new Date(data.tastedAt).toISOString()
  }

  const cellarCount = data.cellarCount ?? 0
  if (!isCellarQty(cellarCount, 0)) {
    errors.cellarCount = `Le bottiglie in cantina devono essere tra 0 e ${CELLAR_MAX}.`
  }
  value.cellarCount = cellarCount

  if (data.cellarUpdatedAt === null || data.cellarUpdatedAt === undefined) {
    value.cellarUpdatedAt = null
  } else if (!isIsoDate(data.cellarUpdatedAt)) {
    errors.cellarUpdatedAt = 'Data della cantina non valida.'
  } else {
    value.cellarUpdatedAt = new Date(data.cellarUpdatedAt).toISOString()
  }

  const notes = cleanText(data.notes ?? '')
  if (notes.length > NOTES_MAX) {
    errors.notes = `Le note possono avere al massimo ${NOTES_MAX} caratteri.`
  }
  value.notes = notes

  const barcodeRaw = cleanText(data.barcode ?? '')
  if (barcodeRaw.length === 0) {
    value.barcode = null
  } else if (!isValidBarcode(barcodeRaw)) {
    errors.barcode = 'Il codice a barre deve avere tra 8 e 14 cifre.'
    value.barcode = barcodeRaw
  } else {
    value.barcode = barcodeRaw
  }

  const externalUrlRaw = cleanText(data.externalUrl ?? '')
  if (externalUrlRaw.length === 0) {
    value.externalUrl = null
  } else if (!isHttpsUrl(externalUrlRaw)) {
    errors.externalUrl = 'Inserisci un link che inizi con https://'
    value.externalUrl = externalUrlRaw
  } else {
    value.externalUrl = externalUrlRaw
  }

  if (data.location === null || data.location === undefined) {
    value.location = null
  } else {
    const { lat, lon, accuracy } = data.location
    const latNum = Number(lat)
    const lonNum = Number(lon)
    const accNum = Number(accuracy ?? 0)
    if (
      !Number.isFinite(latNum) ||
      !Number.isFinite(lonNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lonNum < -180 ||
      lonNum > 180 ||
      accNum < 0
    ) {
      errors.location = 'Posizione non valida.'
      value.location = data.location
    } else {
      value.location = { lat: round5(latNum), lon: round5(lonNum), accuracy: Math.round(accNum) }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }
  return { ok: true, value }
}

/**
 * Movimento di cantina (specs/002-cellar-inventory/data-model.md). Usato dall'import del
 * backup: ogni movimento del file è validato prima di scrivere.
 * @param {object} data
 * @returns {{ok: true, value: object} | {ok: false, errors: Record<string,string>}}
 */
export function validateMove(data) {
  const errors = {}
  const value = { id: data?.id, bottleId: data?.bottleId, type: data?.type, qty: null, from: null, to: null, at: data?.at }

  if (typeof value.id !== 'string' || !UUID_RE.test(value.id)) errors.id = 'Identificativo non valido.'
  if (typeof value.bottleId !== 'string' || !UUID_RE.test(value.bottleId)) errors.bottleId = 'Etichetta non valida.'
  if (!MOVE_TYPES.includes(value.type)) errors.type = 'Tipo di movimento non valido.'
  if (!isIsoDate(value.at)) errors.at = 'Data non valida.'

  if (value.type === 'in') {
    if (!isCellarQty(data.qty, 1)) errors.qty = `Le bottiglie aggiunte devono essere tra 1 e ${CELLAR_MAX}.`
    value.qty = data.qty
  } else if (value.type === 'out') {
    if (data.qty !== 1) errors.qty = 'Si stappa una bottiglia alla volta.'
    value.qty = 1
  } else if (value.type === 'adjust') {
    if (!isCellarQty(data.from, 0) || !isCellarQty(data.to, 0)) {
      errors.adjust = `La rettifica deve andare da 0 a ${CELLAR_MAX} bottiglie.`
    }
    value.from = data.from
    value.to = data.to
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value }
}
