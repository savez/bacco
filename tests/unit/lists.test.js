import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../src/db/db.js'
import { createBottle } from '../../src/db/bottles.js'
import { getCustomLists, learnFromBottle, addEntry, updateEntry, removeEntry, countUsage, ListError } from '../../src/db/lists.js'
import { RED_GRAPES, WHITE_GRAPES } from '../../src/lib/grapes.js'
import { WINE_SUBTYPES, APPELLATIONS } from '../../src/lib/subtypes.js'
import { WINE_AROMAS, BEER_AROMAS, PAIRINGS } from '../../src/lib/tastingTags.js'
import { LISTS, listById, cleanEntry, fullList, allTexts, canonicalIn, listIdFor } from '../../src/lib/lists.js'

const sorted = (list) => [...list].sort((a, b) => a.localeCompare(b, 'it'))

describe('definizione degli elenchi', () => {
  it('ha i 7 elenchi di data-model.md', () => {
    expect(LISTS.map((l) => l.id)).toEqual([
      'grape',
      'subtype.wine',
      'subtype.beer',
      'appellation',
      'aroma.wine',
      'aroma.beer',
      'pairing',
    ])
    expect(listById('grape')).toMatchObject({ label: 'Vitigno', field: 'grape', type: 'wine', multiple: false, max: 60 })
    expect(listById('subtype.beer')).toMatchObject({ field: 'subtype', type: 'beer', multiple: false, max: 40 })
    expect(listById('appellation')).toMatchObject({ type: 'wine', multiple: false, max: 30 })
    expect(listById('aroma.wine')).toMatchObject({ field: 'aromaTags', multiple: true, max: 40 })
    expect(listById('pairing')).toMatchObject({ field: 'pairingTags', type: null, multiple: true, max: 40 })
    expect(listById('nope')).toBeUndefined()
  })
})

describe('cleanEntry', () => {
  it('ripulisce spazi e caratteri di controllo', () => {
    expect(cleanEntry('grape', '  Timorasso  ')).toBe('Timorasso')
    expect(cleanEntry('grape', 'Merlot   e\u0007 Cabernet')).toBe('Merlot e Cabernet')
  })

  it('null se vuoto, non testo o oltre il limite', () => {
    expect(cleanEntry('grape', '   ')).toBeNull()
    expect(cleanEntry('grape', null)).toBeNull()
    expect(cleanEntry('appellation', 'a'.repeat(31))).toBeNull()
    expect(cleanEntry('appellation', 'a'.repeat(30))).toBe('a'.repeat(30))
  })
})

describe('fullList', () => {
  const custom = {
    grape: [
      { text: 'Timorasso', group: 'other' },
      { text: 'Pecorino', group: 'white' },
      { text: 'Ruchè', group: 'red' },
    ],
    'subtype.wine': [{ text: 'Orange' }, { text: 'Metodo classico' }],
    appellation: [{ text: 'AOC' }],
    'aroma.wine': [{ text: 'Balsamico' }],
    pairing: [{ text: 'Sushi' }],
  }

  it('Vitigno: gruppi red, white, other in ordine alfabetico, predefinite e aggiunte insieme', () => {
    const grapes = fullList('grape', custom)
    expect(grapes.red).toEqual(sorted([...RED_GRAPES, 'Ruchè']))
    expect(grapes.white).toEqual(sorted([...WHITE_GRAPES, 'Pecorino']))
    expect(grapes.other).toEqual(['Timorasso'])
  })

  it('Vitigno senza aggiunte: "other" vuoto', () => {
    expect(fullList('grape', {}).other).toEqual([])
    expect(fullList('grape', undefined).red).toEqual(RED_GRAPES)
  })

  it('Tipologia e Denominazione: predefinite nell’ordine di oggi, poi le aggiunte A→Z', () => {
    expect(fullList('subtype.wine', custom)).toEqual([...WINE_SUBTYPES, 'Metodo classico', 'Orange'])
    expect(fullList('appellation', custom)).toEqual([...APPELLATIONS, 'AOC'])
  })

  it('Aromi e Abbinamenti: tutto in ordine alfabetico', () => {
    expect(fullList('aroma.wine', custom)).toEqual(sorted([...WINE_AROMAS, 'Balsamico']))
    expect(fullList('aroma.beer', custom)).toEqual(sorted(BEER_AROMAS))
    expect(fullList('pairing', custom)).toEqual(sorted([...PAIRINGS, 'Sushi']))
  })

  it('allTexts è la versione piatta, anche per il Vitigno', () => {
    expect(allTexts('grape', custom)).toEqual(
      expect.arrayContaining(['Nebbiolo', 'Vermentino', 'Timorasso', 'Pecorino', 'Ruchè']),
    )
    expect(allTexts('grape', custom)).toHaveLength(RED_GRAPES.length + WHITE_GRAPES.length + 3)
    expect(allTexts('subtype.wine', custom)).toEqual(fullList('subtype.wine', custom))
  })
})

describe('canonicalIn', () => {
  it('riporta alla voce con la stessa chiave', () => {
    expect(canonicalIn(['Nebbiolo', 'Barbera'], 'nebbiolo ')).toBe('Nebbiolo')
    expect(canonicalIn(['Gewürztraminer'], 'GEWURZTRAMINER')).toBe('Gewürztraminer')
  })

  it('null se il testo non è nell’elenco', () => {
    expect(canonicalIn(['Nebbiolo'], 'Timorasso')).toBeNull()
    expect(canonicalIn([], 'x')).toBeNull()
  })
})

describe('listIdFor', () => {
  it('trova l’elenco dal campo e dal tipo', () => {
    expect(listIdFor('subtype', 'beer')).toBe('subtype.beer')
    expect(listIdFor('subtype', 'wine')).toBe('subtype.wine')
    expect(listIdFor('aromaTags', 'wine')).toBe('aroma.wine')
    expect(listIdFor('pairingTags', 'beer')).toBe('pairing')
    expect(listIdFor('grape', 'wine')).toBe('grape')
    expect(listIdFor('appellation', 'wine')).toBe('appellation')
  })

  it('null per campi che non valgono per il tipo o tipo mancante', () => {
    expect(listIdFor('grape', 'beer')).toBeNull()
    expect(listIdFor('appellation', 'beer')).toBeNull()
    expect(listIdFor('subtype', null)).toBeNull()
  })
})

describe('persistenza', () => {
  beforeEach(async () => {
    await db.open()
  })
  afterEach(async () => {
    await db.bottles.clear()
    await db.settings.clear()
    db.close()
  })

  // `learnFromBottle` si chiama dentro la transazione di salvataggio: qui la apriamo a mano.
  const learn = (bottle, previous) => db.transaction('rw', db.bottles, db.settings, () => learnFromBottle(bottle, previous))

  it('senza riga salvata gli elenchi aggiunti sono vuoti; dopo db.settings.clear() tornano alle predefinite', async () => {
    expect(await getCustomLists()).toEqual({})
    await db.settings.put({ key: 'customLists', value: { grape: [{ text: 'Timorasso', group: 'other' }] } })
    expect(fullList('grape', await getCustomLists()).other).toEqual(['Timorasso'])
    await db.settings.clear()
    expect(await getCustomLists()).toEqual({})
    expect(fullList('grape', await getCustomLists()).other).toEqual([])
  })

  describe('learnFromBottle', () => {
    const wine = (extra) => ({ type: 'wine', name: 'X', grape: null, subtype: null, appellation: null, aromaTags: [], pairingTags: [], ...extra })

    it('bottiglia nuova: aggiunge ogni valore fuori elenco all’elenco del suo tipo', async () => {
      await learn(wine({ grape: 'Timorasso', subtype: 'Orange', appellation: 'AOC' }))
      expect(await getCustomLists()).toEqual({
        grape: [{ text: 'Timorasso', group: 'other' }],
        'subtype.wine': [{ text: 'Orange' }],
        appellation: [{ text: 'AOC' }],
      })
    })

    it('non aggiunge i valori predefiniti', async () => {
      const result = await learn(wine({ grape: 'nebbiolo', subtype: 'Rosso', appellation: 'DOCG' }))
      expect(await getCustomLists()).toEqual({})
      expect(result.grape).toBe('Nebbiolo')
    })

    it('una voce aggiunta con la stessa chiave dà il suo testo e non crea un doppione', async () => {
      await db.settings.put({ key: 'customLists', value: { grape: [{ text: 'Timorasso', group: 'other' }] } })
      const result = await learn(wine({ grape: 'timorasso ' }))
      expect(result.grape).toBe('Timorasso')
      expect((await getCustomLists()).grape).toHaveLength(1)
    })

    it('una birra aggiunge la tipologia a quelle della birra, non del vino', async () => {
      await learn({ ...wine({ subtype: 'Saison' }), type: 'beer' })
      const lists = await getCustomLists()
      expect(lists['subtype.beer']).toEqual([{ text: 'Saison' }])
      expect(lists['subtype.wine']).toBeUndefined()
    })

    it('modifica: un valore invariato non aggiunge nulla, uno cambiato sì', async () => {
      const previous = wine({ grape: 'Timorasso', pairingTags: ['Sushi'] })
      await learn({ ...previous }, previous)
      expect(await getCustomLists()).toEqual({})
      await learn({ ...previous, grape: 'Ruchè' }, previous)
      expect(await getCustomLists()).toEqual({ grape: [{ text: 'Ruchè', group: 'other' }] })
    })

    it('aromi e abbinamenti: aggiunge solo le voci assenti prima, per chiave', async () => {
      const previous = wine({ aromaTags: ['Balsamico'] })
      await learn(wine({ aromaTags: ['balsamico', 'Affumicato'], pairingTags: ['Sushi'] }), previous)
      expect(await getCustomLists()).toEqual({
        'aroma.wine': [{ text: 'Affumicato' }],
        pairing: [{ text: 'Sushi' }],
      })
    })

    it('aromi della birra: una predefinita del vino è una voce nuova per la birra', async () => {
      await learn({ ...wine({ aromaTags: ['Speziato', 'Luppolato'] }), type: 'beer' })
      expect(await getCustomLists()).toEqual({ 'aroma.beer': [{ text: 'Speziato' }] })
    })

    it('un cambio di tipo non fa tornare negli elenchi i valori già sulla bottiglia', async () => {
      // "Sushi" e "Balsamico" erano stati eliminati dalle Impostazioni, ma la bottiglia li conserva.
      const previous = wine({ pairingTags: ['Sushi'], aromaTags: ['Balsamico'], subtype: 'Orange' })
      await learn({ ...previous, type: 'beer' }, previous)
      expect(await getCustomLists()).toEqual({})
    })

    it('un cambio di tipo aggiunge invece i valori che l’utente ha messo ora', async () => {
      const previous = wine({ subtype: 'Orange' })
      await learn({ ...previous, type: 'beer', subtype: 'Saison' }, previous)
      expect(await getCustomLists()).toEqual({ 'subtype.beer': [{ text: 'Saison' }] })
    })
  })
})

describe('gestione delle voci (Impostazioni)', () => {
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

  const wine = (extra) => ({ name: 'Derthona', type: 'wine', rating: 4, ...extra })
  const beer = (extra) => ({ name: 'Saison Dupont', type: 'beer', rating: 4, ...extra })
  const rejects = async (promise, message) => {
    const error = await promise.then(() => null, (e) => e)
    expect(error).toBeInstanceOf(ListError)
    if (message) expect(error.message).toBe(message)
  }

  describe('addEntry', () => {
    it('aggiunge una voce, con il gruppo per il Vitigno', async () => {
      await addEntry('grape', 'Pecorino', 'white')
      await addEntry('pairing', '  Sushi ')
      expect(await getCustomLists()).toEqual({ grape: [{ text: 'Pecorino', group: 'white' }], pairing: [{ text: 'Sushi' }] })
      expect(fullList('grape', await getCustomLists()).white).toContain('Pecorino')
    })

    it('rifiuta voci vuote, troppo lunghe, doppioni di predefinite e di aggiunte', async () => {
      await rejects(addEntry('grape', '   ', 'red'), 'Scrivi la voce.')
      await rejects(addEntry('appellation', 'a'.repeat(31)), 'Al massimo 30 caratteri.')
      await rejects(addEntry('grape', 'nebbiolo', 'red'), 'C’è già «Nebbiolo».')
      await addEntry('grape', 'Pecorino', 'white')
      await rejects(addEntry('grape', ' PECORINO ', 'red'), 'C’è già «Pecorino».')
      await rejects(addEntry('nope', 'x'), 'Elenco non valido.')
      expect((await getCustomLists()).grape).toHaveLength(1)
    })
  })

  describe('removeEntry', () => {
    it('toglie la voce e non tocca le bottiglie', async () => {
      const bottle = await createBottle(wine({ grape: 'Timorasso' }))
      await removeEntry('grape', 'Timorasso')
      expect(await getCustomLists()).toEqual({})
      expect((await db.bottles.get(bottle.id)).grape).toBe('Timorasso')
    })

    it('una voce predefinita non si elimina', async () => {
      await rejects(removeEntry('grape', 'Nebbiolo'), 'Le voci predefinite non si possono eliminare.')
    })
  })

  describe('countUsage', () => {
    it('conta solo le bottiglie del tipo giusto, per chiave', async () => {
      await createBottle(wine({ subtype: 'Orange' }))
      await createBottle(wine({ name: 'B', subtype: 'orange' }))
      await createBottle(beer({ subtype: 'Orange' }))
      expect(await countUsage('subtype.wine', 'Orange')).toBe(2)
      expect(await countUsage('subtype.beer', 'Orange')).toBe(1)
      expect(await countUsage('grape', 'Orange')).toBe(0)
    })

    it('aromi e abbinamenti: le bottiglie che hanno la voce', async () => {
      await createBottle(wine({ aromaTags: ['Balsamico', 'Tannico'], pairingTags: ['Sushi'] }))
      await createBottle(beer({ aromaTags: ['Balsamico'] }))
      expect(await countUsage('aroma.wine', 'balsamico')).toBe(1)
      expect(await countUsage('aroma.beer', 'Balsamico')).toBe(1)
      expect(await countUsage('pairing', 'Sushi')).toBe(1)
    })
  })

  describe('updateEntry', () => {
    it('rinomina la voce e aggiorna le bottiglie, anche quelle con il testo in minuscolo', async () => {
      await createBottle(wine({ grape: 'Timoraso' }))
      const lower = await createBottle(wine({ name: 'B', grape: 'timoraso' }))
      const other = await createBottle(wine({ name: 'C', grape: 'Ruchè' }))
      const before = (await db.bottles.get(lower.id)).updatedAt
      const otherBefore = (await db.bottles.get(other.id)).updatedAt
      await new Promise((r) => setTimeout(r, 5))
      const result = await updateEntry('grape', 'Timoraso', { text: 'Timorasso' })
      expect(result.updatedBottles).toBe(2)
      const grapes = (await db.bottles.toArray()).map((b) => b.grape).sort()
      expect(grapes).toEqual(['Ruchè', 'Timorasso', 'Timorasso'])
      expect((await getCustomLists()).grape.map((e) => e.text).sort()).toEqual(['Ruchè', 'Timorasso'])
      expect((await db.bottles.get(lower.id)).updatedAt > before).toBe(true)
      expect((await db.bottles.get(other.id)).updatedAt).toBe(otherBefore)
    })

    it('non tocca le bottiglie dell’altro tipo', async () => {
      await createBottle(wine({ subtype: 'Orange' }))
      const b = await createBottle(beer({ subtype: 'Orange' }))
      await updateEntry('subtype.wine', 'Orange', { text: 'Orange wine' })
      expect((await db.bottles.get(b.id)).subtype).toBe('Orange')
    })

    it('aromi: sostituisce la voce e toglie i doppioni nella stessa bottiglia', async () => {
      const b = await createBottle(wine({ aromaTags: ['Balsamico', 'Resinoso', 'Fruttato'] }))
      await removeEntry('aroma.wine', 'Resinoso') // la bottiglia lo conserva, ma l'elenco no
      await updateEntry('aroma.wine', 'Balsamico', { text: 'Resinoso' })
      expect((await db.bottles.get(b.id)).aromaTags).toEqual(['Resinoso', 'Fruttato'])
    })

    it('rifiuta un nome vuoto o già presente (predefinito o aggiunto) e non cambia nulla', async () => {
      const b = await createBottle(wine({ grape: 'Timoraso', pairingTags: [] }))
      await addEntry('grape', 'Pecorino', 'white')
      await rejects(updateEntry('grape', 'Timoraso', { text: '  ' }), 'Scrivi la voce.')
      await rejects(updateEntry('grape', 'Timoraso', { text: 'nebbiolo' }), 'C’è già «Nebbiolo».')
      await rejects(updateEntry('grape', 'Timoraso', { text: 'pecorino' }), 'C’è già «Pecorino».')
      expect((await db.bottles.get(b.id)).grape).toBe('Timoraso')
      expect((await getCustomLists()).grape.map((e) => e.text)).toEqual(['Timoraso', 'Pecorino'])
    })

    it('solo il gruppo: sposta la voce senza toccare le bottiglie', async () => {
      const b = await createBottle(wine({ grape: 'Timorasso' }))
      const before = (await db.bottles.get(b.id)).updatedAt
      const result = await updateEntry('grape', 'Timorasso', { group: 'white' })
      expect(result.updatedBottles).toBe(0)
      expect((await getCustomLists()).grape).toEqual([{ text: 'Timorasso', group: 'white' }])
      expect((await db.bottles.get(b.id)).updatedAt).toBe(before)
    })

    it('una voce predefinita non si rinomina; una voce che non c’è dà errore', async () => {
      await rejects(updateEntry('grape', 'Nebbiolo', { text: 'Nebbiolo d’Alba' }), 'Le voci predefinite non si possono modificare.')
      await rejects(updateEntry('grape', 'Inesistente', { text: 'X' }), 'Voce non trovata.')
    })
  })
})
