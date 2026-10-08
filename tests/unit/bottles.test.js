import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../src/db/db.js'
import {
  createBottle,
  updateBottle,
  deleteBottle,
  getBottle,
  findSameLabel,
} from '../../src/db/bottles.js'

const sample = () => ({ name: 'Tipopils', type: 'beer', rating: 5 })

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.bottles.clear()
  await db.photos.clear()
  await db.cellarMoves.clear()
  await db.wishes.clear()
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

describe('cantina nel ciclo di vita dell\'etichetta', () => {
  const movesOf = (id) => db.cellarMoves.where('bottleId').equals(id).toArray()

  it('bevuta subito: solo il movimento di prima registrazione, alla data di "quando"', async () => {
    const bottle = await createBottle({ ...sample(), consumedAt: '2026-10-01T20:00:00.000Z' })
    const moves = await movesOf(bottle.id)
    expect(moves).toHaveLength(1)
    expect(moves[0]).toMatchObject({ type: 'first', at: '2026-10-01T20:00:00.000Z' })
    expect(bottle).toMatchObject({ cellarCount: 0, tastedAt: '2026-10-01T20:00:00.000Z' })
  })

  it('in cantina: senza punteggio, prima registrazione ed entrata', async () => {
    const at = '2026-10-01T17:00:00.000Z'
    const bottle = await createBottle({ name: 'Barolo', type: 'wine', tastedAt: null, cellarCount: 6, consumedAt: at })
    expect(bottle).toMatchObject({ rating: null, tastedAt: null, cellarCount: 6, cellarUpdatedAt: at })
    const moves = await movesOf(bottle.id)
    expect(moves.map((m) => [m.type, m.qty])).toEqual(expect.arrayContaining([['first', null], ['in', 6]]))
  })

  it('la modifica dal modulo non cambia la cantina; un punteggio rende l\'etichetta assaggiata', async () => {
    const bottle = await createBottle({ name: 'Barolo', type: 'wine', tastedAt: null, cellarCount: 6 })
    const updated = await updateBottle(bottle.id, { name: 'Barolo Cannubi', type: 'wine', rating: 4, cellarCount: 0 })
    expect(updated.cellarCount).toBe(6)
    expect(updated.rating).toBe(4)
    expect(updated.tastedAt).toBeTruthy()
  })

  it('eliminare l\'etichetta elimina anche i suoi movimenti', async () => {
    const bottle = await createBottle({ name: 'Barolo', type: 'wine', tastedAt: null, cellarCount: 2 })
    await deleteBottle(bottle.id)
    expect(await movesOf(bottle.id)).toHaveLength(0)
  })
})

describe('findSameLabel', () => {
  it('da nome, produttore e annata (senza badare ad accenti e maiuscole)', async () => {
    const barolo = await createBottle({ name: 'Barolo Cannubì', producer: 'Borgogno', vintage: 2017, type: 'wine', rating: 4 })
    expect((await findSameLabel({ name: 'barolo cannubi', producer: 'BORGOGNO', vintage: 2017 }))?.id).toBe(barolo.id)
  })

  it('annata o produttore diversi sono un\'altra etichetta', async () => {
    await createBottle({ name: 'Barolo', producer: 'Borgogno', vintage: 2017, type: 'wine', rating: 4 })
    expect(await findSameLabel({ name: 'Barolo', producer: 'Borgogno', vintage: 2018 })).toBeUndefined()
    expect(await findSameLabel({ name: 'Barolo', producer: 'Altro', vintage: 2017 })).toBeUndefined()
  })
})

describe('modifica della data di una bevuta subito', () => {
  it('il primo assaggio segue la nuova data', async () => {
    const bottle = await createBottle({ ...sample(), consumedAt: '2026-10-01T20:00:00.000Z' })
    const updated = await updateBottle(bottle.id, { ...sample(), consumedAt: '2026-09-20T20:00:00.000Z' })
    expect(updated.tastedAt).toBe('2026-09-20T20:00:00.000Z')
  })

  it('per un\'etichetta stappata dopo la registrazione il primo assaggio resta quello', async () => {
    const bottle = await createBottle({ name: 'Barolo', type: 'wine', tastedAt: null, cellarCount: 2, consumedAt: '2026-08-01T20:00:00.000Z' })
    await db.bottles.update(bottle.id, { rating: 4, tastedAt: '2026-10-05T20:00:00.000Z' })
    const updated = await updateBottle(bottle.id, { name: 'Barolo', type: 'wine', rating: 4, consumedAt: '2026-07-01T20:00:00.000Z' })
    expect(updated.tastedAt).toBe('2026-10-05T20:00:00.000Z')
  })
})

describe('createBottle da un desiderio (specs/005-wishlist)', () => {
  const addWish = async () => {
    const id = crypto.randomUUID()
    await db.wishes.put({ id, type: 'beer', name: 'Tipopils', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    return id
  }

  it('crea la bottiglia e toglie il desiderio', async () => {
    const wishId = await addWish()
    const bottle = await createBottle(sample(), { removeWishId: wishId })
    expect(await db.bottles.get(bottle.id)).toBeTruthy()
    expect(await db.wishes.get(wishId)).toBeUndefined()
  })

  it('lascia il desiderio se la bottiglia non è valida', async () => {
    const wishId = await addWish()
    await expect(createBottle({ ...sample(), rating: null }, { removeWishId: wishId })).rejects.toMatchObject({ name: 'ValidationError' })
    expect(await db.wishes.get(wishId)).toBeTruthy()
  })

  it('crea la bottiglia anche se il desiderio non c\'è più', async () => {
    const bottle = await createBottle(sample(), { removeWishId: crypto.randomUUID() })
    expect(await db.bottles.get(bottle.id)).toBeTruthy()
  })

  it('senza removeWishId non tocca i desideri', async () => {
    const wishId = await addWish()
    await createBottle(sample())
    expect(await db.wishes.get(wishId)).toBeTruthy()
  })
})
