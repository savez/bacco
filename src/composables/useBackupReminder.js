import { db } from '../db/db.js'
import { getSetting, setSetting } from '../db/settings.js'
import { shouldShowBackupReminder } from '../lib/backupReminder.js'
import { exportJson } from '../backup/exportJson.js'
import { showBanner, dismissBanner } from './useBanner.js'

/** Valuta all'avvio se mostrare il promemoria di backup (FR-016), con priorità 50. */
export function useBackupReminder() {
  async function check() {
    const [bottleCount, lastExportAt, firstUseAt, snoozedAt] = await Promise.all([
      db.bottles.count(),
      getSetting('lastExportAt', null),
      getSetting('firstUseAt', null),
      getSetting('backupReminderSnoozedAt', null),
    ])

    if (!shouldShowBackupReminder({ bottleCount, lastExportAt, firstUseAt, snoozedAt })) return

    const message = lastExportAt
      ? `Ultimo backup ${Math.floor((Date.now() - new Date(lastExportAt).getTime()) / 86400000)} giorni fa.`
      : 'Non hai ancora fatto un backup.'

    showBanner({
      id: 'backup-reminder',
      message,
      tone: 'info',
      priority: 50,
      actions: [
        {
          label: 'Esporta ora',
          onClick: () => {
            exportJson()
            dismissBanner('backup-reminder')
          },
        },
        {
          label: 'Più tardi',
          onClick: () => {
            setSetting('backupReminderSnoozedAt', new Date().toISOString())
            dismissBanner('backup-reminder')
          },
        },
      ],
    })
  }

  check()
}
