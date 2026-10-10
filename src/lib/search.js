import { formatMonthHeading, monthKey } from './format.js'
import { WINE_SUBTYPES, BEER_SUBTYPES } from './subtypes.js'

/** Minuscolo e senza accenti, per confronti di ricerca. @param {string} text */
export function normalizeText(text) {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Chiave di confronto delle voci degli elenchi (specs/006-menu-personalizzabili): due voci che
 * differiscono solo per maiuscole, accenti o spazi hanno la stessa chiave.
 * @param {string|null|undefined} text
 */
export function listKey(text) {
  return normalizeText(text).replace(/\s+/g, ' ').trim()
}

/**
 * Data del primo assaggio (specs/002-cellar-inventory): `null` = da assaggiare. I record
 * senza il campo (precedenti alla cantina) sono assaggiati il giorno della bevuta.
 * @param {{tastedAt?: string|null, consumedAt: string}} bottle
 */
export function tastedDate(bottle) {
  return bottle.tastedAt === undefined ? bottle.consumedAt : bottle.tastedAt
}

// Diario: etichette assaggiate. Cantina: con bottiglie in casa o ancora da assaggiare (anche
// quelle rimaste a 0 con "Più tardi" all'ultimo stappo: altrimenti non sarebbero raggiungibili).
const inTab = (b, cellar) => (cellar ? (b.cellarCount ?? 0) > 0 || tastedDate(b) === null : tastedDate(b) !== null)

// Fasce del filtro "Gradazione", uguali per vino e birra: estremi compresi, tranne dove l'etichetta
// dice "meno di" / "oltre" (`maxOpen` / `minOpen`: quell'estremo è escluso). Una gradazione che cade
// su un estremo condiviso (es. 13%) compare in entrambe le fasce.
export const ABV_BANDS = [
  { key: 'lt6', label: 'Meno di 6%', min: 0, max: 6, maxOpen: true },
  { key: '6-9', label: '6–9%', min: 6, max: 9 },
  { key: '9-12', label: '9–12%', min: 9, max: 12 },
  { key: '12-13', label: '12–13%', min: 12, max: 13 },
  { key: '13-14', label: '13–14%', min: 13, max: 14 },
  { key: '14-15', label: '14–15%', min: 14, max: 15 },
  { key: 'gt15', label: 'Oltre 15%', min: 15, max: Infinity, minOpen: true },
]

const inBand = (abv, b) =>
  abv != null && (b.minOpen ? abv > b.min : abv >= b.min) && (b.maxOpen ? abv < b.max : abv <= b.max)

const byTastedDesc = (a, b) => tastedDate(b).localeCompare(tastedDate(a))
const byCellarDesc = (a, b) => (b.cellarUpdatedAt ?? '').localeCompare(a.cellarUpdatedAt ?? '')

/**
 * Elenco della Home. Senza `cellar`: solo etichette assaggiate, dal primo assaggio più
 * recente. Con `cellar`: quelle con bottiglie in casa e quelle ancora da assaggiare,
 * dall'ultima entrata in cantina; anno, mese e punteggio non si applicano. `minRating`: punteggio
 * minimo; `abv`: chiave di una fascia di ABV_BANDS (le bottiglie senza gradazione restano fuori).
 * @param {object[]} bottles
 * @param {{query?: string, type?: 'wine'|'beer', year?: number|null, month?: number|null, minRating?: number|null, abv?: string|null, cellar?: boolean}} filters
 */
export function filterBottles(bottles, { query, type, subtype, year, month, minRating, abv, cellar = false } = {}) {
  const needle = query ? normalizeText(query) : ''
  if (cellar) {
    year = null
    month = null
    minRating = null
  }
  const band = abv ? ABV_BANDS.find((b) => b.key === abv) : null
  return bottles
    .filter((b) => {
      // Con "In cantina" ci sono anche le etichette da assaggiare rimaste a 0 bottiglie
      // ("Più tardi" all'ultimo stappo): altrimenti non sarebbero raggiungibili da nessuna parte.
      if (!inTab(b, cellar)) return false
      if (type && b.type !== type) return false
      if (subtype && b.subtype !== subtype) return false
      if (minRating && !(b.rating >= minRating)) return false
      if (band && !inBand(b.abv, band)) return false
      if (year || month) {
        // Anno e mese in ora locale, come li vede l'utente nel registro.
        const d = new Date(tastedDate(b))
        if (year && d.getFullYear() !== year) return false
        if (month && d.getMonth() + 1 !== month) return false
      }
      if (!needle) return true
      return (
        normalizeText(b.name).includes(needle) ||
        normalizeText(b.producer ?? '').includes(needle) ||
        // Vitigno del vino (specs/004-vitigno).
        normalizeText(b.grape ?? '').includes(needle) ||
        // Aromi e abbinamenti scelti a chip (specs/003-cantina-viva-ui).
        [...(b.aromaTags ?? []), ...(b.pairingTags ?? [])].some((tag) => normalizeText(tag).includes(needle))
      )
    })
    .sort(cellar ? byCellarDesc : byTastedDesc)
}

/**
 * Scheda Wishlist (specs/005-wishlist): dal desiderio aggiunto più di recente; la ricerca
 * guarda anche le note, dove c'è chi l'ha consigliato.
 * @param {object[]} wishes
 * @param {{query?: string, type?: 'wine'|'beer'|null}} filters
 */
export function filterWishes(wishes, { query, type } = {}) {
  const needle = query ? normalizeText(query) : ''
  return wishes
    .filter((w) => {
      if (type && w.type !== type) return false
      if (!needle) return true
      return [w.name, w.producer, w.notes].some((text) => normalizeText(text ?? '').includes(needle))
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * Tipologie (sottocategorie) per il filtro "Tipologia" di Diario e Cantina: un gruppo per il
 * vino e uno per la birra, solo quello del tipo scelto se c'è. Sempre tutto l'elenco ricevuto
 * (predefinite nel loro ordine e voci aggiunte, specs/006), così il filtro si vede anche se
 * nessuna bottiglia ha ancora una tipologia; poi i valori presenti nella scheda ma fuori elenco,
 * in ordine alfabetico.
 * @param {object[]} bottles
 * @param {{type?: 'wine'|'beer'|null, cellar?: boolean}} filters
 * @param {{wine: string[], beer: string[]}} [lists] elenchi completi delle tipologie
 * @returns {{type: 'wine'|'beer', label: string, subtypes: string[]}[]}
 */
export function availableSubtypes(
  bottles,
  { type = null, cellar = false } = {},
  lists = { wine: WINE_SUBTYPES, beer: BEER_SUBTYPES },
) {
  const groups = [
    { type: 'wine', label: 'Vino', predefined: lists.wine },
    { type: 'beer', label: 'Birra', predefined: lists.beer },
  ]
  return groups
    .filter((g) => !type || g.type === type)
    .map(({ type: groupType, label, predefined }) => {
      const present = new Set(
        bottles.filter((b) => b.type === groupType && b.subtype && inTab(b, cellar)).map((b) => b.subtype),
      )
      const known = new Set(predefined.map(listKey))
      const custom = [...present].filter((s) => !known.has(listKey(s))).sort((a, b) => a.localeCompare(b, 'it'))
      return { type: groupType, label, subtypes: [...predefined, ...custom] }
    })
}

/** Riepilogo della cantina: etichette e bottiglie in casa. @param {object[]} list */
export function cellarSummary(list) {
  return { labels: list.length, bottles: list.reduce((sum, b) => sum + (b.cellarCount ?? 0), 0) }
}

/** Anni presenti nel registro, dal più recente. @param {object[]} bottles */
export function availableYears(bottles) {
  const tasted = bottles.filter((b) => tastedDate(b) !== null)
  const years = new Set(tasted.map((b) => new Date(tastedDate(b)).getFullYear()))
  return [...years].sort((a, b) => b - a)
}

/**
 * Mesi (1–12) presenti nel registro, in ordine di calendario; se c'è un anno, solo di
 * quell'anno. @param {object[]} bottles @param {number|null} [year]
 */
export function availableMonths(bottles, year = null) {
  const months = new Set()
  for (const b of bottles) {
    if (tastedDate(b) === null) continue
    const d = new Date(tastedDate(b))
    if (!year || d.getFullYear() === year) months.add(d.getMonth() + 1)
  }
  return [...months].sort((a, b) => a - b)
}

/**
 * Raggruppa per mese del primo assaggio (ordine discendente, coerente con l'ordinamento in ingresso).
 * @param {object[]} bottles
 */
export function groupByMonth(bottles) {
  const groups = []
  const byKey = new Map()
  for (const bottle of bottles) {
    const key = monthKey(tastedDate(bottle))
    let group = byKey.get(key)
    if (!group) {
      group = { key, heading: formatMonthHeading(tastedDate(bottle)), items: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    group.items.push(bottle)
  }
  return groups
}
