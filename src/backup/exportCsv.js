import { db } from '../db/db.js'
import { getRatingLevel } from '../lib/rating.js'
import { downloadBlob, todayStamp } from '../lib/download.js'

const HEADER = [
  'id',
  'data_consumo',
  'nome',
  'produttore',
  'tipo',
  'sottocategoria',
  'denominazione',
  'annata',
  'gradazione',
  'punteggio',
  'punteggio_etichetta',
  'analisi_organolettica',
  'abbinamento',
  'note',
  'codice_a_barre',
  'link_scheda',
  'latitudine',
  'longitudine',
  'numero_foto',
  // Cantina (specs/002-cellar-inventory/contracts/csv-format.md).
  'in_cantina',
  'primo_assaggio',
  'contrassegno_di_stato',
  'aromi',
  'abbinamenti',
]

function formatLocalDateTime(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Protezione da formula injection (contracts/csv-format.md): le note che iniziano
 * con "- " (elenco) non vengono considerate formule. */
function needsFormulaGuard(text) {
  if (/^[=+@\t\r]/.test(text)) return true
  return text.startsWith('-') && text[1] !== ' '
}

function csvField(value) {
  const text = value === null || value === undefined ? '' : String(value)
  const guarded = needsFormulaGuard(text) ? `'${text}` : text
  if (/[;"\r\n]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`
  }
  return guarded
}

/**
 * Funzione pura: costruisce il testo CSV (contracts/csv-format.md).
 * @param {object[]} bottles
 * @param {Record<string, number>} photoCounts numero di foto per id bottiglia
 */
export function buildCsv(bottles, photoCounts = {}) {
  const sorted = [...bottles].sort((a, b) => b.consumedAt.localeCompare(a.consumedAt))
  const lines = [HEADER.join(';')]
  for (const bottle of sorted) {
    const level = getRatingLevel(bottle.rating)
    const row = [
      bottle.id,
      formatLocalDateTime(bottle.consumedAt),
      bottle.name,
      bottle.producer ?? '',
      bottle.type === 'wine' ? 'vino' : 'birra',
      bottle.subtype ?? '',
      bottle.appellation ?? '',
      bottle.vintage ?? '',
      bottle.abv ?? '',
      bottle.rating ?? '',
      level?.label ?? '',
      bottle.tasting ?? '',
      bottle.pairing ?? '',
      bottle.notes ?? '',
      bottle.barcode ?? '',
      bottle.externalUrl ?? '',
      bottle.location?.lat ?? '',
      bottle.location?.lon ?? '',
      photoCounts[bottle.id] ?? 0,
      bottle.cellarCount ?? 0,
      bottle.tastedAt ? formatLocalDateTime(bottle.tastedAt) : '',
      bottle.stateSeal ?? '',
      (bottle.aromaTags ?? []).join(', '),
      (bottle.pairingTags ?? []).join(', '),
    ]
    lines.push(row.map(csvField).join(';'))
  }
  return '﻿' + lines.join('\r\n') + '\r\n'
}

/** Legge il database ed esporta il registro in CSV (FR-014). */
export async function exportCsv() {
  const bottles = await db.bottles.toArray()
  const photoCounts = {}
  for (const photo of await db.photos.toArray()) {
    photoCounts[photo.bottleId] = (photoCounts[photo.bottleId] ?? 0) + 1
  }
  const csv = buildCsv(bottles, photoCounts)
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `bacco-registro-${todayStamp()}.csv`)
}
