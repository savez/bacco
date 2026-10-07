import { db } from '../db/db.js'
import { setSetting } from '../db/settings.js'
import { downloadBlob, todayStamp } from '../lib/download.js'

const CHUNK_SIZE = 32 * 1024

/** @param {Blob} blob */
async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE))
  }
  return btoa(binary)
}

/**
 * Costruisce il file di backup (contracts/backup-format.md) senza creare un'unica
 * stringa gigante in memoria: una parte di Blob per bottiglia (research.md R15c).
 * Le miniature non sono incluse: vengono rigenerate all'importazione.
 */
export async function buildBackupBlob() {
  const parts = [
    `{"app":"bacco","formatVersion":1,"exportedAt":${JSON.stringify(new Date().toISOString())},"bottles":[`,
  ]
  const bottles = await db.bottles.toArray()
  let first = true
  for (const bottle of bottles) {
    const photos = await db.photos.where('bottleId').equals(bottle.id).sortBy('order')
    const photoEntries = []
    for (const photo of photos) {
      photoEntries.push({
        id: photo.id,
        order: photo.order,
        createdAt: photo.createdAt,
        mime: 'image/jpeg',
        data: await blobToBase64(photo.blob),
      })
    }
    const entry = JSON.stringify({ ...bottle, photos: photoEntries })
    parts.push(first ? entry : `,${entry}`)
    first = false
  }
  parts.push(']}')
  return new Blob(parts, { type: 'application/json' })
}

/** Esporta il backup JSON e scarica il file (FR-014). */
export async function exportJson() {
  const blob = await buildBackupBlob()
  downloadBlob(blob, `bacco-backup-${todayStamp()}.json`)
  await setSetting('lastExportAt', new Date().toISOString())
}
