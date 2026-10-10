// Note organolettiche (specs/003-cantina-viva-ui): voci predefinite per vino, birra e abbinamenti.
// Dal 2026-10 (specs/006-menu-personalizzabili) non sono più un elenco chiuso: l'utente può
// aggiungere voci, che stanno in src/db/lists.js; qui restano le predefinite e `cleanTags`.
import { listKey } from './search.js'

export const WINE_AROMAS = ['Fruttato', 'Floreale', 'Speziato', 'Erbaceo', 'Tostato', 'Minerale', 'Tannico', 'Fresco', 'Morbido', 'Sapido', 'Lungo', 'Corto']

export const BEER_AROMAS = ['Luppolato', 'Maltato', 'Caramello', 'Tostato', 'Agrumato', 'Erbaceo', 'Amaro', 'Fresco', 'Corposo', 'Leggero', 'Secco', 'Dolce']

export const PAIRINGS = ['Carne', 'Pesce', 'Formaggi', 'Pizza', 'Salumi', 'Dolci']

/** Tutti gli aromi predefiniti, di vino e di birra, senza doppioni. */
export const ALL_AROMAS = [...new Set([...WINE_AROMAS, ...BEER_AROMAS])]

/**
 * Voci scelte ripulite: testi senza caratteri di controllo e con gli spazi compressi, vuoti e
 * non testi scartati, doppioni (stessa chiave) tolti, nell'ordine dato; ogni voce che
 * corrisponde a una di `canonical` ne prende il testo. Con `maxLength` le voci più lunghe si
 * scartano, con `maxCount` si tengono le prime.
 * @param {unknown} tags @param {string[]} canonical
 * @param {{maxLength?: number, maxCount?: number}} [limits]
 * @returns {string[]}
 */
export function cleanTags(tags, canonical, { maxLength = Infinity, maxCount = Infinity } = {}) {
  if (!Array.isArray(tags)) return []
  const known = new Map(canonical.map((tag) => [listKey(tag), tag]))
  const seen = new Set()
  const result = []
  for (const raw of tags) {
    if (typeof raw !== 'string') continue
    // eslint-disable-next-line no-control-regex
    const text = raw.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim()
    const key = listKey(text)
    if (!key || text.length > maxLength || seen.has(key)) continue
    seen.add(key)
    result.push(known.get(key) ?? text)
    if (result.length >= maxCount) break
  }
  return result
}
