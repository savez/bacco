import { parseNotes } from './notes.js'

/**
 * Estratto delle note per la card (contracts/share-card.md): gli elenchi diventano
 * testo continuo separato da virgole, troncato a parola con "…".
 * @param {string} notes
 * @param {number} [max]
 */
export function notesExcerpt(notes, max = 140) {
  const pieces = []
  for (const block of parseNotes(notes)) {
    if (block.type === 'ul') pieces.push(...block.items)
    else pieces.push(block.text)
  }
  const full = pieces.join(', ')
  if (full.length <= max) return full

  const truncated = full.slice(0, max)
  const lastSpace = truncated.lastIndexOf(' ')
  const cut = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated
  return `${cut.replace(/[,\s]+$/, '')}…`
}

/** @param {number} rating */
export function starsFor(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

export const BACCO_SITE = 'bacco-8in8.onrender.com'

/** Testo che accompagna la card condivisa (contracts/share-card.md). @param {object} bottle */
export function shareText(bottle) {
  const head = bottle.externalUrl ? `${bottle.name} — ${bottle.externalUrl}` : bottle.name
  return `${head}\n\nRegistrato con Bacco · https://${BACCO_SITE}`
}

/** @param {string} name */
export function cardFileName(name) {
  const slug = (name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `bacco-${slug}.png`
}
