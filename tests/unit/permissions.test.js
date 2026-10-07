import { describe, it, expect } from 'vitest'
import { detectPlatform, explainCameraError, explainLocationError } from '../../src/lib/permissions.js'

const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

describe('detectPlatform', () => {
  it('riconosce sistema e browser', () => {
    expect(detectPlatform(MAC_CHROME, 0)).toEqual({ os: 'mac', browser: 'Chrome' })
    expect(detectPlatform(MAC_SAFARI, 0)).toEqual({ os: 'mac', browser: 'Safari' })
    expect(detectPlatform(IPHONE, 5)).toEqual({ os: 'ios', browser: 'Safari' })
    expect(detectPlatform(MAC_SAFARI, 5).os).toBe('ios') // iPadOS si presenta come Mac
  })
})

describe('explainCameraError', () => {
  it('permesso negato su Mac: impostazioni del sito e di macOS, senza nominare un browser', () => {
    for (const browser of ['Chrome', 'Safari', 'Firefox']) {
      const steps = explainCameraError({ name: 'NotAllowedError' }, { os: 'mac', browser }).steps.join(' ')
      expect(steps).toMatch(/Privacy e sicurezza › Fotocamera/)
      expect(steps).toMatch(/il browser che stai usando/)
      expect(steps).not.toMatch(/Chrome|Safari|Firefox/)
    }
  })

  it('fotocamera in uso', () => {
    const help = explainCameraError({ name: 'NotReadableError' }, { os: 'mac', browser: 'Safari' })
    expect(help.title).toMatch(/un'altra app/)
  })

  it('nessuna fotocamera', () => {
    expect(explainCameraError({ name: 'NotFoundError' }, { os: 'mac', browser: 'Chrome' }).title).toMatch(
      /Nessuna fotocamera/,
    )
  })
})

describe('explainLocationError', () => {
  it('posizione non disponibile su Mac indica i Servizi di localizzazione', () => {
    const help = explainLocationError('unavailable', { os: 'mac', browser: 'Chrome' })
    expect(help.steps[0]).toMatch(/Servizi di localizzazione/)
  })

  it('permesso negato su iPhone', () => {
    const help = explainLocationError('denied', { os: 'ios', browser: 'Safari' })
    expect(help.steps.join(' ')).toMatch(/Localizzazione/)
  })
})
