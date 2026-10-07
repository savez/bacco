import { liveQuery } from 'dexie'
import { db } from './db.js'
import { move } from './bottles.js'
import { CELLAR_MAX } from '../lib/validate.js'
import { PAIRINGS, keepValidAromas, normalizeTags } from '../lib/tastingTags.js'

// Cantina personale (specs/002-cellar-inventory/data-model.md). Ogni operazione scrive il
// movimento e la quantità dell'etichetta nella stessa transazione, così il registro resta
// sempre coerente con `cellarCount` (SC-104). Ogni operazione restituisce anche lo stato
// precedente (`snapshot`) per poterla annullare subito dopo (FR-107).

export class CellarError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CellarError'
  }
}

const CELLAR_FIELDS = ['cellarCount', 'cellarUpdatedAt', 'rating', 'tasting', 'tastedAt', 'updatedAt', 'aromaTags', 'pairingTags', 'pairing']
const SNAPSHOT_DEFAULTS = { aromaTags: [], pairingTags: [], tasting: '', pairing: '' }

async function getOrFail(id) {
  const bottle = await db.bottles.get(id)
  if (!bottle) throw new CellarError('Bottiglia non trovata.')
  return bottle
}

const snapshotOf = (bottle) => Object.fromEntries(CELLAR_FIELDS.map((key) => [key, bottle[key] ?? SNAPSHOT_DEFAULTS[key] ?? null]))

/**
 * Mette in cantina `n` bottiglie in più (FR-102).
 * @param {string} id
 * @param {number} n
 */
export async function addToCellar(id, n) {
  if (!Number.isInteger(n) || n < 1) throw new CellarError('Aggiungi almeno 1 bottiglia.')
  return db.transaction('rw', db.bottles, db.cellarMoves, async () => {
    const bottle = await getOrFail(id)
    const current = bottle.cellarCount ?? 0
    if (current + n > CELLAR_MAX) {
      throw new CellarError(`In cantina possono stare al massimo ${CELLAR_MAX} bottiglie per etichetta.`)
    }
    const entry = move(id, 'in', { qty: n })
    await db.bottles.update(id, { cellarCount: current + n, cellarUpdatedAt: entry.at, updatedAt: entry.at })
    await db.cellarMoves.add(entry)
    return { move: entry, snapshot: snapshotOf(bottle) }
  })
}

/**
 * Registro movimenti di un'etichetta, dal più recente (FR-106).
 * @param {string} id
 */
export function listMoves(id) {
  return liveQuery(async () => {
    const moves = await db.cellarMoves.where('[bottleId+at]').between([id, ''], [id, '￿']).toArray()
    // A parità di data (registrazione con bottiglie in cantina) la prima registrazione va in fondo.
    return moves.reverse().sort((a, b) => b.at.localeCompare(a.at) || (a.type === 'first') - (b.type === 'first'))
  })
}

/**
 * Stappa una bottiglia (FR-103). `needsTasting` è vero al primo stappo di un'etichetta
 * mai assaggiata: l'interfaccia chiede allora punteggio e analisi (FR-109).
 * @param {string} id
 */
export async function uncork(id) {
  return db.transaction('rw', db.bottles, db.cellarMoves, async () => {
    const bottle = await getOrFail(id)
    const current = bottle.cellarCount ?? 0
    if (current < 1) throw new CellarError('Non ci sono bottiglie in cantina da stappare.')
    const entry = move(id, 'out', { qty: 1 })
    await db.bottles.update(id, { cellarCount: current - 1, updatedAt: entry.at })
    await db.cellarMoves.add(entry)
    return { move: entry, snapshot: snapshotOf(bottle), needsTasting: bottle.tastedAt === null }
  })
}

/**
 * Primo assaggio: punteggio (obbligatorio), chip di aromi e abbinamento e testi liberi.
 * @param {string} id
 * @param {{rating: number, tasting?: string, pairing?: string, aromaTags?: string[], pairingTags?: string[]}} input
 */
export async function recordFirstTasting(id, { rating, tasting = '', pairing = '', aromaTags = [], pairingTags = [] }) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new CellarError('Scegli un punteggio da 1 a 5.')
  return db.transaction('rw', db.bottles, async () => {
    const bottle = await getOrFail(id)
    const now = new Date().toISOString()
    await db.bottles.update(id, {
      rating,
      tasting: String(tasting).trim().slice(0, 1000),
      pairing: String(pairing).trim().slice(0, 500),
      aromaTags: keepValidAromas(aromaTags, bottle.type),
      pairingTags: normalizeTags(pairingTags, PAIRINGS),
      tastedAt: now,
      updatedAt: now,
    })
    return db.bottles.get(id)
  })
}

/**
 * Annulla un'operazione appena fatta (FR-107): elimina il suo movimento e ripristina i
 * campi dell'etichetta com'erano prima, compreso un eventuale primo assaggio.
 * @param {{move: {id: string, bottleId: string}, snapshot: object}} operation
 */
export async function undoMove({ move: entry, snapshot }) {
  return db.transaction('rw', db.bottles, db.cellarMoves, async () => {
    await getOrFail(entry.bottleId)
    await db.cellarMoves.delete(entry.id)
    await db.bottles.update(entry.bottleId, snapshot)
  })
}

/**
 * "Correggi quantità" (FR-118): scrive il numero reale di bottiglie con un movimento di
 * rettifica (prima e dopo). Solo un aumento conta come entrata per l'ordine della cantina.
 * @param {string} id
 * @param {number} to
 */
export async function adjustCellar(id, to) {
  if (!Number.isInteger(to) || to < 0 || to > CELLAR_MAX) {
    throw new CellarError(`Indica un numero da 0 a ${CELLAR_MAX}.`)
  }
  return db.transaction('rw', db.bottles, db.cellarMoves, async () => {
    const bottle = await getOrFail(id)
    const from = bottle.cellarCount ?? 0
    if (to === from) throw new CellarError(`In cantina ci sono già ${to} bottiglie.`)
    const entry = move(id, 'adjust', { from, to })
    const changes = { cellarCount: to, updatedAt: entry.at }
    if (to > from) changes.cellarUpdatedAt = entry.at
    await db.bottles.update(id, changes)
    await db.cellarMoves.add(entry)
    return { move: entry, snapshot: snapshotOf(bottle) }
  })
}
