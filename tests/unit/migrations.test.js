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
    expect(c).toEqual({ id: 'c', name: 'Senza note', type: 'wine', rating: 2 })
    expect(db.verno).toBe(2)
    db.close()
  })
})
