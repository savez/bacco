import Dexie from 'dexie'
import { showBanner } from '../composables/useBanner.js'
import { mergeLegacyTasting } from '../lib/validate.js'

// Database locale (IndexedDB via Dexie). Vedi data-model.md per lo schema completo.
//
// Regola delle migrazioni (costituzione, principio III): una nuova versione dello schema
// si aggiunge SEMPRE con `db.version(n+1).stores({...}).upgrade(tx => {...})`, senza mai
// rimuovere o modificare le versioni precedenti. Ogni nuova versione ha un test Vitest con
// fake-indexeddb che apre un DB alla versione precedente, lo fa evolvere e verifica i dati.
export const db = new Dexie('bacco')

db.version(1).stores({
  bottles: 'id, consumedAt, updatedAt, type, barcode',
  photos: 'id, bottleId, [bottleId+order]',
  settings: 'key',
})

// v2 (2026-10-07): "profumi" e "sapore" diventano un unico campo, l'analisi
// organolettica personale (`tasting`). Indici invariati.
db.version(2)
  .stores({
    bottles: 'id, consumedAt, updatedAt, type, barcode',
    photos: 'id, bottleId, [bottleId+order]',
    settings: 'key',
  })
  .upgrade((tx) =>
    tx
      .table('bottles')
      .toCollection()
      .modify((bottle) => {
        if (!('aromas' in bottle) && !('taste' in bottle)) return
        bottle.tasting = bottle.tasting || mergeLegacyTasting(bottle.aromas, bottle.taste)
        delete bottle.aromas
        delete bottle.taste
      }),
  )

// v3 (cantina, specs/002-cellar-inventory): ogni bottiglia diventa un'etichetta con le
// bottiglie in casa (`cellarCount`), la data del primo assaggio (`tastedAt`, null = da
// assaggiare) e un registro movimenti nella nuova tabella `cellarMoves`. Le voci esistenti
// sono tutte assaggiate: primo assaggio = data di consumo, 0 bottiglie in cantina.
db.version(3)
  .stores({
    bottles: 'id, consumedAt, tastedAt, updatedAt, type, barcode',
    photos: 'id, bottleId, [bottleId+order]',
    settings: 'key',
    cellarMoves: 'id, bottleId, [bottleId+at]',
  })
  .upgrade(async (tx) => {
    const firstMoves = []
    await tx
      .table('bottles')
      .toCollection()
      .modify((bottle) => {
        bottle.cellarCount = 0
        bottle.cellarUpdatedAt = null
        bottle.tastedAt = bottle.consumedAt ?? null
        firstMoves.push({
          id: crypto.randomUUID(),
          bottleId: bottle.id,
          type: 'first',
          qty: null,
          from: null,
          to: null,
          at: bottle.consumedAt ?? bottle.createdAt ?? new Date().toISOString(),
        })
      })
    await tx.table('cellarMoves').bulkAdd(firstMoves)
  })

// v4 (wishlist, specs/005-wishlist): nuova tabella `wishes` per i vini e le birre da
// provare. Nessun dato da convertire: la tabella nasce vuota, le altre restano come in v3.
db.version(4).stores({
  bottles: 'id, consumedAt, tastedAt, updatedAt, type, barcode',
  photos: 'id, bottleId, [bottleId+order]',
  settings: 'key',
  cellarMoves: 'id, bottleId, [bottleId+at]',
  wishes: 'id, createdAt',
})

// --- Più finestre aperte -----------------------------------------------------------------
// Un aggiornamento dello schema aspetta che TUTTE le finestre di Bacco chiudano il database.
// Se una resta aperta l'aggiornamento si blocca, e con lui ogni lettura e salvataggio: per
// questo chi riceve la richiesta chiude subito il database e chiede di ricaricare, e chi
// resta in attesa lo dice invece di restare appeso.
db.on('versionchange', () => {
  db.close()
  showBanner({
    id: 'db-versionchange',
    message: 'Bacco è stato aggiornato in un\'altra finestra. Ricarica per continuare.',
    tone: 'error',
    priority: 100,
    actions: [{ label: 'Ricarica', onClick: () => location.reload() }],
  })
  return false
})

db.on('blocked', () => {
  showBanner({
    id: 'db-blocked',
    message: 'Aggiornamento dei dati in attesa: chiudi le altre finestre o schede di Bacco aperte.',
    tone: 'error',
    priority: 100,
  })
})

/**
 * Apre il database all'avvio: se non riesce lo dice subito, invece di far restare appeso
 * il primo salvataggio.
 */
export async function openDatabase() {
  try {
    await db.open()
    return true
  } catch (err) {
    showBanner({
      id: 'db-open-error',
      message: `Impossibile aprire i dati sul dispositivo (${err?.name ?? 'errore'}). Chiudi le altre finestre di Bacco e riaprila.`,
      tone: 'error',
      priority: 100,
    })
    return false
  }
}

/**
 * Richiede l'archiviazione persistente al browser (best-effort): riduce il rischio che il
 * browser cancelli i dati per liberare spazio. Non blocca l'app se non disponibile o rifiutata.
 */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) {
      await navigator.storage.persist()
    }
  } catch {
    // Non disponibile in alcuni contesti (es. modalità privata): si prosegue comunque.
  }
}
