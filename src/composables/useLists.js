import { useLiveQuery } from './useLiveQuery.js'
import { liveCustomLists, getCustomLists } from '../db/lists.js'
import { fullList, allTexts } from '../lib/lists.js'

/**
 * Elenchi completi (predefinite + voci aggiunte) per modulo, "Com'è?", filtro Tipologia e
 * Impostazioni (specs/006-menu-personalizzabili, research R6). Si aggiornano da soli quando
 * una voce viene aggiunta, rinominata o eliminata.
 *
 * `customLists` è un ref: in modifica una bottiglia il modulo lo riempie con `loadCustomLists()`
 * prima di decidere "Altro…", perché la lettura reattiva parte solo a componente montato.
 */
export function useLists() {
  const customLists = useLiveQuery(() => liveCustomLists(), {})
  return {
    customLists,
    /** Elenco completo: array di testi; per il Vitigno `{ red, white, other }`. */
    full: (listId) => fullList(listId, customLists.value),
    /** Tutte le voci in un'unica lista di testi (anche per il Vitigno). */
    texts: (listId) => allTexts(listId, customLists.value),
  }
}

/** Lettura una tantum delle voci aggiunte. */
export const loadCustomLists = getCustomLists
