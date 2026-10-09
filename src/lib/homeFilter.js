import { ref } from 'vue'

// Dopo un salvataggio il modulo torna alla Home su una scheda precisa: "Metti in cantina" →
// Cantina, "Salva bevuta" → Diario, nuovo desiderio → Wishlist. Un segnale in memoria, letto una
// volta sola, evita di passare dall'indirizzo (`/?scheda=…`), che richiedeva una seconda
// navigazione subito dopo la prima.
let requestedTab = null

// Scheda aperta in Home, letta dalla barra in basso: nella Wishlist il + centrale aggiunge un
// desiderio invece di una bottiglia. La scrive RegistryView.
export const currentHomeTab = ref('diario')

/** @param {'diario'|'cantina'|'wishlist'} tab */
export function requestHomeTab(tab) {
  requestedTab = tab
}

/** @returns {'diario'|'cantina'|'wishlist'|null} la scheda richiesta, una sola volta */
export function takeHomeTabRequest() {
  const tab = requestedTab
  requestedTab = null
  return tab
}
