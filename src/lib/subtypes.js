// Sottocategorie predefinite (FR-028). L'utente può sempre scriverne una libera ("Altro").
export const WINE_SUBTYPES = ['Rosso', 'Bianco', 'Rosato', 'Bollicine', 'Passito']

export const BEER_SUBTYPES = [
  'Lager',
  'Pils',
  'IPA',
  'Ale',
  'Dubbel',
  'Tripel',
  'Bock',
  'Stout',
  'Porter',
  'Wheat',
  'Sour',
]

// Denominazioni del vino (FR-032). Non si applicano alla birra.
export const APPELLATIONS = ['DOCG', 'DOC', 'IGT', 'IGP']

/** @param {'wine'|'beer'|null} type */
export function subtypesFor(type) {
  if (type === 'wine') return WINE_SUBTYPES
  if (type === 'beer') return BEER_SUBTYPES
  return []
}
