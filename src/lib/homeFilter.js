// Dopo aver messo bottiglie in cantina il modulo torna alla Home con il filtro "In cantina"
// attivo. Un segnale in memoria, letto una volta sola, evita di passare dall'indirizzo
// (`/?cantina=1`), che richiedeva una seconda navigazione subito dopo la prima.
let cellarRequested = false

export function requestCellarFilter() {
  cellarRequested = true
}

/** @returns {boolean} true una sola volta dopo requestCellarFilter() */
export function takeCellarFilterRequest() {
  const requested = cellarRequested
  cellarRequested = false
  return requested
}
