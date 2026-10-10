// Voci aggiunte dall'utente agli elenchi del modulo bottiglia (specs/006-menu-personalizzabili).
// Stanno in una sola riga di `settings`: `{ [listId]: [{ text, group? }] }` (research.md R1).
// Le funzioni che scrivono vanno chiamate dentro una transazione che include `db.settings`.

import { liveQuery } from 'dexie'
import { db } from './db.js'
import { listById, listIdFor, allTexts, canonicalIn, cleanEntry } from '../lib/lists.js'
import { listKey } from '../lib/search.js'

export const SETTING_KEY = 'customLists'

/** Le voci aggiunte, o `{}`. @param {import('dexie').Table} [table] */
export async function getCustomLists(table = db.settings) {
  const row = await table.get(SETTING_KEY)
  return row?.value ?? {}
}

/** Observable Dexie delle voci aggiunte: modulo, "Com'è?", filtri e Impostazioni si aggiornano da soli. */
export function liveCustomLists() {
  return liveQuery(() => getCustomLists())
}

const FIELDS = ['grape', 'subtype', 'appellation', 'aromaTags', 'pairingTags']
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])

/**
 * Prima di salvare una bottiglia: i valori che corrispondono a una voce aggiunta ne prendono il
 * testo; quelli fuori elenco si aggiungono all'elenco del loro tipo (research R4). In modifica
 * (`previous`) si aggiunge solo ciò che è cambiato, così una voce eliminata dalle Impostazioni
 * non ricompare salvando la bottiglia per altro. Da chiamare nella stessa transazione del
 * salvataggio: se questo fallisce, nessuna voce viene aggiunta.
 * @param {object} bottle bottiglia già validata
 * @param {object|null} [previous] la stessa bottiglia com'era salvata
 * @returns {Promise<object>} la bottiglia con i valori riportati alle voci dell'elenco
 */
export async function learnFromBottle(bottle, previous = null) {
  const custom = structuredClone(await getCustomLists())
  const result = { ...bottle }
  let changed = false

  for (const field of FIELDS) {
    const listId = listIdFor(field, bottle.type)
    if (!listId) continue
    // Un valore già sulla bottiglia non si impara (FR-010), anche se il tipo è cambiato: così una
    // voce eliminata dalle Impostazioni non torna nell'elenco cambiando vino in birra.
    const before = new Set(previous ? asArray(previous[field]).map(listKey) : [])
    const texts = allTexts(listId, custom)
    const learned = asArray(bottle[field]).map((value) => {
      const known = canonicalIn(texts, value)
      if (known) return known
      if (before.has(listKey(value))) return value
      custom[listId] = [...(custom[listId] ?? []), listId === 'grape' ? { text: value, group: 'other' } : { text: value }]
      texts.push(value)
      changed = true
      return value
    })
    result[field] = Array.isArray(bottle[field]) ? learned : (learned[0] ?? bottle[field])
  }

  if (changed) await db.settings.put({ key: SETTING_KEY, value: custom })
  return result
}


// --- Gestione dalle Impostazioni ---------------------------------------------------------

/** Errore di una modifica agli elenchi: il messaggio è già per l'utente. */
export class ListError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ListError'
  }
}

function requireList(listId) {
  const list = listById(listId)
  if (!list) throw new ListError('Elenco non valido.')
  return list
}

/** Voce ripulita o `ListError` (vuota, troppo lunga). */
function requireText(list, text) {
  const clean = cleanEntry(list.id, text)
  if (clean) return clean
  const empty = typeof text !== 'string' || text.trim().length === 0
  throw new ListError(empty ? 'Scrivi la voce.' : `Al massimo ${list.max} caratteri.`)
}

const isPredefined = (list, text) => canonicalIn(list.predefined, text) !== null
const entryIndex = (custom, listId, text) => (custom[listId] ?? []).findIndex((e) => listKey(e.text) === listKey(text))

async function saveCustom(custom) {
  const compact = Object.fromEntries(Object.entries(custom).filter(([, entries]) => entries.length > 0))
  await db.settings.put({ key: SETTING_KEY, value: compact })
}

/**
 * Aggiunge una voce a un elenco. Per il Vitigno `group` è `red`, `white` o `other`.
 * @param {string} listId @param {string} text @param {'red'|'white'|'other'} [group]
 */
export async function addEntry(listId, text, group = 'other') {
  const list = requireList(listId)
  const clean = requireText(list, text)
  return db.transaction('rw', db.settings, async () => {
    const custom = await getCustomLists()
    const existing = canonicalIn(allTexts(listId, custom), clean)
    if (existing) throw new ListError(`C’è già «${existing}».`)
    const entry = listId === 'grape' ? { text: clean, group: ['red', 'white'].includes(group) ? group : 'other' } : { text: clean }
    await saveCustom({ ...custom, [listId]: [...(custom[listId] ?? []), entry] })
    return entry
  })
}

/** Toglie una voce aggiunta. Le bottiglie non cambiano (FR-019). */
export async function removeEntry(listId, text) {
  const list = requireList(listId)
  return db.transaction('rw', db.settings, async () => {
    const custom = await getCustomLists()
    const index = entryIndex(custom, listId, text)
    if (index < 0) {
      if (isPredefined(list, text)) throw new ListError('Le voci predefinite non si possono eliminare.')
      return
    }
    await saveCustom({ ...custom, [listId]: custom[listId].filter((_, i) => i !== index) })
  })
}

/** Le bottiglie che hanno `text` nel campo di questo elenco (per chiave, e del tipo giusto). */
function usedBy(bottles, list, text) {
  const key = listKey(text)
  return bottles.filter((bottle) => {
    if (list.type && bottle.type !== list.type) return false
    return asArray(bottle[list.field]).some((value) => listKey(value) === key)
  })
}

/** Quante bottiglie cambierebbero rinominando la voce: stessa regola di `updateEntry`. */
export async function countUsage(listId, text) {
  const list = requireList(listId)
  return usedBy(await db.bottles.toArray(), list, text).length
}

/**
 * Rinomina una voce aggiunta e/o ne cambia il gruppo (solo Vitigno). Rinominando, le bottiglie che
 * la usano passano al nuovo testo e ricevono un nuovo `updatedAt`, così la modifica arriva anche
 * tramite backup. Tutto in una transazione: o tutto o niente.
 * @param {string} listId @param {string} oldText
 * @param {{text?: string, group?: 'red'|'white'|'other'}} change
 * @returns {Promise<{updatedBottles: number}>}
 */
export async function updateEntry(listId, oldText, { text, group } = {}) {
  const list = requireList(listId)
  return db.transaction('rw', db.settings, db.bottles, async () => {
    const custom = await getCustomLists()
    const index = entryIndex(custom, listId, oldText)
    if (index < 0) {
      throw new ListError(isPredefined(list, oldText) ? 'Le voci predefinite non si possono modificare.' : 'Voce non trovata.')
    }
    const entry = custom[listId][index]
    const newText = text === undefined ? entry.text : requireText(list, text)
    if (listKey(newText) !== listKey(entry.text)) {
      const existing = canonicalIn(allTexts(listId, custom), newText)
      if (existing) throw new ListError(`C’è già «${existing}».`)
    }
    const updated = { ...entry, text: newText }
    if (listId === 'grape' && group) updated.group = ['red', 'white'].includes(group) ? group : 'other'
    await saveCustom({ ...custom, [listId]: custom[listId].map((e, i) => (i === index ? updated : e)) })

    // Le bottiglie che hanno il vecchio testo (anche scritto diversamente) passano al nuovo.
    const now = new Date().toISOString()
    const changed = []
    for (const bottle of usedBy(await db.bottles.toArray(), list, entry.text)) {
      const key = listKey(entry.text)
      let value
      if (list.multiple) {
        const seen = new Set()
        value = bottle[list.field]
          .map((v) => (listKey(v) === key ? newText : v))
          .filter((v) => !seen.has(listKey(v)) && seen.add(listKey(v)))
      } else {
        value = newText
      }
      if (JSON.stringify(value) !== JSON.stringify(bottle[list.field])) changed.push({ ...bottle, [list.field]: value, updatedAt: now })
    }
    if (changed.length > 0) await db.bottles.bulkPut(changed)
    return { updatedBottles: changed.length }
  })
}
