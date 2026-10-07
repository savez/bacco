import { getSetting, setSetting } from '../db/settings.js'
import { showBanner, dismissBanner } from './useBanner.js'
import { shouldShowInstallInvite, canPromptInstall, promptInstall, isIOS } from '../lib/install.js'

const IOS_MESSAGE =
  'Per installare Bacco tocca Condividi, poi «Aggiungi alla schermata Home». Installata, Bacco ' +
  'protegge meglio i tuoi dati: Safari può cancellare i dati dei siti non usati da 7 giorni.'

/** Mostra l'invito all'installazione (FR-020), priorità 10 (la più bassa). */
export function useInstallInvite() {
  async function check() {
    const dismissedAt = await getSetting('installPromptDismissedAt', null)
    if (!shouldShowInstallInvite({ dismissedAt })) return

    async function dismiss() {
      await setSetting('installPromptDismissedAt', new Date().toISOString())
      dismissBanner('install-invite')
    }

    if (isIOS()) {
      showBanner({
        id: 'install-invite',
        message: IOS_MESSAGE,
        priority: 10,
        actions: [{ label: 'Ho capito', onClick: dismiss }],
      })
    } else if (canPromptInstall()) {
      showBanner({
        id: 'install-invite',
        message: 'Aggiungi Bacco alla schermata Home per aprirlo con un tocco.',
        priority: 10,
        actions: [
          { label: 'Installa', onClick: () => promptInstall().then(dismiss) },
          { label: 'Non ora', onClick: dismiss },
        ],
      })
    }
  }

  // Un breve ritardo lascia il tempo al browser di emettere beforeinstallprompt.
  setTimeout(check, 1500)
}
