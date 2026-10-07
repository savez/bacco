/**
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  // Nel DOM e rimosso subito dopo: Safari può interrompere il download se il link
  // non è mai stato "reale". L'URL si revoca con un ritardo, non subito dopo click(),
  // perché su Safari il download parte in modo asincrono.
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

/** Data odierna in formato YYYY-MM-DD, ora locale. */
export function todayStamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
