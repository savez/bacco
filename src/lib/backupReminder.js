const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Funzione pura (data-model.md): il promemoria compare se il registro non è vuoto
 * e sono passati più di 30 giorni dall'ultimo backup (o dal primo uso, se mai fatto)
 * e dall'eventuale ultimo rinvio.
 * @param {{bottleCount:number, lastExportAt:string|null, firstUseAt:string|null,
 *   snoozedAt:string|null, now?: Date}} params
 */
export function shouldShowBackupReminder({ bottleCount, lastExportAt, firstUseAt, snoozedAt, now = new Date() }) {
  if (bottleCount <= 0) return false
  const baseline = lastExportAt ?? firstUseAt
  if (!baseline) return false
  const reference = snoozedAt && snoozedAt > baseline ? snoozedAt : baseline
  return now.getTime() - new Date(reference).getTime() > THIRTY_DAYS_MS
}
