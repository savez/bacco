import { formatMonthHeading, monthKey } from './format.js'

/** Minuscolo e senza accenti, per confronti di ricerca. @param {string} text */
export function normalizeText(text) {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * @param {object[]} bottles
 * @param {{query?: string, type?: 'wine'|'beer'}} filters
 */
export function filterBottles(bottles, { query, type, year, month } = {}) {
  const needle = query ? normalizeText(query) : ''
  return bottles.filter((b) => {
    if (type && b.type !== type) return false
    if (year || month) {
      // Anno e mese in ora locale, come li vede l'utente nel registro.
      const d = new Date(b.consumedAt)
      if (year && d.getFullYear() !== year) return false
      if (month && d.getMonth() + 1 !== month) return false
    }
    if (!needle) return true
    return (
      normalizeText(b.name).includes(needle) || normalizeText(b.producer ?? '').includes(needle)
    )
  })
}

/** Anni presenti nel registro, dal più recente. @param {object[]} bottles */
export function availableYears(bottles) {
  const years = new Set(bottles.map((b) => new Date(b.consumedAt).getFullYear()))
  return [...years].sort((a, b) => b - a)
}

/**
 * Mesi (1–12) presenti nel registro, in ordine di calendario; se c'è un anno, solo di
 * quell'anno. @param {object[]} bottles @param {number|null} [year]
 */
export function availableMonths(bottles, year = null) {
  const months = new Set()
  for (const b of bottles) {
    const d = new Date(b.consumedAt)
    if (!year || d.getFullYear() === year) months.add(d.getMonth() + 1)
  }
  return [...months].sort((a, b) => a - b)
}

/**
 * Raggruppa per mese (ordine cronologico discendente, coerente con l'ordinamento in ingresso).
 * @param {object[]} bottles
 */
export function groupByMonth(bottles) {
  const groups = []
  const byKey = new Map()
  for (const bottle of bottles) {
    const key = monthKey(bottle.consumedAt)
    let group = byKey.get(key)
    if (!group) {
      group = { key, heading: formatMonthHeading(bottle.consumedAt), items: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    group.items.push(bottle)
  }
  return groups
}
