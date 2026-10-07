import { describe, it, expect } from 'vitest'
import { notesExcerpt, starsFor, shareText, cardFileName } from '../../src/lib/shareText.js'

describe('notesExcerpt', () => {
  it('trasforma gli elenchi in testo continuo separato da virgole', () => {
    expect(notesExcerpt('- ciliegia\n- liquirizia')).toBe('ciliegia, liquirizia')
  })

  it('tronca a parola oltre il massimo, aggiungendo "…"', () => {
    const long = 'a'.repeat(10) + ' ' + 'b'.repeat(10) + ' ' + 'c'.repeat(10)
    const result = notesExcerpt(long, 15)
    expect(result.length).toBeLessThanOrEqual(16)
    expect(result.endsWith('…')).toBe(true)
    expect(result).not.toContain(' …')
  })

  it('restituisce stringa vuota per note vuote', () => {
    expect(notesExcerpt('')).toBe('')
  })
})

describe('starsFor', () => {
  it('disegna le stelle piene e vuote', () => {
    expect(starsFor(4)).toBe('★★★★☆')
    expect(starsFor(1)).toBe('★☆☆☆☆')
    expect(starsFor(5)).toBe('★★★★★')
  })
})

describe('shareText', () => {
  it('include il link se presente', () => {
    expect(shareText({ name: 'Barolo', externalUrl: 'https://example.com' })).toBe(
      'Barolo — https://example.com\n\nRegistrato con Bacco · https://bacco.smzstudio.it',
    )
  })

  it('restituisce solo il nome se non c\'è link', () => {
    expect(shareText({ name: 'Barolo', externalUrl: null })).toBe(
      'Barolo\n\nRegistrato con Bacco · https://bacco.smzstudio.it',
    )
  })
})

describe('cardFileName', () => {
  it('normalizza il nome per usarlo come nome file', () => {
    expect(cardFileName("Nebbiolo d'Alba!")).toBe('bacco-nebbiolo-d-alba.png')
  })
})
