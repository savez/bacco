import { liveQuery } from 'dexie'
import { db } from './db.js'
import { ValidationError } from './bottles.js'
import { validateWish } from '../lib/validate.js'

// Wishlist (specs/005-wishlist/data-model.md): vini e birre da provare, in una tabella separata
// dalle bottiglie. "L'ho provato" non passa da qui: la bottiglia toglie il desiderio nella sua
// stessa transazione (createBottle / addToCellar con `removeWishId`).

/** @param {object} input */
export async function createWish(input) {
  const result = validateWish(input)
  if (!result.ok) throw new ValidationError(result.errors)
  const now = new Date().toISOString()
  const wish = { ...result.value, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  await db.wishes.put(wish)
  return wish
}

/**
 * @param {string} id
 * @param {object} input
 */
export async function updateWish(id, input) {
  const result = validateWish(input)
  if (!result.ok) throw new ValidationError(result.errors)
  return db.transaction('rw', db.wishes, async () => {
    const existing = await db.wishes.get(id)
    if (!existing) throw new Error('Desiderio non trovato.')
    const updated = { ...existing, ...result.value, id, updatedAt: new Date().toISOString() }
    await db.wishes.put(updated)
    return updated
  })
}

/** @param {string} id */
export async function deleteWish(id) {
  await db.wishes.delete(id)
}

/** @param {string} id */
export async function getWish(id) {
  return db.wishes.get(id)
}

/** Observable Dexie di un solo desiderio: il dettaglio si aggiorna dopo una modifica. @param {string} id */
export function liveWish(id) {
  return liveQuery(() => db.wishes.get(id))
}

/** Observable Dexie: tutti i desideri, dal più recente. */
export function liveWishes() {
  return liveQuery(() => db.wishes.orderBy('createdAt').reverse().toArray())
}
