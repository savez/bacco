import { describe, it, expect } from 'vitest'
import { computeFill } from '../../src/lib/lookupFill.js'

const empty = () => ({ name: '', producer: '', vintage: '', abv: '', type: null, subtype: '', appellation: '' })

describe('computeFill', () => {
  it('compila solo i campi vuoti e ne restituisce i nomi', () => {
    const form = { ...empty(), name: 'Già scritto' }
    const { updates, filled } = computeFill(form, {
      name: 'Da OFF',
      producer: 'Borgogno',
      type: 'wine',
      subtype: 'Rosso',
    })
    expect(updates).toEqual({ producer: 'Borgogno', type: 'wine', subtype: 'Rosso' })
    expect(filled).toEqual(['produttore', 'tipo', 'sottocategoria'])
  })

  it('ignora la sottocategoria se il tipo scelto dall\'utente è diverso', () => {
    const form = { ...empty(), type: 'beer' }
    const { updates } = computeFill(form, { name: 'Barolo', type: 'wine', subtype: 'Rosso' })
    expect(updates.subtype).toBeUndefined()
    expect(updates.type).toBeUndefined()
    expect(updates.name).toBe('Barolo')
  })

  it('mantiene una sottocategoria libera dal registro', () => {
    const { updates } = computeFill(empty(), { name: 'Saison Dupont', type: 'beer', subtype: 'Saison' })
    expect(updates.subtype).toBe('Saison')
  })

  it('precompila la denominazione solo se il tipo resta vino', () => {
    expect(computeFill(empty(), { type: 'wine', appellation: 'DOCG' }).updates.appellation).toBe('DOCG')
    expect(computeFill({ ...empty(), type: 'beer' }, { type: 'wine', appellation: 'DOCG' }).updates.appellation).toBeUndefined()
  })

  it('precompila la gradazione con la virgola decimale', () => {
    const { updates, filled } = computeFill(empty(), { abv: 13.5 })
    expect(updates.abv).toBe('13,5')
    expect(filled).toEqual(['gradazione'])
  })

  it('converte l\'annata in testo e non sovrascrive una sottocategoria già scelta', () => {
    const form = { ...empty(), type: 'wine', subtype: 'Bianco' }
    const { updates, filled } = computeFill(form, { vintage: 2019, type: 'wine', subtype: 'Rosso' })
    expect(updates).toEqual({ vintage: '2019' })
    expect(filled).toEqual(['annata'])
  })
})
