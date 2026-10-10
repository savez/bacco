import { listKey } from './search.js'

// Vitigni predefiniti per il menu del modulo (specs/004-vitigno). Non sono un elenco chiuso: con
// "Altro…" si scrive qualunque altro vitigno o un uvaggio, e dal 2026-10 (specs/006) quelli
// scritti a mano restano nel menu.
export const RED_GRAPES = [
  'Aglianico',
  'Barbera',
  'Cabernet Franc',
  'Cabernet Sauvignon',
  'Cannonau',
  'Corvina',
  'Dolcetto',
  'Lagrein',
  'Lambrusco',
  'Merlot',
  'Montepulciano',
  'Nebbiolo',
  'Negroamaro',
  'Nerello Mascalese',
  "Nero d'Avola",
  'Pinot Nero',
  'Primitivo',
  'Sagrantino',
  'Sangiovese',
  'Schiava',
  'Syrah',
  'Teroldego',
]

export const WHITE_GRAPES = [
  'Arneis',
  'Chardonnay',
  'Cortese',
  'Falanghina',
  'Fiano',
  'Garganega',
  'Gewürztraminer',
  'Glera',
  'Greco',
  'Grillo',
  'Moscato',
  'Pinot Bianco',
  'Pinot Grigio',
  'Ribolla Gialla',
  'Riesling',
  'Sauvignon Blanc',
  'Trebbiano',
  'Verdicchio',
  'Vermentino',
]

export const GRAPE_MAX = 60

const ALL = [...RED_GRAPES, ...WHITE_GRAPES]
const byKey = new Map(ALL.map((grape) => [listKey(grape), grape]))

/**
 * Vitigno ripulito: `null` se vuoto; la voce dell'elenco se il testo le corrisponde (senza
 * badare a maiuscole, accenti e spazi); altrimenti il testo libero con gli spazi compressi.
 * @param {string|null|undefined} text
 */
export function canonicalGrape(text) {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  if (clean.length === 0) return null
  return byKey.get(listKey(clean)) ?? clean
}
