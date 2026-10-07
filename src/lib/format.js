/**
 * Tipo con sottocategoria e denominazione, es. "Vino · Rosso · DOCG".
 * @param {{type:string, subtype?:string|null, appellation?:string|null}} bottle
 */
export function kindLabel(bottle, separator = ' · ') {
  return [bottle.type === 'wine' ? 'Vino' : 'Birra', bottle.subtype, bottle.appellation]
    .filter(Boolean)
    .join(separator)
}

/** Gradazione per la lettura, es. 13.5 → "13,5% vol". @param {number|null} abv */
export function formatAbv(abv) {
  if (abv === null || abv === undefined) return ''
  return `${abv.toLocaleString('it-IT', { maximumFractionDigits: 1 })}% vol`
}

const dayFormatter = new Intl.DateTimeFormat('it-IT', { day: '2-digit' })
const dateTimeFormatter = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const monthFormatter = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })

/** @param {string} iso */
export function formatDay(iso) {
  return dayFormatter.format(new Date(iso))
}

/** @param {string} iso */
export function formatDateTime(iso) {
  return dateTimeFormatter.format(new Date(iso))
}

/** @param {string} iso → es. "OTTOBRE 2026" */
export function formatMonthHeading(iso) {
  return monthFormatter.format(new Date(iso)).toUpperCase()
}

/** Chiave di raggruppamento stabile per mese, es. "2026-10". @param {string} iso */
export function monthKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** ISO → valore per <input type="datetime-local"> (ora locale). @param {string} iso */
export function toDateTimeLocalValue(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Valore di <input type="datetime-local"> → ISO. @param {string} value */
export function fromDateTimeLocalValue(value) {
  if (!value) return new Date().toISOString()
  return new Date(value).toISOString()
}

/** ISO → { date: 'YYYY-MM-DD', time: 'HH:mm' } in ora locale, per <input type="date|time">. */
export function toDateAndTime(iso) {
  const [date, time] = toDateTimeLocalValue(iso).split('T')
  return { date, time }
}

/**
 * Data e ora separate (ora locale) → ISO. Ora vuota = mezzogiorno, data vuota = adesso.
 * @param {string} date 'YYYY-MM-DD'
 * @param {string} time 'HH:mm'
 */
export function fromDateAndTime(date, time) {
  if (!date) return new Date().toISOString()
  return new Date(`${date}T${time || '12:00'}`).toISOString()
}
