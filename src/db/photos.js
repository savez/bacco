import { db } from './db.js'

/** @param {string} bottleId */
export async function listPhotos(bottleId) {
  return db.photos.where('bottleId').equals(bottleId).sortBy('order')
}

/** @param {Blob} blob */
export function photoUrl(blob) {
  return URL.createObjectURL(blob)
}

/** @param {string} url */
export function revokePhotoUrl(url) {
  URL.revokeObjectURL(url)
}
