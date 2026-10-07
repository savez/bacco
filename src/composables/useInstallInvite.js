import { reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getSetting, setSetting } from '../db/settings.js'
import { shouldShowInstallInvite, canPromptInstall, promptInstall, installPlan, isStandalone } from '../lib/install.js'
import { detectPlatform } from '../lib/permissions.js'

// Dopo quanto tempo dall'apertura proporre l'installazione (FR-020).
const INVITE_DELAY_MS = 10_000

// Stato del modale, condiviso con InstallInvite.vue.
const invite = reactive({ open: false, plan: null })

/**
 * Invito all'installazione: un modale dopo 10 secondi, solo se Bacco non è installata e mai
 * mentre si compila una bottiglia o è aperto un pannello (aspetta una pagina libera).
 */
export function useInstallInvite() {
  const route = useRoute()
  let pending = null

  const isBusy = () => route.name === 'bottle-new' || !!route.meta.modal

  function openIfFree() {
    if (!pending || isBusy() || isStandalone()) return
    invite.plan = pending
    invite.open = true
    pending = null
  }

  async function check() {
    const dismissedAt = await getSetting('installPromptDismissedAt', null)
    if (!shouldShowInstallInvite({ dismissedAt })) return
    pending = installPlan(detectPlatform(), canPromptInstall())
    openIfFree()
  }

  watch(() => route.fullPath, openIfFree)
  window.addEventListener('appinstalled', () => {
    invite.open = false
    pending = null
  })
  setTimeout(check, INVITE_DELAY_MS)
}

export function useInstallInviteState() {
  return invite
}

/** "Non ora": il modale torna fra 30 giorni. */
export async function dismissInstallInvite() {
  invite.open = false
  await setSetting('installPromptDismissedAt', new Date().toISOString())
}

/** "Installa": invito nativo del browser. Se l'utente rifiuta, si riprova fra 30 giorni. */
export async function acceptInstallInvite() {
  await promptInstall()
  await dismissInstallInvite()
}
