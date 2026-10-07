// Geolocalizzazione (FR-011, research.md R13). Richiesta solo al tocco esplicito di
// "Aggiungi posizione": mai all'apertura del modulo.

/** @returns {Promise<{lat:number, lon:number, accuracy:number}>} */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(Object.assign(new Error('insecure'), { code: 'insecure' }))
      return
    }
    if (!navigator.geolocation) {
      reject(Object.assign(new Error('unsupported'), { code: 'unsupported' }))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (err) => {
        const map = { 1: 'denied', 2: 'unavailable', 3: 'timeout' }
        reject(Object.assign(new Error(map[err.code] ?? 'unavailable'), { code: map[err.code] ?? 'unavailable' }))
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  })
}
