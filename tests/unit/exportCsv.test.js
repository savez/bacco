import { describe, it, expect } from 'vitest'
import { buildCsv } from '../../src/backup/exportCsv.js'

function bottle(overrides) {
  return {
    id: 'id-1',
    name: 'Barolo Cannubi',
    producer: 'Borgogno',
    type: 'wine',
    vintage: 2019,
    rating: 4,
    consumedAt: '2026-10-07T18:00:00.000Z',
    notes: '',
    barcode: null,
    externalUrl: null,
    location: null,
    ...overrides,
  }
}

/** Righe del CSV come oggetti { colonna: valore } (campi senza ";" né a capo). */
function rows(csv) {
  const [header, ...lines] = csv.slice(1).split('\r\n').filter(Boolean)
  const cols = header.split(';')
  return lines.map((line) => Object.fromEntries(line.split(';').map((v, i) => [cols[i], v])))
}

describe('buildCsv', () => {
  it('inizia con il BOM UTF-8 e usa ";" e "\\r\\n"', () => {
    const csv = buildCsv([bottle()], { 'id-1': 0 })
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1).split('\r\n').filter(Boolean)).toHaveLength(2)
  })

  it('ha le colonne del contratto, nell\'ordine', () => {
    const header = buildCsv([], {}).slice(1).split('\r\n')[0].split(';')
    expect(header).toEqual([
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
      'in_cantina',
      'primo_assaggio',
      'contrassegno_di_stato',
      'aromi',
      'abbinamenti',
    ])
  })

  it('traduce il tipo e include etichetta del punteggio e numero di foto', () => {
    const [row] = rows(buildCsv([bottle()], { 'id-1': 2 }))
    expect(row.tipo).toBe('vino')
    expect(row.punteggio_etichetta).toBe('Ottimo / Molto tipico')
    expect(row.numero_foto).toBe('2')
  })

  it('lascia vuoti i campi assenti', () => {
    const [row] = rows(buildCsv([bottle({ producer: null, vintage: null })], { 'id-1': 0 }))
    expect(row.produttore).toBe('')
    expect(row.annata).toBe('')
    expect(row.denominazione).toBe('')
  })

  it('racchiude tra virgolette i campi con ";" o a capo, raddoppiando le virgolette interne', () => {
    const csv = buildCsv([bottle({ notes: 'Riga uno\nRiga due; con punto e virgola e "virgolette"' })], {
      'id-1': 0,
    })
    expect(csv).toContain('"Riga uno\nRiga due; con punto e virgola e ""virgolette"""')
  })

  it('protegge da formula injection, ma non le note che iniziano con "- "', () => {
    expect(rows(buildCsv([bottle({ notes: '=SUM(A1:A2)' })], {}))[0].note).toBe("'=SUM(A1:A2)")
    expect(rows(buildCsv([bottle({ notes: '- ciliegia' })], {}))[0].note).toBe('- ciliegia')
  })

  it('esporta coordinate, sottocategoria, denominazione, gradazione, analisi e abbinamento', () => {
    const [row] = rows(
      buildCsv(
        [
          bottle({
            location: { lat: 44.61235, lon: 7.93457, accuracy: 25 },
            subtype: 'Rosso',
            appellation: 'DOCG',
            abv: 13.5,
            tasting: 'viola, tannico',
            pairing: 'brasato',
          }),
        ],
        { 'id-1': 3 },
      ),
    )
    expect(row.latitudine).toBe('44.61235')
    expect(row.longitudine).toBe('7.93457')
    expect(row.sottocategoria).toBe('Rosso')
    expect(row.denominazione).toBe('DOCG')
    expect(row.gradazione).toBe('13.5')
    expect(row.analisi_organolettica).toBe('viola, tannico')
    expect(row.abbinamento).toBe('brasato')
  })
})

describe('colonne della cantina', () => {
  it('etichetta assaggiata: bottiglie in cantina e data del primo assaggio', () => {
    const [row] = rows(buildCsv([bottle({ cellarCount: 3, tastedAt: '2026-10-07T18:00:00.000Z' })], {}))
    expect(row.in_cantina).toBe('3')
    expect(row.primo_assaggio).toBe(row.data_consumo)
  })

  it('etichetta da assaggiare: punteggio e primo assaggio vuoti', () => {
    const [row] = rows(buildCsv([bottle({ rating: null, tastedAt: null, cellarCount: 6 })], {}))
    expect(row.punteggio).toBe('')
    expect(row.punteggio_etichetta).toBe('')
    expect(row.primo_assaggio).toBe('')
    expect(row.in_cantina).toBe('6')
  })

  it('record senza campi della cantina: 0 in cantina', () => {
    const [row] = rows(buildCsv([bottle()], {}))
    expect(row.in_cantina).toBe('0')
  })
})

describe('contrassegno di Stato', () => {
  it('esporta il seriale della fascetta', () => {
    const [row] = rows(buildCsv([bottle({ stateSeal: 'ADK007842971' })], {}))
    expect(row.contrassegno_di_stato).toBe('ADK007842971')
  })
})

describe('colonne dei chip', () => {
  it('aromi e abbinamenti separati da virgola', () => {
    const csv = buildCsv([bottle({ aromaTags: ['Tannico', 'Speziato'], pairingTags: ['Carne'] })], {})
    const header = csv.slice(1).split('\r\n')[0].split(';')
    expect(header.slice(-2)).toEqual(['aromi', 'abbinamenti'])
    expect(csv).toContain('Tannico, Speziato;Carne')
  })
})
