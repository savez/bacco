import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../src/db/db.js'
import { createBottle } from '../../src/db/bottles.js'
import { addToCellar, uncork, recordFirstTasting, undoMove, adjustCellar, CellarError } from '../../src/db/cellar.js'

const inCellar = (n) => createBottle({ name: 'Barolo', type: 'wine', tastedAt: null, cellarCount: n })
const tasted = () => createBottle({ name: 'Tipopils', type: 'beer', rating: 4 })
const movesOf = async (id) => (await db.cellarMoves.where('bottleId').equals(id).toArray()).sort((a, b) => a.at.localeCompare(b.at))

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.bottles.clear()
  await db.photos.clear()
  await db.cellarMoves.clear()
  db.close()
})

describe('addToCellar', () => {
  it('somma le bottiglie, registra l\'entrata e aggiorna la data della cantina', async () => {
    const bottle = await tasted()
    const { move } = await addToCellar(bottle.id, 3)
    const stored = await db.bottles.get(bottle.id)
    expect(stored.cellarCount).toBe(3)
    expect(stored.cellarUpdatedAt).toBe(move.at)
    expect(move).toMatchObject({ type: 'in', qty: 3, bottleId: bottle.id })
    expect((await movesOf(bottle.id)).map((m) => m.type)).toEqual(['first', 'in'])
  })

  it('aggiunge a una cantina già piena', async () => {
    const bottle = await inCellar(2)
    await addToCellar(bottle.id, 3)
    expect((await db.bottles.get(bottle.id)).cellarCount).toBe(5)
  })

  it('rifiuta meno di 1 bottiglia e un totale oltre 999, senza scrivere nulla', async () => {
    const bottle = await inCellar(998)
    await expect(addToCellar(bottle.id, 0)).rejects.toBeInstanceOf(CellarError)
    await expect(addToCellar(bottle.id, 2)).rejects.toThrow(/999/)
    expect((await db.bottles.get(bottle.id)).cellarCount).toBe(998)
    expect(await movesOf(bottle.id)).toHaveLength(2)
  })
})

describe('uncork', () => {
  it('toglie una bottiglia e registra l\'uscita; il primo stappo chiede l\'assaggio', async () => {
    const bottle = await inCellar(6)
    const { move, needsTasting } = await uncork(bottle.id)
    expect(needsTasting).toBe(true)
    expect(move).toMatchObject({ type: 'out', qty: 1 })
    expect((await db.bottles.get(bottle.id)).cellarCount).toBe(5)
  })

  it('un\'etichetta già assaggiata non chiede niente', async () => {
    const bottle = await tasted()
    await addToCellar(bottle.id, 2)
    expect((await uncork(bottle.id)).needsTasting).toBe(false)
  })

  it('con 0 bottiglie non si stappa', async () => {
    const bottle = await tasted()
    await expect(uncork(bottle.id)).rejects.toBeInstanceOf(CellarError)
    expect(await movesOf(bottle.id)).toHaveLength(1)
  })
})

describe('recordFirstTasting', () => {
  it('salva punteggio, analisi e data del primo assaggio', async () => {
    const bottle = await inCellar(6)
    await uncork(bottle.id)
    const stored = await recordFirstTasting(bottle.id, { rating: 4, tasting: 'viola, tannico' })
    expect(stored).toMatchObject({ rating: 4, tasting: 'viola, tannico' })
    expect(stored.tastedAt).toBeTruthy()
  })

  it('il punteggio è obbligatorio', async () => {
    const bottle = await inCellar(6)
    await expect(recordFirstTasting(bottle.id, { rating: null })).rejects.toBeInstanceOf(CellarError)
    expect((await db.bottles.get(bottle.id)).tastedAt).toBeNull()
  })
})

describe('undoMove', () => {
  it('annulla un\'entrata', async () => {
    const bottle = await inCellar(2)
    const before = await db.bottles.get(bottle.id)
    const op = await addToCellar(bottle.id, 3)
    await undoMove(op)
    const after = await db.bottles.get(bottle.id)
    expect(after.cellarCount).toBe(2)
    expect(after.cellarUpdatedAt).toBe(before.cellarUpdatedAt)
    expect(await movesOf(bottle.id)).toHaveLength(2)
  })

  it('annulla un primo stappo con il suo assaggio', async () => {
    const bottle = await inCellar(6)
    const op = await uncork(bottle.id)
    await recordFirstTasting(bottle.id, { rating: 5, tasting: 'memorabile' })
    await undoMove(op)
    const after = await db.bottles.get(bottle.id)
    expect(after).toMatchObject({ cellarCount: 6, rating: null, tastedAt: null, tasting: '' })
    expect((await movesOf(bottle.id)).map((m) => m.type).sort()).toEqual(['first', 'in'])
  })
})

describe('invariante della quantità (SC-104)', () => {
  it('dopo 50 operazioni casuali la quantità torna con il registro movimenti', async () => {
    const bottle = await inCellar(5)
    let seed = 42
    const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
    let last = null
    for (let i = 0; i < 50; i++) {
      const r = random()
      try {
        if (r < 0.4) last = await addToCellar(bottle.id, 1 + Math.floor(random() * 3))
        else if (r < 0.8) last = await uncork(bottle.id)
        else if (last) {
          await undoMove(last)
          last = null
        }
      } catch (err) {
        if (!(err instanceof CellarError)) throw err
      }
    }
    const moves = (await movesOf(bottle.id)).sort((a, b) => a.at.localeCompare(b.at))
    const fromMoves = moves.reduce((n, m) => (m.type === 'in' ? n + m.qty : m.type === 'out' ? n - 1 : m.type === 'adjust' ? m.to : n), 0)
    expect((await db.bottles.get(bottle.id)).cellarCount).toBe(fromMoves)
  })
})

describe('adjustCellar', () => {
  it('registra la rettifica con quantità prima e dopo', async () => {
    const bottle = await inCellar(4)
    const before = await db.bottles.get(bottle.id)
    const { move } = await adjustCellar(bottle.id, 3)
    expect(move).toMatchObject({ type: 'adjust', from: 4, to: 3, qty: null })
    const after = await db.bottles.get(bottle.id)
    expect(after.cellarCount).toBe(3)
    // Diminuire non è un'entrata: l'ordine del filtro "In cantina" non cambia.
    expect(after.cellarUpdatedAt).toBe(before.cellarUpdatedAt)
  })

  it('aumentare aggiorna la data della cantina; 0 la toglie dalla cantina', async () => {
    const bottle = await inCellar(2)
    const { move } = await adjustCellar(bottle.id, 5)
    expect((await db.bottles.get(bottle.id)).cellarUpdatedAt).toBe(move.at)
    await adjustCellar(bottle.id, 0)
    expect((await db.bottles.get(bottle.id)).cellarCount).toBe(0)
  })

  it('rifiuta valori fuori da 0–999 o uguali a quelli attuali', async () => {
    const bottle = await inCellar(2)
    await expect(adjustCellar(bottle.id, -1)).rejects.toBeInstanceOf(CellarError)
    await expect(adjustCellar(bottle.id, 1000)).rejects.toBeInstanceOf(CellarError)
    await expect(adjustCellar(bottle.id, 2)).rejects.toBeInstanceOf(CellarError)
  })

  it('si annulla come le altre operazioni', async () => {
    const bottle = await inCellar(4)
    const op = await adjustCellar(bottle.id, 1)
    await undoMove(op)
    expect((await db.bottles.get(bottle.id)).cellarCount).toBe(4)
    expect((await movesOf(bottle.id)).some((m) => m.type === 'adjust')).toBe(false)
  })
})
