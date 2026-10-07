import { describe, it, expect } from 'vitest'
import { parseNotes } from '../../src/lib/notes.js'

describe('parseNotes', () => {
  it('restituisce un array vuoto per una nota vuota', () => {
    expect(parseNotes('')).toEqual([])
    expect(parseNotes('   ')).toEqual([])
  })

  it('trasforma righe consecutive che iniziano con "- " in un elenco', () => {
    const result = parseNotes('- ciliegia\n- liquirizia\n- catrame')
    expect(result).toEqual([{ type: 'ul', items: ['ciliegia', 'liquirizia', 'catrame'] }])
  })

  it('tratta il testo libero come paragrafi separati da righe vuote', () => {
    const result = parseNotes('Rosa intenso.\n\nBuona acidità.')
    expect(result).toEqual([
      { type: 'p', text: 'Rosa intenso.' },
      { type: 'p', text: 'Buona acidità.' },
    ])
  })

  it('mischia paragrafi ed elenchi nell\'ordine del testo', () => {
    const result = parseNotes('Al naso:\n- ciliegia\n- liquirizia\n\nIn bocca equilibrato.')
    expect(result).toEqual([
      { type: 'p', text: 'Al naso:' },
      { type: 'ul', items: ['ciliegia', 'liquirizia'] },
      { type: 'p', text: 'In bocca equilibrato.' },
    ])
  })

  it('non interpreta markup o tag come codice', () => {
    const result = parseNotes('<script>alert(1)</script> e **non in grassetto**')
    expect(result).toEqual([{ type: 'p', text: '<script>alert(1)</script> e **non in grassetto**' }])
  })
})
