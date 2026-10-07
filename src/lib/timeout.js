export class TimeoutError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Rifiuta con TimeoutError se `promise` non si risolve entro `ms`. Serve a non lasciare
 * l'interfaccia appesa se il database del dispositivo non risponde (es. bloccato da
 * un'altra finestra durante un aggiornamento).
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, message = 'Operazione scaduta.') {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
