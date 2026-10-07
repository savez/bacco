// Dati di prova per verificare le prestazioni con molte bottiglie (SC-005). Mai
// incluso nella build di produzione: importato solo da main.js sotto `import.meta.env.DEV`.
import { db } from '../db/db.js'

const NAMES = ['Barolo', 'Chianti', 'Tipopils', 'Nebbiolo', 'IPA artigianale', 'Amarone', 'Weiss']
const PRODUCERS = ['Borgogno', 'Birrificio Italiano', 'Antinori', 'Baladin', null]

/** @param {number} n numero di bottiglie fittizie da creare */
export async function seed(n = 1000) {
  const now = Date.now()
  const rows = Array.from({ length: n }, (_, i) => {
    const consumedAt = new Date(now - i * 3600_000).toISOString()
    return {
      id: crypto.randomUUID(),
      name: `${NAMES[i % NAMES.length]} #${i}`,
      producer: PRODUCERS[i % PRODUCERS.length],
      type: i % 2 === 0 ? 'wine' : 'beer',
      vintage: 2015 + (i % 10),
      rating: (i % 5) + 1,
      consumedAt,
      notes: '',
      barcode: null,
      externalUrl: null,
      location: null,
      createdAt: consumedAt,
      updatedAt: consumedAt,
    }
  })
  await db.bottles.bulkPut(rows)
  console.log(`[bacco] Create ${n} bottiglie di prova.`)
}

if (import.meta.env.DEV) {
  window.__baccoSeed = seed
}
