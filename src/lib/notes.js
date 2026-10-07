/**
 * Divide una nota in blocchi di paragrafo o elenco puntato (FR-010). Solo le righe
 * che iniziano con "- " diventano elementi di un elenco; tutto il resto è testo
 * semplice, mai interpretato come markup o codice (nessun v-html, principio II).
 * @param {string} text
 * @returns {Array<{type:'p', text:string} | {type:'ul', items:string[]}>}
 */
export function parseNotes(text) {
  if (!text || !text.trim()) return []

  const blocks = []
  let listBuffer = null

  function flushList() {
    if (listBuffer && listBuffer.length > 0) {
      blocks.push({ type: 'ul', items: listBuffer })
    }
    listBuffer = null
  }

  for (const line of text.split('\n')) {
    if (line.startsWith('- ')) {
      if (!listBuffer) listBuffer = []
      listBuffer.push(line.slice(2).trim())
    } else {
      flushList()
      const trimmed = line.trim()
      if (trimmed.length > 0) {
        blocks.push({ type: 'p', text: trimmed })
      }
    }
  }
  flushList()
  return blocks
}
