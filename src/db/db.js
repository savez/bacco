import Dexie from 'dexie'
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
