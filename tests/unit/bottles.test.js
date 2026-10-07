import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../src/db/db.js'
import {
  createBottle,
  updateBottle,
  deleteBottle,
  getBottle,
  findLatestByBarcode,
} from '../../src/db/bottles.js'

const sample = () => ({ name: 'Tipopils', type: 'beer', rating: 5 })

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.bottles.clear()
  await db.photos.clear()
  await db.settings.clear()
  db.close()
})

describe('createBottle', () => {
  it('genera un id univoco e createdAt uguale a updatedAt', async () => {
    const bottle = await createBottle(sample())
    expect(bottle.id).toBeTruthy()
    expect(bottle.createdAt).toBe(bottle.updatedAt)
    const stored = await db.bottles.get(bottle.id)
    expect(stored.name).toBe('Tipopils')
  })

  it('rifiuta input non validi senza scrivere nulla', async () => {
    await expect(createBottle({ name: '', type: 'beer', rating: 5 })).rejects.toMatchObject({
      errors: { name: expect.any(String) },
    })
    expect(await db.bottles.count()).toBe(0)
  })
})

describe('updateBottle', () => {
  it('aggiorna updatedAt e i campi modificati', async () => {
    const bottle = await createBottle(sample())
    await new Promise((r) => setTimeout(r, 2))
    const updated = await updateBottle(bottle.id, { ...sample(), rating: 3 })
    expect(updated.rating).toBe(3)
    expect(updated.createdAt).toBe(bottle.createdAt)
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
      new Date(bottle.createdAt).getTime() - 1,
    )
  })

  it('rifiuta un aggiornamento con dati non validi', async () => {
    const bottle = await createBottle(sample())
    await expect(updateBottle(bottle.id, { ...sample(), rating: 9 })).rejects.toMatchObject({
      errors: { rating: expect.any(String) },
    })
  })
})

describe('createBottle con foto', () => {
  it('scrive bottiglia e foto nella stessa transazione', async () => {
    const bottle = await createBottle(sample(), {
      addPhotos: [
        { blob: new Blob(['a']), thumb: new Blob(['a-thumb']) },
        { blob: new Blob(['b']), thumb: new Blob(['b-thumb']) },
      ],
    })
    const photos = await db.photos.where('bottleId').equals(bottle.id).sortBy('order')
    expect(photos).toHaveLength(2)
    expect(photos[0].order).toBe(0)
    expect(photos[1].order).toBe(1)
  })

  it('non scrive nessuna foto se la validazione fallisce', async () => {
    await expect(
      createBottle(
        { name: '', type: 'beer', rating: 5 },
        { addPhotos: [{ blob: new Blob(['a']), thumb: new Blob(['a-thumb']) }] },
      ),
    ).rejects.toBeInstanceOf(Error)
    expect(await db.photos.count()).toBe(0)
  })
})

describe('updateBottle con foto', () => {
  it('aggiunge e rimuove foto mantenendo l\'ordine', async () => {
    const bottle = await createBottle(sample(), {
      addPhotos: [{ blob: new Blob(['a']), thumb: new Blob(['a-thumb']) }],
    })
    const [firstPhoto] = await db.photos.where('bottleId').equals(bottle.id).toArray()

    await updateBottle(
      bottle.id,
      sample(),
      {
        addPhotos: [{ blob: new Blob(['b']), thumb: new Blob(['b-thumb']) }],
        removePhotoIds: [],
      },
    )
    let photos = await db.photos.where('bottleId').equals(bottle.id).sortBy('order')
    expect(photos).toHaveLength(2)
    expect(photos[1].order).toBe(1)

    await updateBottle(bottle.id, sample(), { removePhotoIds: [firstPhoto.id] })
    photos = await db.photos.where('bottleId').equals(bottle.id).toArray()
    expect(photos).toHaveLength(1)
    expect(photos[0].id).not.toBe(firstPhoto.id)
  })

  it('rinumera le foto rimanenti 0..n-1 quando si elimina la copertina', async () => {
    const bottle = await createBottle(sample(), {
      addPhotos: [
        { blob: new Blob(['a']), thumb: new Blob(['a-thumb']) },
        { blob: new Blob(['b']), thumb: new Blob(['b-thumb']) },
        { blob: new Blob(['c']), thumb: new Blob(['c-thumb']) },
      ],
    })
    const before = await db.photos.where('bottleId').equals(bottle.id).sortBy('order')
    const [cover, second, third] = before

    // Rimuove la copertina (order 0): "order 0 = copertina" deve restare vero.
    await updateBottle(bottle.id, sample(), { removePhotoIds: [cover.id] })

    const after = await db.photos.where('bottleId').equals(bottle.id).sortBy('order')
    expect(after.map((p) => p.order)).toEqual([0, 1])
    expect(after[0].id).toBe(second.id)
    expect(after[1].id).toBe(third.id)
  })
})

describe('deleteBottle', () => {
  it('rimuove la bottiglia e le sue foto', async () => {
    const bottle = await createBottle(sample())
    await db.photos.put({ id: 'p1', bottleId: bottle.id, order: 0, createdAt: new Date().toISOString() })
    await deleteBottle(bottle.id)
    expect(await db.bottles.get(bottle.id)).toBeUndefined()
    expect(await db.photos.where('bottleId').equals(bottle.id).count()).toBe(0)
  })
})

describe('getBottle', () => {
  it('restituisce undefined per un id inesistente', async () => {
    expect(await getBottle('non-esiste')).toBeUndefined()
  })
})

describe('findLatestByBarcode', () => {
  it('restituisce il record più recente con quel codice, o undefined', async () => {
    await createBottle({ ...sample(), barcode: '12345678', consumedAt: '2026-01-01T00:00:00.000Z' })
    const newer = await createBottle({
      ...sample(),
      barcode: '12345678',
      consumedAt: '2026-06-01T00:00:00.000Z',
    })
    const found = await findLatestByBarcode('12345678')
    expect(found.id).toBe(newer.id)
    expect(await findLatestByBarcode('99999999')).toBeUndefined()
  })
})
