import { ref } from 'vue'
import { uncork, recordFirstTasting, undoMove } from '../db/cellar.js'
import { showBanner, dismissBanner } from './useBanner.js'

const BANNER_ID = 'cellar-op'

/** Messaggio con "Annulla" per un'operazione di cantina appena fatta (FR-107). */
export function confirmWithUndo(message, operation) {
  showBanner({
    id: BANNER_ID,
    message,
    priority: 30,
    timeout: 8000,
    actions: [
      {
        label: 'Annulla',
        onClick: async () => {
          dismissBanner(BANNER_ID)
          await undoMove(operation)
          showBanner({ id: BANNER_ID, message: 'Operazione annullata', priority: 30 })
        },
      },
    ],
  })
}

/**
 * Stappa una bottiglia ovunque (riga della cantina, scheda): registra l'uscita, offre Annulla
 * e, al primo stappo di un'etichetta mai assaggiata, apre "Com'è?" (specs/003-cantina-viva-ui).
 */
export function useUncork() {
  const tastingFor = ref(null)

  async function uncorkBottle(bottle) {
    const operation = await uncork(bottle.id)
    confirmWithUndo('Stappata 1 bottiglia', operation)
    if (operation.needsTasting) tastingFor.value = bottle
  }

  async function saveTasting(input) {
    await recordFirstTasting(tastingFor.value.id, input)
    tastingFor.value = null
  }

  function later() {
    tastingFor.value = null
  }

  return { tastingFor, uncorkBottle, saveTasting, later }
}
