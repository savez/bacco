// Ridimensionamento foto (FR-009, research.md R10). Eseguito solo nel browser: la
// ricodifica tramite canvas scarta automaticamente i metadati EXIF (incluso un
// eventuale GPS nascosto nella foto), coerente con il principio di privacy.

async function resizeTo(file, maxSide, quality) {
  if (!file.type?.startsWith('image/')) {
    throw new Error('Il file scelto non è un\'immagine.')
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Impossibile elaborare la foto.'))),
      'image/jpeg',
      quality,
    )
  })
}

/**
 * @param {File} file
 * @param {{maxSide?: number, quality?: number}} [opts]
 */
export function resizeImage(file, { maxSide = 1600, quality = 0.8 } = {}) {
  return resizeTo(file, maxSide, quality)
}

/**
 * @param {Blob} blob
 * @param {{maxSide?: number}} [opts]
 */
export function makeThumbnail(blob, { maxSide = 320 } = {}) {
  return resizeTo(blob, maxSide, 0.8)
}
