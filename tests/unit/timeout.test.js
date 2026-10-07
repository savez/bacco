import { describe, it, expect } from 'vitest'
import { withTimeout, TimeoutError } from '../../src/lib/timeout.js'

describe('withTimeout', () => {
  it('restituisce il risultato se arriva in tempo', async () => {
    await expect(withTimeout(Promise.resolve(42), 50)).resolves.toBe(42)
  })

  it('rifiuta con TimeoutError se la promessa non si risolve', async () => {
    await expect(withTimeout(new Promise(() => {}), 20, 'lento')).rejects.toBeInstanceOf(TimeoutError)
  })

  it('propaga gli errori della promessa', async () => {
    await expect(withTimeout(Promise.reject(new Error('no')), 50)).rejects.toThrow('no')
  })
})
