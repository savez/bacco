// Precompilazione del modulo da registro o Open Food Facts (FR-025/026): solo i campi
// vuoti, e la sottocategoria solo se coerente con il tipo che il modulo avrà dopo.
export const FIELD_LABELS = {
  name: 'nome',
  producer: 'produttore',
  vintage: 'annata',
  abv: 'gradazione',
  type: 'tipo',
  subtype: 'sottocategoria',
  appellation: 'denominazione',
}

/**
 * @param {{name?:string, producer?:string, vintage?:string, type?:string|null, subtype?:string}} form
 * @param {{name?:string, producer?:string|null, vintage?:number|null, type?:string, subtype?:string|null}} fields
 * @returns {{updates: Record<string, string>, filled: string[]}}
 */
export function computeFill(form, fields) {
  const updates = {}
  const filled = []
  const set = (key, value) => {
    updates[key] = value
    filled.push(FIELD_LABELS[key])
  }

  if (fields.name && !form.name) set('name', fields.name)
  if (fields.producer && !form.producer) set('producer', fields.producer)
  if (fields.vintage && !form.vintage) set('vintage', String(fields.vintage))
  if (fields.abv != null && fields.abv !== '' && !form.abv) set('abv', String(fields.abv).replace('.', ','))

  const typeAfter = form.type || fields.type || null
  if (fields.type && !form.type) set('type', fields.type)
  // "Rosso" su una birra non ha senso: se l'utente ha già scelto l'altro tipo, la
  // sottocategoria trovata viene ignorata.
  if (fields.subtype && !form.subtype && (!fields.type || fields.type === typeAfter)) {
    set('subtype', fields.subtype)
  }
  if (fields.appellation && !form.appellation && typeAfter === 'wine') {
    set('appellation', fields.appellation)
  }
  return { updates, filled }
}
