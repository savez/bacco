// Lettura del codice a barre (FR-024, research.md R7). API nativa quando disponibile
// (Chrome Android); altrimenti il ponyfill con il WASM caricato in locale (mai dalla
// CDN di default del pacchetto), così la scansione funziona anche offline su Safari iOS.

export const SUPPORTED_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

let cachedDetectorFactory

/**
 * Crea un BarcodeDetector (nativo o ponyfill). Il risultato è cacheato: la seconda
 * chiamata non ricarica il WASM.
 */
export async function createBarcodeDetector() {
  if (cachedDetectorFactory) return cachedDetectorFactory()

  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    const supported = await window.BarcodeDetector.getSupportedFormats()
    if (SUPPORTED_FORMATS.some((f) => supported.includes(f))) {
      cachedDetectorFactory = () => new window.BarcodeDetector({ formats: SUPPORTED_FORMATS })
      return cachedDetectorFactory()
    }
  }

  const [{ BarcodeDetector: PonyfillDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  prepareZXingModule({ overrides: { locateFile: () => wasmUrl } })
  cachedDetectorFactory = () => new PonyfillDetector({ formats: SUPPORTED_FORMATS })
  return cachedDetectorFactory()
}
