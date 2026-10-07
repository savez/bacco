import { db } from '../db/db.js'
import { validateBottle, validateMove } from '../lib/validate.js'
import { move } from '../db/bottles.js'

const MAX_SIZE = 300 * 1024 * 1024
// v1: solo bottiglie (Bacco 1.0); v2: anche cantina e movimenti (specs/002-cellar-inventory).
const SUPPORTED_FORMAT_VERSIONS = [1, 2]
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const BAD_FORMAT_MESSAGE = 'Il file non è un backup di Bacco. Scegli un file .json esportato da Bacco.'

function isIsoDate(value) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
}

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

/**
 * @param {string} data base64
 * @param {string} mime
 */
function base64ToBlob(data, mime) {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * Decodifica le foto e genera le miniature FUORI dalla transazione Dexie:
 * `makeThumbnail` usa `createImageBitmap`/`canvas.toBlob`, non tracciati da Dexie,
 * e farlo dentro una transazione la farebbe chiudere in anticipo nel browser
 * reale (PrematureCommitError), perdendo le scritture successive.
 */
async function preparePhotoRows(bottleId, photos, makeThumbnail) {
  const rows = []
  for (const photo of photos) {
    const blob = base64ToBlob(photo.data, photo.mime)
    const thumb = await makeThumbnail(blob)
    rows.push({ id: photo.id, bottleId, order: photo.order, blob, thumb, createdAt: photo.createdAt })
  }
  return rows
}

/**
 * Importa un backup JSON unendo i dati (contracts/backup-format.md): valida tutto
 * prima di scrivere, poi scrive bottiglie e foto in un'unica transazione Dexie pura
 * (nessun await non tracciato da Dexie al suo interno).
 * @param {File} file
 * @param {{makeThumbnail: (blob: Blob) => Promise<Blob>}} opts
 * @returns {Promise<{added:number, updated:number, unchanged:number}>}
 */
export async function importBackup(file, { makeThumbnail } = {}) {
  if (file.size > MAX_SIZE) {
    throw new Error('Backup troppo grande per questo dispositivo')
  }

  let data
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error(BAD_FORMAT_MESSAGE)
  }

  if (!data || data.app !== 'bacco' || !Array.isArray(data.bottles)) {
    throw new Error(BAD_FORMAT_MESSAGE)
  }
  if (!SUPPORTED_FORMAT_VERSIONS.includes(data.formatVersion)) {
    throw new Error("Backup creato da una versione più recente di Bacco. Aggiorna l'app e riprova.")
  }

  // Validazione completa di ogni bottiglia e foto PRIMA di scrivere (tutto o niente).
  const validated = data.bottles.map((entry, index) => {
    if (!isUuid(entry?.id)) throw new Error(`Bottiglia ${index + 1}: identificativo non valido.`)
    if (!isIsoDate(entry.createdAt) || !isIsoDate(entry.updatedAt)) {
      throw new Error(`Bottiglia ${index + 1}: date non valide.`)
    }
    const result = validateBottle(entry)
    if (!result.ok) {
      const [field, message] = Object.entries(result.errors)[0]
      throw new Error(`Bottiglia ${index + 1}, campo "${field}": ${message}`)
    }
    const photos = Array.isArray(entry.photos) ? entry.photos : []
    for (const [photoIndex, photo] of photos.entries()) {
      if (photo?.mime !== 'image/jpeg') {
        throw new Error(`Bottiglia ${index + 1}, foto ${photoIndex + 1}: formato non valido.`)
      }
      try {
        atob(photo.data)
      } catch {
        throw new Error(`Bottiglia ${index + 1}, foto ${photoIndex + 1}: dati non decodificabili.`)
      }
    }
    return {
      bottle: { ...result.value, id: entry.id, createdAt: entry.createdAt, updatedAt: entry.updatedAt },
      photos,
    }
  })

  // Movimenti di cantina, validati come le bottiglie. Un backup v1 non li ha: ogni
  // bottiglia riceve la sola "prima registrazione", come nella migrazione del DB v3.
  const bottleIds = new Set(validated.map((v) => v.bottle.id))
  const movesByBottle = new Map(validated.map((v) => [v.bottle.id, []]))
  if (data.formatVersion === 1) {
    for (const { bottle } of validated) movesByBottle.get(bottle.id).push(move(bottle.id, 'first', { at: bottle.consumedAt }))
  } else {
    const moves = Array.isArray(data.cellarMoves) ? data.cellarMoves : []
    moves.forEach((entry, index) => {
      const result = validateMove(entry)
      if (!result.ok) {
        const [field, message] = Object.entries(result.errors)[0]
        throw new Error(`Movimento ${index + 1}, campo "${field}": ${message}`)
      }
      if (!bottleIds.has(result.value.bottleId)) {
        throw new Error(`Movimento ${index + 1}: si riferisce a una bottiglia che non è nel backup.`)
      }
      movesByBottle.get(result.value.bottleId).push(result.value)
    })
  }

  // Fase 1 (fuori dalla transazione): decide cosa aggiungere/aggiornare/lasciare
  // invariato, e prepara in anticipo solo le foto che verranno davvero scritte.
  const ids = validated.map((v) => v.bottle.id)
  const existingRows = ids.length > 0 ? await db.bottles.bulkGet(ids) : []
  const existingById = new Map(ids.map((id, i) => [id, existingRows[i]]))

  const summary = { added: 0, updated: 0, unchanged: 0 }
  const toWrite = []

  for (const { bottle, photos } of validated) {
    const existing = existingById.get(bottle.id)
    if (!existing) {
      summary.added++
      toWrite.push({ action: 'add', bottle, photoRows: await preparePhotoRows(bottle.id, photos, makeThumbnail) })
    } else if (bottle.updatedAt > existing.updatedAt) {
      summary.updated++
      toWrite.push({ action: 'update', bottle, photoRows: await preparePhotoRows(bottle.id, photos, makeThumbnail) })
    } else {
      summary.unchanged++
    }
  }

  // Fase 2: transazione Dexie pura (solo put/delete), senza altri await in mezzo.
  // I movimenti seguono il record che vince l'unione: così la quantità resta coerente con
  // il registro (contracts/backup-format.md di specs/002-cellar-inventory).
  await db.transaction('rw', db.bottles, db.photos, db.cellarMoves, async () => {
    for (const { action, bottle, photoRows } of toWrite) {
      if (action === 'update') {
        await db.photos.where('bottleId').equals(bottle.id).delete()
        await db.cellarMoves.where('bottleId').equals(bottle.id).delete()
      }
      await db.bottles.put(bottle)
      if (photoRows.length > 0) await db.photos.bulkPut(photoRows)
      const moves = movesByBottle.get(bottle.id)
      if (moves.length > 0) await db.cellarMoves.bulkPut(moves)
    }
  })

  return summary
}
