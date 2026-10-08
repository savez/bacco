import { describe, it, expect } from 'vitest'
import Dexie from 'dexie'
import { db } from '../../src/db/db.js'

const V1 = {
  bottles: 'id, consumedAt, updatedAt, type, barcode',
  photos: 'id, bottleId, [bottleId+order]',
  settings: 'key',
}

describe('migrazione v1 → v2', () => {
  it('unisce profumi e sapore nell\'analisi organolettica e lascia intatti gli altri record', async () => {
    db.close()
    await Dexie.delete('bacco')

    const old = new Dexie('bacco')
    old.version(1).stores(V1)
    await old.bottles.bulkPut([
      { id: 'a', name: 'Barolo', type: 'wine', rating: 4, aromas: 'ciliegia', taste: 'tannico' },
      { id: 'b', name: 'Tipopils', type: 'beer', rating: 3, aromas: '', taste: 'amaro' },
      { id: 'c', name: 'Senza note', type: 'wine', rating: 2 },
    ])
    old.close()

    await db.open()
    const [a, b, c] = await db.bottles.bulkGet(['a', 'b', 'c'])
    expect(a.tasting).toBe('Profumi: ciliegia\nSapore: tannico')
    expect(a.aromas).toBeUndefined()
    expect(a.taste).toBeUndefined()
    expect(b.tasting).toBe('Sapore: amaro')
    expect(c).toMatchObject({ id: 'c', name: 'Senza note', type: 'wine', rating: 2 })
    db.close()
  })
})

const V2 = V1

describe('migrazione v2 → v3 (cantina)', () => {
  it('rende ogni bottiglia un\'etichetta assaggiata, senza cantina, con il movimento di prima registrazione', async () => {
    db.close()
    await Dexie.delete('bacco')

    const old = new Dexie('bacco')
    old.version(2).stores(V2)
    await old.bottles.bulkPut([
      { id: 'a', name: 'Barolo', type: 'wine', rating: 4, consumedAt: '2026-09-01T20:00:00.000Z' },
      { id: 'b', name: 'Tipopils', type: 'beer', rating: 3, consumedAt: '2026-10-02T19:30:00.000Z' },
    ])
    old.close()

    await db.open()
    // Il DB si apre all'ultima versione: la migrazione v3 è passata (v4 aggiunge solo i desideri).
    expect(db.verno).toBeGreaterThanOrEqual(3)
    const [a, b] = await db.bottles.bulkGet(['a', 'b'])
    expect(a).toMatchObject({ rating: 4, cellarCount: 0, cellarUpdatedAt: null, tastedAt: '2026-09-01T20:00:00.000Z' })
    expect(b.tastedAt).toBe('2026-10-02T19:30:00.000Z')

    const moves = await db.cellarMoves.where('bottleId').equals('a').toArray()
    expect(moves).toHaveLength(1)
    expect(moves[0]).toMatchObject({ bottleId: 'a', type: 'first', qty: null, from: null, to: null, at: '2026-09-01T20:00:00.000Z' })

    // L'indice composto serve al registro movimenti della scheda.
    const viaIndex = await db.cellarMoves.where('[bottleId+at]').between(['b', Dexie.minKey], ['b', Dexie.maxKey]).toArray()
    expect(viaIndex).toHaveLength(1)
    db.close()
  })
})

const V3 = {
  bottles: 'id, consumedAt, tastedAt, updatedAt, type, barcode',
  photos: 'id, bottleId, [bottleId+order]',
  settings: 'key',
  cellarMoves: 'id, bottleId, [bottleId+at]',
}

describe('migrazione v3 → v4 (wishlist)', () => {
  it('aggiunge la tabella dei desideri vuota e lascia intatte bottiglie e movimenti', async () => {
    db.close()
    await Dexie.delete('bacco')

    const bottles = [
      { id: 'a', name: 'Barolo', type: 'wine', rating: 4, consumedAt: '2026-09-01T20:00:00.000Z', cellarCount: 2 },
      { id: 'b', name: 'Tipopils', type: 'beer', rating: 3, consumedAt: '2026-10-02T19:30:00.000Z', cellarCount: 0 },
    ]
    const moves = [
      { id: 'm1', bottleId: 'a', type: 'first', qty: null, from: null, to: null, at: '2026-09-01T20:00:00.000Z' },
      { id: 'm2', bottleId: 'a', type: 'in', qty: 2, from: null, to: null, at: '2026-09-01T20:00:00.000Z' },
      { id: 'm3', bottleId: 'b', type: 'first', qty: null, from: null, to: null, at: '2026-10-02T19:30:00.000Z' },
    ]
    const old = new Dexie('bacco')
    old.version(3).stores(V3)
    await old.bottles.bulkPut(bottles)
    await old.cellarMoves.bulkPut(moves)
    old.close()

    await db.open()
    expect(db.verno).toBe(4)
    expect(await db.bottles.bulkGet(['a', 'b'])).toEqual(bottles)
    expect(await db.cellarMoves.orderBy('id').toArray()).toEqual(moves)
    expect(await db.wishes.count()).toBe(0)

    await db.wishes.put({ id: 'w', name: 'Timorasso', type: 'wine', createdAt: '2026-10-08T10:00:00.000Z' })
    expect(await db.wishes.orderBy('createdAt').first()).toMatchObject({ id: 'w' })
    db.close()
  })
})
