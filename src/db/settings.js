import { db } from './db.js'

/**
 * @param {string} key
 * @param {*} [fallback]
 */
export async function getSetting(key, fallback = undefined) {
  const row = await db.settings.get(key)
  return row ? row.value : fallback
}

/**
 * @param {string} key
 * @param {*} value
 */
export async function setSetting(key, value) {
  await db.settings.put({ key, value })
}
