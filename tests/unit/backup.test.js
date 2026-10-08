import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../../src/db/db.js'
import { createBottle } from '../../src/db/bottles.js'
import { setSetting, getSetting } from '../../src/db/settings.js'
import { buildBackupBlob } from '../../src/backup/exportJson.js'
import { importBackup } from '../../src/backup/importJson.js'

// Risolve con setTimeout (macrotask), non come microtask: è la stessa temporizzazione
// di createImageBitmap/canvas.toBlob nel browser reale. Un fakeThumbnail che risolve
// come microtask nasconderebbe un PrematureCommitError della transazione Dexie.
const fakeThumbnail = vi.fn(() => new Promise((resolve) => setTimeout(() => resolve(new Blob(['thumb'])), 0)))

function jsonFile(obj) {
  return new File([JSON.stringify(obj)], 'backup.json', { type: 'application/json' })
}

function textFile(text) {
  return new File([text], 'backup.json', { type: 'application/json' })
}

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.bottles.clear()
  await db.photos.clear()
  await db.cellarMoves.clear()
  await db.settings.clear()
  db.close()
})

describe('round trip (SC-004)', () => {
  it('esporta, svuota e reimporta ripristinando tutto', async () => {
    const bottle = await createBottle({
      name: 'Barolo Cannubi',
      type: 'wine',
      rating: 4,
      notes: '- ciliegia',
      subtype: 'Rosso',
      tasting: 'viola, tannico',
      abv: 14,
      pairing: 'brasato',
    })
    await db.photos.put({
      id: 'p1',
      bottleId: bottle.id,
      order: 0,
      blob: new Blob(['foto']),
      thumb: new Blob(['thumb-originale']),
      createdAt: bottle.createdAt,
    })

    const blob = await buildBackupBlob()
    const file = new File([blob], 'backup.json', { type: 'application/json' })

    await db.bottles.clear()
    await db.photos.clear()

    const result = await importBackup(file, { makeThumbnail: fakeThumbnail })

    expect(result).toEqual({ added: 1, updated: 0, unchanged: 0 })
    const restored = await db.bottles.get(bottle.id)
    expect(restored.name).toBe('Barolo Cannubi')
    expect(restored.notes).toBe('- ciliegia')
    expect(restored.subtype).toBe('Rosso')
    expect(restored.tasting).toBe('viola, tannico')
    expect(restored.abv).toBe(14)
    expect(restored.pairing).toBe('brasato')
    const photos = await db.photos.where('bottleId').equals(bottle.id).toArray()
    expect(photos).toHaveLength(1)
  })
})

describe('validazione del file', () => {
  it('rifiuta un file che non è JSON', async () => {
    await expect(importBackup(textFile('non è json'), { makeThumbnail: fakeThumbnail })).rejects.toThrow()
    expect(await db.bottles.count()).toBe(0)
  })

  it('rifiuta un app diverso da "bacco"', async () => {
    await expect(
      importBackup(jsonFile({ app: 'altro', formatVersion: 1, bottles: [] }), {
        makeThumbnail: fakeThumbnail,
      }),
    ).rejects.toThrow(/non è un backup di Bacco/)
  })

  it('rifiuta un formatVersion non supportato', async () => {
    await expect(
      importBackup(jsonFile({ app: 'bacco', formatVersion: 3, bottles: [] }), {
        makeThumbnail: fakeThumbnail,
      }),
    ).rejects.toThrow(/versione più recente/)
  })

  it('non scrive nulla se un record a metà file non è valido', async () => {
    await createBottle({ name: 'Esistente', type: 'beer', rating: 3 })
    const backup = {
      app: 'bacco',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      bottles: [
        {
          id: crypto.randomUUID(),
          name: 'Valida',
          type: 'wine',
          rating: 4,
          consumedAt: new Date().toISOString(),
          notes: '',
          barcode: null,
          externalUrl: null,
          location: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          photos: [],
        },
        {
          id: crypto.randomUUID(),
          name: '',
          type: 'wine',
          rating: 4,
          consumedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          photos: [],
        },
      ],
    }
    await expect(importBackup(jsonFile(backup), { makeThumbnail: fakeThumbnail })).rejects.toThrow()
    expect(await db.bottles.count()).toBe(1)
  })
})

describe('unione all\'importazione', () => {
  function makeBackupBottle(overrides) {
    const now = new Date().toISOString()
    return {
      id: crypto.randomUUID(),
      name: 'Nome',
      type: 'wine',
      rating: 3,
      consumedAt: now,
      notes: '',
      barcode: null,
      externalUrl: null,
      location: null,
      createdAt: now,
      updatedAt: now,
      photos: [],
      ...overrides,
    }
  }

  it('unisce profumi e sapore di un backup precedente nell\'analisi organolettica', async () => {
    const backup = {
      app: 'bacco',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      bottles: [makeBackupBottle({ aromas: 'viola', taste: 'secco' })],
    }
    await importBackup(jsonFile(backup), { makeThumbnail: fakeThumbnail })
    const [stored] = await db.bottles.toArray()
    expect(stored.tasting).toBe('Profumi: viola\nSapore: secco')
    expect(stored.aromas).toBeUndefined()
  })

  it('aggiunge le bottiglie nuove', async () => {
    const backup = {
      app: 'bacco',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      bottles: [makeBackupBottle({ name: 'Nuova' })],
    }
    const result = await importBackup(jsonFile(backup), { makeThumbnail: fakeThumbnail })
    expect(result).toEqual({ added: 1, updated: 0, unchanged: 0 })
  })

  it('sostituisce la bottiglia locale se il backup è più recente', async () => {
    const local = await createBottle({ name: 'Locale vecchia', type: 'wine', rating: 2 })
    const backupBottle = makeBackupBottle({
      id: local.id,
      name: 'Dal backup, più recente',
      updatedAt: new Date(Date.now() + 10000).toISOString(),
    })
    const result = await importBackup(
      jsonFile({ app: 'bacco', formatVersion: 1, exportedAt: new Date().toISOString(), bottles: [backupBottle] }),
      { makeThumbnail: fakeThumbnail },
    )
    expect(result).toEqual({ added: 0, updated: 1, unchanged: 0 })
    const stored = await db.bottles.get(local.id)
    expect(stored.name).toBe('Dal backup, più recente')
  })

  it('lascia invariata la bottiglia locale se il backup è più vecchio o uguale', async () => {
    const local = await createBottle({ name: 'Locale recente', type: 'wine', rating: 2 })
    const backupBottle = makeBackupBottle({
      id: local.id,
      name: 'Dal backup, più vecchia',
      updatedAt: new Date(Date.now() - 10000).toISOString(),
    })
    const result = await importBackup(
      jsonFile({ app: 'bacco', formatVersion: 1, exportedAt: new Date().toISOString(), bottles: [backupBottle] }),
      { makeThumbnail: fakeThumbnail },
    )
    expect(result).toEqual({ added: 0, updated: 0, unchanged: 1 })
    const stored = await db.bottles.get(local.id)
    expect(stored.name).toBe('Locale recente')
  })

  it('non modifica lastExportAt dopo un\'importazione riuscita', async () => {
    await setSetting('lastExportAt', '2026-01-01T00:00:00.000Z')
    const backup = {
      app: 'bacco',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      bottles: [makeBackupBottle()],
    }
    await importBackup(jsonFile(backup), { makeThumbnail: fakeThumbnail })
    expect(await getSetting('lastExportAt')).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('cantina nel backup (formatVersion 2)', () => {
  const movesOf = async (id) =>
    (await db.cellarMoves.where('bottleId').equals(id).toArray()).sort((a, b) => a.at.localeCompare(b.at) || a.type.localeCompare(b.type))
  const strip = (moves) => moves.map(({ type, qty, from, to, at }) => ({ type, qty, from, to, at }))
  const file = async () => new File([await buildBackupBlob()], 'backup.json', { type: 'application/json' })

  it('esporta formatVersion 2 con i movimenti', async () => {
    await createBottle({ name: 'Barolo', type: 'wine', tastedAt: null, cellarCount: 6 })
    const data = JSON.parse(await (await file()).text())
    expect(data.formatVersion).toBe(2)
    expect(data.cellarMoves.map((m) => m.type).sort()).toEqual(['first', 'in'])
  })

  it('reimporta quantità, stato e movimenti identici (SC-105)', async () => {
    const barolo = await createBottle({ name: 'Barolo', type: 'wine', tastedAt: null, cellarCount: 6 })
    await db.cellarMoves.add({ id: crypto.randomUUID(), bottleId: barolo.id, type: 'adjust', qty: null, from: 6, to: 5, at: new Date().toISOString() })
    await db.bottles.update(barolo.id, { cellarCount: 5 })
    const before = { bottle: await db.bottles.get(barolo.id), moves: strip(await movesOf(barolo.id)) }
    const backup = await file()

    await db.bottles.clear()
    await db.cellarMoves.clear()
    await importBackup(backup, { makeThumbnail: fakeThumbnail })

    expect(await db.bottles.get(barolo.id)).toEqual(before.bottle)
    expect(strip(await movesOf(barolo.id))).toEqual(before.moves)
  })

  it('un backup v1 diventa assaggiato, senza cantina, con la prima registrazione', async () => {
    const consumedAt = '2026-05-01T20:00:00.000Z'
    const id = crypto.randomUUID()
    await importBackup(
      jsonFile({
        app: 'bacco', formatVersion: 1, exportedAt: consumedAt,
        bottles: [{ id, name: 'Vecchio', type: 'wine', rating: 3, consumedAt, createdAt: consumedAt, updatedAt: consumedAt, photos: [] }],
      }),
      { makeThumbnail: fakeThumbnail },
    )
    expect(await db.bottles.get(id)).toMatchObject({ tastedAt: consumedAt, cellarCount: 0 })
    expect(strip(await movesOf(id))).toEqual([{ type: 'first', qty: null, from: null, to: null, at: consumedAt }])
  })

  it('rifiuta movimenti non validi o riferiti a etichette assenti, senza scrivere nulla', async () => {
    await createBottle({ name: 'Barolo', type: 'wine', tastedAt: null, cellarCount: 2 })
    const data = JSON.parse(await (await file()).text())
    await db.bottles.clear()
    await db.cellarMoves.clear()

    const bad = { ...data, cellarMoves: [...data.cellarMoves, { ...data.cellarMoves[0], id: crypto.randomUUID(), type: 'gift' }] }
    await expect(importBackup(jsonFile(bad), { makeThumbnail: fakeThumbnail })).rejects.toThrow(/Movimento 3/)

    const orphan = { ...data, cellarMoves: [{ ...data.cellarMoves[0], bottleId: crypto.randomUUID() }] }
    await expect(importBackup(jsonFile(orphan), { makeThumbnail: fakeThumbnail })).rejects.toThrow(/Movimento 1/)

    expect(await db.bottles.count()).toBe(0)
    expect(await db.cellarMoves.count()).toBe(0)
  })

  it('i movimenti seguono il record che vince l\'unione', async () => {
    const local = await createBottle({ name: 'Barolo', type: 'wine', tastedAt: null, cellarCount: 6 })
    const data = JSON.parse(await (await file()).text())

    // Sul dispositivo la storia continua: una bottiglia stappata, record più recente.
    await db.cellarMoves.add({ id: crypto.randomUUID(), bottleId: local.id, type: 'out', qty: 1, from: null, to: null, at: new Date().toISOString() })
    await db.bottles.update(local.id, { cellarCount: 5, updatedAt: new Date(Date.now() + 10000).toISOString() })
    await importBackup(jsonFile(data), { makeThumbnail: fakeThumbnail })
    expect((await movesOf(local.id)).map((m) => m.type).sort()).toEqual(['first', 'in', 'out'])
    expect((await db.bottles.get(local.id)).cellarCount).toBe(5)

    // Ora vince il backup (più recente): i movimenti locali sono sostituiti dai suoi.
    data.bottles[0].updatedAt = new Date(Date.now() + 20000).toISOString()
    await importBackup(jsonFile(data), { makeThumbnail: fakeThumbnail })
    expect((await movesOf(local.id)).map((m) => m.type).sort()).toEqual(['first', 'in'])
    expect((await db.bottles.get(local.id)).cellarCount).toBe(6)
  })
})

describe('chip nel backup (SC-204)', () => {
  it('esporta e reimporta aromi e abbinamenti identici', async () => {
    const b = await createBottle({ name: 'Barolo', type: 'wine', rating: 4, aromaTags: ['Tannico', 'Fruttato'], pairingTags: ['Carne'] })
    const file = new File([await buildBackupBlob()], 'backup.json', { type: 'application/json' })
    await db.bottles.clear()
    await db.cellarMoves.clear()
    await importBackup(file, { makeThumbnail: fakeThumbnail })
    expect(await db.bottles.get(b.id)).toMatchObject({ aromaTags: ['Fruttato', 'Tannico'], pairingTags: ['Carne'] })
  })
})

describe('vitigno nel backup', () => {
  it('esporta e reimporta il vitigno', async () => {
    const b = await createBottle({ name: 'Timorasso Derthona', type: 'wine', rating: 4, grape: 'Timorasso' })
    const file = new File([await buildBackupBlob()], 'backup.json', { type: 'application/json' })
    await db.bottles.clear()
    await db.cellarMoves.clear()
    await importBackup(file, { makeThumbnail: fakeThumbnail })
    expect((await db.bottles.get(b.id)).grape).toBe('Timorasso')
  })

  it('un backup senza vitigno si importa e lascia il vitigno vuoto', async () => {
    const b = await createBottle({ name: 'Barolo', type: 'wine', rating: 4, grape: 'Nebbiolo' })
    const data = JSON.parse(await new File([await buildBackupBlob()], 'b.json').text())
    for (const entry of data.bottles) delete entry.grape
    await db.bottles.clear()
    await db.cellarMoves.clear()
    await importBackup(jsonFile(data), { makeThumbnail: fakeThumbnail })
    expect((await db.bottles.get(b.id)).grape ?? null).toBeNull()
  })
})
