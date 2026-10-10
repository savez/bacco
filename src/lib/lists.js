// Elenchi del modulo bottiglia (specs/006-menu-personalizzabili): le voci predefinite restano
// in grapes.js, subtypes.js e tastingTags.js; qui si descrivono i 7 elenchi e si compone
// l'elenco completo (predefinite + voci aggiunte dall'utente). Solo funzioni pure: le voci
// aggiunte stanno in src/db/lists.js.

import { RED_GRAPES, WHITE_GRAPES, GRAPE_MAX } from './grapes.js'
import { WINE_SUBTYPES, BEER_SUBTYPES, APPELLATIONS } from './subtypes.js'
import { WINE_AROMAS, BEER_AROMAS, PAIRINGS } from './tastingTags.js'
import { listKey } from './search.js'

export const SUBTYPE_MAX = 40
export const APPELLATION_MAX = 30
// Un aroma o un abbinamento è una voce di menu: breve. Per bottiglia, al più TAGS_MAX.
export const TAG_MAX = 40
export const TAGS_MAX = 30

export const GRAPE_GROUPS = [
  { id: 'red', label: 'Bacca nera' },
  { id: 'white', label: 'Bacca bianca' },
  { id: 'other', label: 'Altri vitigni' },
]

/**
 * `field`: campo della bottiglia; `type`: tipo di bevanda a cui vale (null = entrambi);
 * `multiple`: scelta multipla; `ordered`: predefinite nell'ordine di oggi (poi le aggiunte A→Z)
 * invece che tutto in ordine alfabetico.
 */
export const LISTS = [
  { id: 'grape', label: 'Vitigno', field: 'grape', type: 'wine', multiple: false, max: GRAPE_MAX, predefined: [...RED_GRAPES, ...WHITE_GRAPES] },
  { id: 'subtype.wine', label: 'Tipologia del vino', field: 'subtype', type: 'wine', multiple: false, max: SUBTYPE_MAX, ordered: true, predefined: WINE_SUBTYPES },
  { id: 'subtype.beer', label: 'Tipologia della birra', field: 'subtype', type: 'beer', multiple: false, max: SUBTYPE_MAX, ordered: true, predefined: BEER_SUBTYPES },
  { id: 'appellation', label: 'Denominazione', field: 'appellation', type: 'wine', multiple: false, max: APPELLATION_MAX, ordered: true, predefined: APPELLATIONS },
  { id: 'aroma.wine', label: 'Aromi del vino', field: 'aromaTags', type: 'wine', multiple: true, max: TAG_MAX, predefined: WINE_AROMAS },
  { id: 'aroma.beer', label: 'Aromi della birra', field: 'aromaTags', type: 'beer', multiple: true, max: TAG_MAX, predefined: BEER_AROMAS },
  { id: 'pairing', label: "Con cosa l'ho mangiato", field: 'pairingTags', type: null, multiple: true, max: TAG_MAX, predefined: PAIRINGS },
]

/** @param {string} listId */
export const listById = (listId) => LISTS.find((l) => l.id === listId)

const byIt = (a, b) => a.localeCompare(b, 'it')

/**
 * Voce ripulita (caratteri di controllo tolti, spazi compressi e tolti ai bordi), o `null` se è
 * vuota, non è testo o supera il limite dell'elenco.
 * @param {string} listId @param {unknown} text
 */
export function cleanEntry(listId, text) {
  if (typeof text !== 'string') return null
  // eslint-disable-next-line no-control-regex
  const clean = text.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
  const list = listById(listId)
  if (clean.length === 0 || !list || clean.length > list.max) return null
  return clean
}

const customOf = (customLists, listId) => (Array.isArray(customLists?.[listId]) ? customLists[listId] : [])

/**
 * Elenco completo: predefinite + voci aggiunte. Il Vitigno è `{ red, white, other }` (A→Z in
 * ogni gruppo); Tipologia e Denominazione hanno le predefinite nell'ordine di oggi e poi le
 * aggiunte A→Z; Aromi e Abbinamenti sono tutti in ordine alfabetico (FR-003).
 * @param {string} listId @param {Record<string, {text: string, group?: string}[]>} [customLists]
 */
export function fullList(listId, customLists = {}) {
  const list = listById(listId)
  const custom = customOf(customLists, listId)
  if (listId === 'grape') {
    const groups = { red: [...RED_GRAPES], white: [...WHITE_GRAPES], other: [] }
    for (const { text, group } of custom) groups[group === 'red' || group === 'white' ? group : 'other'].push(text)
    for (const id of Object.keys(groups)) groups[id].sort(byIt)
    return groups
  }
  const added = custom.map((e) => e.text)
  if (list.ordered) return [...list.predefined, ...added.sort(byIt)]
  return [...list.predefined, ...added].sort(byIt)
}

/** Tutte le voci di un elenco in un'unica lista (per il Vitigno: i tre gruppi uno dopo l'altro). */
export function allTexts(listId, customLists = {}) {
  const full = fullList(listId, customLists)
  return Array.isArray(full) ? full : [...full.red, ...full.white, ...full.other]
}

/**
 * La voce di `texts` con la stessa chiave (FR-004) di `text`, o `null`.
 * @param {string[]} texts @param {string|null|undefined} text
 */
export function canonicalIn(texts, text) {
  const key = listKey(text)
  return key ? (texts.find((t) => listKey(t) === key) ?? null) : null
}

/**
 * L'elenco a cui appartiene un campo della bottiglia per un tipo, o `null` se il campo non vale
 * per quel tipo.
 * @param {'grape'|'subtype'|'appellation'|'aromaTags'|'pairingTags'} field
 * @param {'wine'|'beer'|null|undefined} type
 */
export function listIdFor(field, type) {
  if (type !== 'wine' && type !== 'beer') return null
  const found = LISTS.find((l) => l.field === field && (l.type === null || l.type === type))
  return found ? found.id : null
}

/**
 * Voci aggiunte lette da un backup (formato: contracts/backup-format.md): solo i 7 elenchi
 * noti, solo valori che sono elenchi; ogni voce ripulita, con il gruppo solo per il Vitigno
 * (assente o non valido → `other`). Una voce non valida è un errore.
 * @param {unknown} raw
 * @returns {Record<string, {text: string, group?: string}[]>}
 */
export function parseCustomLists(raw) {
  const result = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result
  for (const list of LISTS) {
    const entries = raw[list.id]
    if (!Array.isArray(entries)) continue
    result[list.id] = entries.map((entry, index) => {
      const text = cleanEntry(list.id, typeof entry === 'string' ? entry : entry?.text)
      if (!text) throw new Error(`Elenco "${list.label}", voce ${index + 1}: testo non valido.`)
      if (list.id !== 'grape') return { text }
      return { text, group: entry?.group === 'red' || entry?.group === 'white' ? entry.group : 'other' }
    })
  }
  return result
}

/**
 * Unisce le voci di un backup a quelle presenti: per chiave, senza doppioni; una voce uguale a
 * una predefinita o già presente si salta (la presente tiene testo e gruppo).
 * @returns {{value: Record<string, object[]>, changed: boolean}}
 */
export function mergeCustomLists(existing = {}, incoming = {}) {
  const value = Object.fromEntries(Object.entries(existing).map(([id, entries]) => [id, [...entries]]))
  let changed = false
  for (const [listId, entries] of Object.entries(incoming)) {
    const texts = allTexts(listId, value)
    for (const entry of entries) {
      if (canonicalIn(texts, entry.text)) continue
      value[listId] = [...(value[listId] ?? []), entry]
      texts.push(entry.text)
      changed = true
    }
  }
  return { value, changed }
}
