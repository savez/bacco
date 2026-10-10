import { describe, it, expect } from 'vitest'
import { RED_GRAPES, WHITE_GRAPES, GRAPE_MAX, canonicalGrape } from '../../src/lib/grapes.js'

const sorted = (list) => [...list].sort((a, b) => a.localeCompare(b, 'it'))

describe('elenco dei vitigni', () => {
  it('ha 22 uve a bacca nera e 19 a bacca bianca, in ordine alfabetico', () => {
    expect(RED_GRAPES).toHaveLength(22)
    expect(WHITE_GRAPES).toHaveLength(19)
    expect(RED_GRAPES).toEqual(sorted(RED_GRAPES))
    expect(WHITE_GRAPES).toEqual(sorted(WHITE_GRAPES))
  })

  it('non ha doppioni, nemmeno tra i due gruppi', () => {
    const all = [...RED_GRAPES, ...WHITE_GRAPES]
    expect(new Set(all).size).toBe(all.length)
  })

  it('contiene i vitigni della specifica', () => {
    expect(RED_GRAPES).toContain('Nebbiolo')
    expect(RED_GRAPES).toContain("Nero d'Avola")
    expect(WHITE_GRAPES).toContain('Gewürztraminer')
    expect(WHITE_GRAPES).toContain('Vermentino')
    expect(GRAPE_MAX).toBe(60)
  })
})

describe('canonicalGrape', () => {
  it('riconosce una voce d’elenco ignorando maiuscole, accenti e spazi', () => {
    expect(canonicalGrape('  nebbiolo ')).toBe('Nebbiolo')
    expect(canonicalGrape('gewurztraminer')).toBe('Gewürztraminer')
    expect(canonicalGrape("nero  d'avola")).toBe("Nero d'Avola")
  })

  it('conserva un testo libero, ripulito', () => {
    expect(canonicalGrape('Timorasso')).toBe('Timorasso')
    expect(canonicalGrape('  Merlot   e Cabernet Franc ')).toBe('Merlot e Cabernet Franc')
  })

  it('vuoto o solo spazi → null', () => {
    expect(canonicalGrape('   ')).toBeNull()
    expect(canonicalGrape(null)).toBeNull()
    expect(canonicalGrape(undefined)).toBeNull()
  })
})
