// Permessi di fotocamera e posizione (FR-030): stato, e spiegazione degli errori con i
// passi per sbloccarli, specifici per sistema e browser.

/** @param {string} [ua] @param {number} [touchPoints] */
export function detectPlatform(ua = navigator.userAgent, touchPoints = navigator.maxTouchPoints ?? 0) {
  // iPadOS si presenta come Mac: lo riconosciamo dallo schermo touch.
  const os = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)
    ? 'ios'
    : /Android/.test(ua)
      ? 'android'
      : /Macintosh|Mac OS X/.test(ua)
        ? 'mac'
        : /Windows/.test(ua)
          ? 'windows'
          : 'other'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\/|FxiOS/.test(ua)
      ? 'Firefox'
      : /Chrome\/|CriOS/.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'il browser'
  return { os, browser }
}

/**
 * Stato di un permesso: 'granted' | 'denied' | 'prompt' | 'unknown' (API non supportata,
 * es. "camera" su Firefox o su Safari meno recenti).
 * @param {'camera'|'geolocation'} name
 */
export async function queryPermission(name) {
  try {
    const status = await navigator.permissions.query({ name })
    return status.state
  } catch {
    return 'unknown'
  }
}

// Passi generici, validi per qualsiasi browser (Chrome, Safari, Firefox, Edge…): cambia
// solo il percorso nelle impostazioni del sistema operativo.
function siteStep(platform, what) {
  if (platform.os === 'ios') {
    return `Nella barra dell'indirizzo apri le impostazioni del sito (icona «aA» o lucchetto) e consenti ${what}.`
  }
  return `Clicca l'icona a sinistra dell'indirizzo (lucchetto o impostazioni del sito) e consenti ${what}.`
}

function systemStep(platform, kind) {
  const camera = kind === 'camera'
  switch (platform.os) {
    case 'mac':
      return camera
        ? 'Impostazioni di Sistema › Privacy e sicurezza › Fotocamera: attiva il browser che stai usando, poi chiudilo e riaprilo.'
        : 'Impostazioni di Sistema › Privacy e sicurezza › Servizi di localizzazione: attivali e attiva il browser che stai usando.'
    case 'ios':
      return camera
        ? 'Impostazioni › il browser che stai usando › Fotocamera: «Chiedi» o «Consenti».'
        : 'Impostazioni › Privacy e sicurezza › Localizzazione: attivala e consenti il browser che stai usando.'
    case 'android':
      return camera
        ? 'Impostazioni › App › il browser che stai usando › Autorizzazioni › Fotocamera: «Consenti».'
        : 'Impostazioni › Posizione: attivala; poi App › il browser che stai usando › Autorizzazioni › Posizione: «Consenti».'
    case 'windows':
      return camera
        ? "Impostazioni › Privacy e sicurezza › Fotocamera: consenti l'accesso alle app desktop."
        : 'Impostazioni › Privacy e sicurezza › Posizione: attiva i servizi di localizzazione.'
    default:
      return camera
        ? 'Controlla che il sistema operativo consenta al browser di usare la fotocamera.'
        : 'Controlla che i servizi di localizzazione del sistema siano attivi per il browser.'
  }
}

const RELOAD_STEP = 'Torna qui e tocca «Riprova».'

/** @param {'camera'|'location'} kind @returns {{title:string, steps:string[]}} */
export function insecureContextHelp(kind) {
  return {
    title: `${kind === 'camera' ? 'La fotocamera' : 'La posizione'} funziona solo su una connessione sicura.`,
    steps: [
      `Stai usando ${location.origin}: apri Bacco da https:// oppure da http://localhost.`,
      "Dal telefono usa l'indirizzo https://<IP del computer>:8443 (vedi quickstart).",
    ],
  }
}

/**
 * Errore di getUserMedia → motivo e passi.
 * @param {{name?: string}} error
 * @param {{os:string, browser:string}} [platform]
 */
export function explainCameraError(error, platform = detectPlatform()) {
  switch (error?.name) {
    case 'InsecureContextError':
      return insecureContextHelp('camera')
    case 'NotAllowedError':
    case 'SecurityError':
      return {
        title: 'La fotocamera è bloccata.',
        steps: [siteStep(platform, 'la fotocamera'), systemStep(platform, 'camera'), RELOAD_STEP],
      }
    case 'NotFoundError':
    case 'OverconstrainedError':
      return {
        title: 'Nessuna fotocamera trovata su questo dispositivo.',
        steps: ['Collega una fotocamera, oppure scegli una foto dal dispositivo.'],
      }
    case 'NotReadableError':
    case 'AbortError':
      return {
        title: 'La fotocamera è usata da un\'altra app o bloccata dal sistema.',
        steps: [
          'Chiudi le app che la stanno usando (es. FaceTime, Zoom, un\'altra scheda).',
          systemStep(platform, 'camera'),
          RELOAD_STEP,
        ],
      }
    default:
      return {
        title: 'La fotocamera non è disponibile.',
        steps: [siteStep(platform, 'la fotocamera'), systemStep(platform, 'camera'), RELOAD_STEP],
      }
  }
}

/**
 * Codice di errore della geolocalizzazione (src/lib/geo.js) → motivo e passi.
 * @param {string} code 'denied'|'unavailable'|'timeout'|'unsupported'|'insecure'
 * @param {{os:string, browser:string}} [platform]
 */
export function explainLocationError(code, platform = detectPlatform()) {
  switch (code) {
    case 'insecure':
      return insecureContextHelp('location')
    case 'denied':
      return {
        title: 'La posizione è bloccata. La bottiglia verrà salvata senza.',
        steps: [siteStep(platform, 'la posizione'), systemStep(platform, 'location'), RELOAD_STEP],
      }
    case 'timeout':
      return {
        title: 'La posizione non è arrivata in tempo. La bottiglia verrà salvata senza.',
        steps: ['Spostati dove c\'è segnale o Wi-Fi.', RELOAD_STEP],
      }
    case 'unsupported':
      return {
        title: 'Questo browser non fornisce la posizione.',
        steps: ['Prova con un altro browser.'],
      }
    default:
      // Su Mac "non disponibile" arriva di solito quando i Servizi di localizzazione
      // sono spenti per il browser: nessuna richiesta compare.
      return {
        title: 'Posizione non disponibile. La bottiglia verrà salvata senza.',
        steps: [systemStep(platform, 'location'), siteStep(platform, 'la posizione'), RELOAD_STEP],
      }
  }
}
