import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../src/db/db.js'
import { createWish, updateWish, deleteWish, getWish, liveWishes } from '../../src/db/wishes.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const sample = () => ({ type: 'wine', name: 'Timorasso Derthona', producer: 'Vigneti Massa', vintage: 2021 })

/** Primo valore emesso da un Observable di Dexie. */
function firstValue(observable) {
  return new Promise((resolve, reject) => {
    const sub = observable.subscribe({
      next: (value) => {
        resolve(value)
        queueMicrotask(() => sub.unsubscribe())
      },
      error: reject,
    })
  })
}

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.wishes.clear()
  db.close()
})

describe('createWish', () => {
  it('assegna un id e createdAt uguale a updatedAt', async () => {
    const wish = await createWish(sample())
    expect(wish.id).toMatch(UUID_RE)
    expect(wish.createdAt).toBe(wish.updatedAt)
    expect(await db.wishes.get(wish.id)).toEqual(wish)
  })

  it('rifiuta un desiderio senza nome con ValidationError', async () => {
    await expect(createWish({ type: 'wine', name: ' ' })).rejects.toMatchObject({
      name: 'ValidationError',
      errors: { name: expect.any(String) },
    })
    expect(await db.wishes.count()).toBe(0)
  })
})

describe('updateWish', () => {
  it('cambia i dati, conserva createdAt e aggiorna updatedAt', async () => {
    const wish = await createWish(sample())
    await new Promise((r) => setTimeout(r, 2))
    const updated = await updateWish(wish.id, { ...sample(), vintage: 2020, notes: 'Da Marco' })
    expect(updated).toMatchObject({ id: wish.id, vintage: 2020, notes: 'Da Marco', createdAt: wish.createdAt })
    expect(updated.updatedAt > wish.updatedAt).toBe(true)
    expect(await getWish(wish.id)).toEqual(updated)
  })

  it('segnala un desiderio inesistente', async () => {
    await expect(updateWish(crypto.randomUUID(), sample())).rejects.toThrow('Desiderio non trovato.')
  })
})

describe('deleteWish e getWish', () => {
  it('toglie il desiderio', async () => {
    const wish = await createWish(sample())
    await deleteWish(wish.id)
    expect(await getWish(wish.id)).toBeUndefined()
  })
})

describe('liveWishes', () => {
  it('restituisce i desideri dal più recente', async () => {
    await db.wishes.bulkPut([
      { ...sample(), id: 'a', name: 'Primo', createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z' },
      { ...sample(), id: 'b', name: 'Terzo', createdAt: '2026-10-03T10:00:00.000Z', updatedAt: '2026-10-03T10:00:00.000Z' },
      { ...sample(), id: 'c', name: 'Secondo', createdAt: '2026-10-02T10:00:00.000Z', updatedAt: '2026-10-02T10:00:00.000Z' },
    ])
    const list = await firstValue(liveWishes())
    expect(list.map((w) => w.name)).toEqual(['Terzo', 'Secondo', 'Primo'])
  })
})
