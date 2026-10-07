// Note organolettiche a chip (specs/003-cantina-viva-ui): vocabolari fissi per vino, birra e
// abbinamenti. Unica fonte per modulo, "Com'è?", scheda, validazione e ricerca.

export const WINE_AROMAS = ['Fruttato', 'Floreale', 'Speziato', 'Erbaceo', 'Tostato', 'Minerale', 'Tannico', 'Fresco', 'Morbido', 'Sapido', 'Lungo', 'Corto']

export const BEER_AROMAS = ['Luppolato', 'Maltato', 'Caramello', 'Tostato', 'Agrumato', 'Erbaceo', 'Amaro', 'Fresco', 'Corposo', 'Leggero', 'Secco', 'Dolce']

export const PAIRINGS = ['Carne', 'Pesce', 'Formaggi', 'Pizza', 'Salumi', 'Dolci']

/** @param {'wine'|'beer'|null|undefined} type */
export function aromasFor(type) {
  if (type === 'wine') return WINE_AROMAS
  if (type === 'beer') return BEER_AROMAS
  return []
}

/**
 * Solo le voci del vocabolario, senza doppioni, nell'ordine del vocabolario.
 * @param {unknown} tags
 * @param {string[]} vocabulary
 * @returns {string[]}
 */
export function normalizeTags(tags, vocabulary) {
  if (!Array.isArray(tags)) return []
  const chosen = new Set(tags)
  return vocabulary.filter((tag) => chosen.has(tag))
}

/** Aromi scelti che restano validi per il tipo (es. da vino a birra: Tostato, Erbaceo, Fresco). */
export function keepValidAromas(tags, type) {
  return normalizeTags(tags, aromasFor(type))
}
