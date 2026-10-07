import { liveQuery } from 'dexie'
import { db } from './db.js'
import { validateBottle } from '../lib/validate.js'

export class ValidationError extends Error {
  /** @param {Record<string,string>} errors */
  constructor(errors) {
    super('Dati della bottiglia non validi.')
    this.name = 'ValidationError'
    this.errors = errors
  }
}

/**
 * @param {object} input
 * @param {{addPhotos?: {blob: Blob, thumb: Blob}[]}} [opts]
 */
export async function createBottle(input, { addPhotos = [] } = {}) {
  const result = validateBottle(input)
  if (!result.ok) throw new ValidationError(result.errors)
  const now = new Date().toISOString()
  const bottle = { ...result.value, id: crypto.randomUUID(), createdAt: now, updatedAt: now }

  await db.transaction('rw', db.bottles, db.photos, async () => {
    await db.bottles.put(bottle)
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
  const result = validateBottle(input)
  if (!result.ok) throw new ValidationError(result.errors)

  return db.transaction('rw', db.bottles, db.photos, async () => {
    const existing = await db.bottles.get(id)
    if (!existing) throw new Error('Bottiglia non trovata.')
    const now = new Date().toISOString()
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
  await db.transaction('rw', db.bottles, db.photos, async () => {
    await db.photos.where('bottleId').equals(id).delete()
    await db.bottles.delete(id)
  })
}

/** @param {string} id */
export async function getBottle(id) {
  return db.bottles.get(id)
}

/** Observable Dexie: lista completa ordinata dalla più recente. */
export function liveBottles() {
  return liveQuery(() => db.bottles.orderBy('consumedAt').reverse().toArray())
}

/**
 * Nomi e produttori già usati, ordinati per frequenza (FR-007). Usati per i
 * suggerimenti in fase di inserimento.
 */
export async function getSuggestions() {
  const all = await db.bottles.toArray()
  const countBy = (values) => {
    const counts = new Map()
    for (const value of values) {
      if (!value) continue
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value)
  }
  return {
    names: countBy(all.map((b) => b.name)),
    producers: countBy(all.map((b) => b.producer)),
  }
}

/**
 * Ultima bottiglia registrata con un dato codice a barre (FR-025), o undefined.
 * @param {string} code
 */
export async function findLatestByBarcode(code) {
  const matches = await db.bottles.where('barcode').equals(code).toArray()
  matches.sort((a, b) => b.consumedAt.localeCompare(a.consumedAt))
  return matches[0]
}
