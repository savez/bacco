import { liveQuery } from 'dexie'
import { db } from './db.js'
import { validateBottle } from '../lib/validate.js'
import { normalizeText } from '../lib/search.js'

/**
 * Nuovo movimento di cantina (data-model.md); i campi non usati dal tipo restano null.
 * @param {string} bottleId
 * @param {'first'|'in'|'out'|'adjust'} type
 */
export function move(bottleId, type, { qty = null, from = null, to = null, at = new Date().toISOString() } = {}) {
  return { id: crypto.randomUUID(), bottleId, type, qty, from, to, at }
}

export class ValidationError extends Error {
  /** @param {Record<string,string>} errors */
  constructor(errors) {
    super('Dati della bottiglia non validi.')
    this.name = 'ValidationError'
    this.errors = errors
  }
}

/**
 * `removeWishId`: la bottiglia nasce da "L'ho provato" (specs/005-wishlist) e il desiderio si
 * toglie nella stessa transazione: o entrambe le cose o nessuna.
 * @param {object} input
 * @param {{addPhotos?: {blob: Blob, thumb: Blob}[], removeWishId?: string|null}} [opts]
 */
export async function createBottle(input, { addPhotos = [], removeWishId = null } = {}) {
  const result = validateBottle(input)
  if (!result.ok) throw new ValidationError(result.errors)
  const now = new Date().toISOString()
  const bottle = { ...result.value, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  // "Quando" della registrazione: anche i movimenti iniziali della cantina partono da lì.
  const registeredAt = bottle.consumedAt
  if (bottle.cellarCount > 0) bottle.cellarUpdatedAt = registeredAt
  const moves = [move(bottle.id, 'first', { at: registeredAt })]
  if (bottle.cellarCount > 0) moves.push(move(bottle.id, 'in', { qty: bottle.cellarCount, at: registeredAt }))

  await db.transaction('rw', db.bottles, db.photos, db.cellarMoves, db.wishes, async () => {
    await db.bottles.put(bottle)
    await db.cellarMoves.bulkAdd(moves)
    if (removeWishId) await db.wishes.delete(removeWishId)
    await Promise.all(
      addPhotos.map((photo, order) =>
        db.photos.put({
          id: crypto.randomUUID(),
          bottleId: bottle.id,
          order,
          blob: photo.blob,
          thumb: photo.thumb,
          createdAt: now,
        }),
      ),
    )
  })
  return bottle
}

/**
 * @param {string} id
 * @param {object} input
 * @param {{addPhotos?: {blob: Blob, thumb: Blob}[], removePhotoIds?: string[]}} [opts]
 */
export async function updateBottle(id, input, { addPhotos = [], removePhotoIds = [] } = {}) {
  const existing = await db.bottles.get(id)
  if (!existing) throw new Error('Bottiglia non trovata.')
  const now = new Date().toISOString()
  // La modifica non tocca la cantina (si gestisce dalla scheda). Un'etichetta da assaggiare
  // a cui si dà un punteggio dal modulo diventa assaggiata adesso.
  // Per una bevuta subito il primo assaggio È "quando": se l'utente cambia data, la segue.
  const followsWhen = existing.tastedAt != null && existing.tastedAt === existing.consumedAt
  const tastedAt = followsWhen
    ? (input.consumedAt ?? existing.consumedAt)
    : (existing.tastedAt ?? (input.rating ? now : null))
  const result = validateBottle({
    ...input,
    tastedAt,
    cellarCount: existing.cellarCount ?? 0,
    cellarUpdatedAt: existing.cellarUpdatedAt ?? null,
  })
  if (!result.ok) throw new ValidationError(result.errors)

  return db.transaction('rw', db.bottles, db.photos, async () => {
    const updated = { ...existing, ...result.value, id, updatedAt: now }
    await db.bottles.put(updated)

    if (removePhotoIds.length > 0) {
      await db.photos.bulkDelete(removePhotoIds)
    }

    // Rinumera le foto rimanenti 0..n-1: "order 0 = copertina" (data-model.md)
    // deve restare vero anche dopo un'eliminazione, non solo all'inserimento.
    const remaining = await db.photos.where('bottleId').equals(id).sortBy('order')
    await Promise.all(
      remaining.map((photo, index) => (photo.order === index ? null : db.photos.update(photo.id, { order: index }))),
    )

    if (addPhotos.length > 0) {
      const nextOrder = remaining.length
      await Promise.all(
        addPhotos.map((photo, i) =>
          db.photos.put({
            id: crypto.randomUUID(),
            bottleId: id,
            order: nextOrder + i,
            blob: photo.blob,
            thumb: photo.thumb,
            createdAt: now,
          }),
        ),
      )
    }
    return updated
  })
}

/** @param {string} id */
export async function deleteBottle(id) {
  await db.transaction('rw', db.bottles, db.photos, db.cellarMoves, async () => {
    await db.photos.where('bottleId').equals(id).delete()
    await db.cellarMoves.where('bottleId').equals(id).delete()
    await db.bottles.delete(id)
  })
}

/** @param {string} id */
export async function getBottle(id) {
  return db.bottles.get(id)
}

/**
 * Observable Dexie di una sola etichetta: la scheda si aggiorna da sola dopo le
 * operazioni di cantina (stappa, aggiungi, annulla).
 * @param {string} id
 */
export function liveBottle(id) {
  return liveQuery(() => db.bottles.get(id))
}

/** Observable Dexie: lista completa ordinata dalla più recente. */
export function liveBottles() {
  return liveQuery(() => db.bottles.orderBy('consumedAt').reverse().toArray())
}

/**
 * Etichetta già registrata (FR-110): stesso nome, produttore e annata (senza badare ad
 * accenti e maiuscole). Serve a evitare doppioni.
 * @param {{name?: string, producer?: string|null, vintage?: number|null}} label
 */
export async function findSameLabel({ name, producer, vintage }) {
  if (!name) return undefined
  const key = (n, p, v) => `${normalizeText(n ?? '').trim()}|${normalizeText(p ?? '').trim()}|${v ?? ''}`
  const wanted = key(name, producer, vintage)
  const all = await db.bottles.toArray()
  return all.find((b) => key(b.name, b.producer, b.vintage) === wanted)
}
