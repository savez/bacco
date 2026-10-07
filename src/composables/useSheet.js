/**
 * Chiude il pannello modale (dettaglio o modifica) o le Impostazioni tornando alla pagina
 * da cui sono stati aperti. Se il pannello è stato aperto da un link diretto non c'è una pagina precedente
 * nell'app: si sostituisce la voce con `fallback` invece di uscire dall'app.
 * @param {import('vue-router').Router} router @param {string} [fallback]
 */
export function closeSheet(router, fallback = '/') {
  if (window.history.state?.back) router.back()
  else router.replace(fallback)
}
