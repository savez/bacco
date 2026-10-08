<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db/db.js'
import { getSetting } from '../db/settings.js'
import { exportJson } from '../backup/exportJson.js'
import { exportCsv } from '../backup/exportCsv.js'
import { importBackup } from '../backup/importJson.js'
import { makeThumbnail } from '../lib/image.js'
import { formatDateTime } from '../lib/format.js'
import { showBanner } from '../composables/useBanner.js'
import { getThemePreference, setThemePreference } from '../lib/theme.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PermissionHelp from '../components/PermissionHelp.vue'
import SupportCard from '../components/SupportCard.vue'
import { useUpdateCheck } from '../composables/usePwaUpdate.js'
import { withTimeout } from '../lib/timeout.js'
import { queryPermission, explainCameraError, explainLocationError } from '../lib/permissions.js'
import { getCurrentLocation } from '../lib/geo.js'
import { closeSheet } from '../composables/useSheet.js'

const router = useRouter()

// Versione da package.json (aggiornata da release-please), utile nelle segnalazioni di bug.
const APP_VERSION = __APP_VERSION__
const REPO_URL = 'https://github.com/savez/bacco'
const SITE_URL = 'https://bacco.smzstudio.it/'
const { updateCheckStatus, checkForUpdate } = useUpdateCheck()
const UPDATE_MESSAGES = {
  checking: 'Controllo in corso…',
  updating: 'Nuova versione trovata: aggiornamento in corso, l’app si riavvia tra poco.',
  'up-to-date': 'Hai già l’ultima versione.',
  unavailable: 'Controllo non disponibile: apri Bacco dall’indirizzo pubblicato o dall’app installata.',
  error: 'Impossibile verificare gli aggiornamenti. Controlla la connessione e riprova.',
}

const theme = ref(getThemePreference())
const lastExportAt = ref(null)
const importing = ref(false)
const deleteConfirmOpen = ref(false)
const deleteSecondConfirmOpen = ref(false)
const fileInput = ref(null)

// --- Stato dei dati (diagnostica) ---------------------------------------------------------
// Mostra se il database del dispositivo è aperto e aggiornato: se un aggiornamento è rimasto
// bloccato (es. due finestre di Bacco aperte) qui si vede subito.
const dbStatus = ref({ state: 'checking' })

async function checkDatabase() {
  dbStatus.value = { state: 'checking' }
  try {
    const counts = await withTimeout(
      Promise.all([db.bottles.count(), db.photos.count(), db.cellarMoves.count()]),
      5000,
    )
    dbStatus.value = { state: 'ok', version: db.verno, bottles: counts[0], photos: counts[1], moves: counts[2] }
  } catch (err) {
    dbStatus.value = { state: 'error', name: err?.name ?? 'errore' }
  }
}

onMounted(async () => {
  checkDatabase()
  lastExportAt.value = await getSetting('lastExportAt', null)
  refreshPermissions()
})

// --- Permessi (FR-030) ---------------------------------------------------------------
const STATE_LABEL = {
  granted: 'Consentita',
  denied: 'Bloccata',
  prompt: 'Da chiedere',
  unknown: 'Stato non disponibile in questo browser',
}
const permissions = ref({ camera: 'unknown', geolocation: 'unknown' })
const permissionHelp = ref({ camera: null, geolocation: null })
const requesting = ref(null)

async function refreshPermissions() {
  const [camera, geolocation] = await Promise.all([queryPermission('camera'), queryPermission('geolocation')])
  permissions.value = { camera, geolocation }
}

async function requestCamera() {
  requesting.value = 'camera'
  permissionHelp.value.camera = null
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error('insecure'), { name: 'InsecureContextError' })
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    for (const track of stream.getTracks()) track.stop()
  } catch (err) {
    permissionHelp.value.camera = explainCameraError(err)
  } finally {
    requesting.value = null
    refreshPermissions()
  }
}

async function requestLocation() {
  requesting.value = 'geolocation'
  permissionHelp.value.geolocation = null
  try {
    await getCurrentLocation()
  } catch (err) {
    permissionHelp.value.geolocation = explainLocationError(err?.code)
  } finally {
    requesting.value = null
    refreshPermissions()
  }
}

function onThemeChange(value) {
  theme.value = value
  setThemePreference(value)
}

async function onExportJson() {
  await exportJson()
  lastExportAt.value = await getSetting('lastExportAt', null)
  showBanner({ id: 'backup-done', message: 'Backup esportato', priority: 30 })
}

async function onExportCsv() {
  await exportCsv()
  showBanner({ id: 'csv-done', message: 'Registro esportato', priority: 30 })
}

function onPickFile() {
  fileInput.value?.click()
}

async function onFileChosen(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  importing.value = true
  try {
    const { added, updated, unchanged, wishes } = await importBackup(file, { makeThumbnail })
    // Wishlist (specs/005-wishlist): citata solo se il backup ha portato desideri nuovi o aggiornati.
    const wishCount = wishes.added + wishes.updated
    const wishPart = wishCount > 0 ? ` · ${wishCount} ${wishCount === 1 ? 'desiderio' : 'desideri'}` : ''
    showBanner({
      id: 'import-done',
      message: `Importate: ${added} nuove, ${updated} aggiornate, ${unchanged} invariate${wishPart}.`,
      priority: 30,
    })
  } catch (err) {
    showBanner({ id: 'import-error', message: err.message, tone: 'error', priority: 100 })
  } finally {
    importing.value = false
  }
}

function onDeleteAllRequested() {
  deleteConfirmOpen.value = true
}

function onFirstConfirm() {
  deleteConfirmOpen.value = false
  deleteSecondConfirmOpen.value = true
}

async function onSecondConfirm() {
  deleteSecondConfirmOpen.value = false
  await db.bottles.clear()
  await db.photos.clear()
  await db.cellarMoves.clear()
  await db.wishes.clear()
  await db.settings.clear()
  try {
    localStorage.clear()
  } catch {
    // non bloccante
  }
  window.location.reload()
}
</script>

<template>
  <div class="p-4 pb-24">
    <div class="flex items-center justify-between gap-2">
      <h1 class="font-display text-2xl uppercase tracking-wide">Impostazioni</h1>
      <!-- Torna alla pagina da cui sei arrivato (o al registro, con un link diretto). -->
      <button
        type="button"
        aria-label="Chiudi le impostazioni"
        class="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-gesso"
        @click="closeSheet(router)"
      >
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>

    <section class="mt-6">
      <h2 class="font-display text-lg uppercase tracking-wide">Tema</h2>
      <div role="radiogroup" aria-label="Tema" class="mt-2 flex gap-2">
        <label
          v-for="option in [
            { value: 'system', label: 'Sistema' },
            { value: 'light', label: 'Chiaro' },
            { value: 'dark', label: 'Scuro' },
          ]"
          :key="option.value"
          class="min-h-11 cursor-pointer rounded-md border border-rame/30 px-3 py-2 text-sm font-bold"
          :class="theme === option.value ? 'bg-rame text-doga' : 'text-cenere'"
        >
          <input
            type="radio"
            name="theme"
            class="sr-only"
            :checked="theme === option.value"
            @change="onThemeChange(option.value)"
          />
          {{ option.label }}
        </label>
      </div>
    </section>

    <section class="mt-8">
      <h2 class="font-display text-lg uppercase tracking-wide">Permessi</h2>
      <p class="mt-1 text-sm text-cenere">
        Servono solo quando li usi: la fotocamera per le foto, la posizione per la mappa.
      </p>
      <div
        v-for="item in [
          { key: 'camera', label: 'Fotocamera', action: requestCamera },
          { key: 'geolocation', label: 'Posizione', action: requestLocation },
        ]"
        :key="item.key"
        class="mt-3"
      >
        <div class="flex items-center justify-between gap-3">
          <p>
            <span class="font-bold">{{ item.label }}</span>
            <span class="block text-sm text-cenere">{{ STATE_LABEL[permissions[item.key]] }}</span>
          </p>
          <button
            v-if="permissions[item.key] !== 'granted'"
            type="button"
            :disabled="requesting === item.key"
            class="min-h-11 shrink-0 rounded-md border border-rame/30 px-3 text-sm font-bold disabled:opacity-60"
            @click="item.action"
          >
            {{ requesting === item.key ? 'Richiesta…' : 'Consenti' }}
          </button>
        </div>
        <PermissionHelp
          v-if="permissionHelp[item.key]"
          :help="permissionHelp[item.key]"
          class="mt-2"
          @retry="item.action"
        />
      </div>
    </section>

    <section class="mt-8">
      <h2 class="font-display text-lg uppercase tracking-wide">Backup</h2>
      <p class="mt-1 text-sm text-cenere">
        Ultimo backup: {{ lastExportAt ? formatDateTime(lastExportAt) : 'Mai' }}
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" class="min-h-11 rounded-md border border-rame/30 px-3 font-bold" @click="onExportJson">
          Esporta JSON
        </button>
        <button type="button" class="min-h-11 rounded-md border border-rame/30 px-3 font-bold" @click="onExportCsv">
          Esporta CSV
        </button>
        <button
          type="button"
          :disabled="importing"
          class="min-h-11 rounded-md border border-rame/30 px-3 font-bold disabled:opacity-60"
          @click="onPickFile"
        >
          {{ importing ? 'Importazione…' : 'Importa backup' }}
        </button>
        <input ref="fileInput" type="file" accept="application/json,.json" class="sr-only" @change="onFileChosen" />
      </div>
    </section>

    <section class="mt-8 rounded-md border border-feccia/40 p-3">
      <h2 class="font-display text-lg uppercase tracking-wide text-feccia">Elimina tutti i dati</h2>
      <p class="mt-1 text-sm text-cenere">
        Cancella definitivamente tutte le bottiglie, le foto, la wishlist e le impostazioni da questo dispositivo.
      </p>
      <button
        type="button"
        class="mt-3 min-h-11 rounded-md border border-feccia px-3 font-bold text-feccia"
        @click="onDeleteAllRequested"
      >
        Elimina tutti i dati
      </button>
    </section>

    <section class="mt-8">
      <h2 class="font-display text-lg uppercase tracking-wide">Stato dei dati</h2>
      <p class="mt-2 text-sm" role="status">
        <template v-if="dbStatus.state === 'checking'">Controllo in corso…</template>
        <template v-else-if="dbStatus.state === 'ok'">
          <span class="font-bold text-gesso">✓ Database v{{ dbStatus.version }}</span>
          <span class="text-cenere">
            · {{ dbStatus.bottles }} bottiglie · {{ dbStatus.photos }} foto · {{ dbStatus.moves }} movimenti di cantina
          </span>
        </template>
        <span v-else class="text-feccia">
          I dati non rispondono ({{ dbStatus.name }}). Chiudi le altre finestre o schede di Bacco e riaprila.
        </span>
      </p>
      <button
        v-if="dbStatus.state === 'error'"
        type="button"
        class="mt-2 min-h-11 rounded-md border border-rame/30 px-3 font-bold"
        @click="checkDatabase"
      >
        Ricontrolla
      </button>
    </section>

    <section class="mt-8">
      <h2 class="font-display text-lg uppercase tracking-wide">Versione</h2>
      <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p class="font-bold">Bacco {{ APP_VERSION }}</p>
        <button
          type="button"
          class="min-h-11 rounded-md border border-rame/30 px-3 font-bold disabled:opacity-60"
          :disabled="updateCheckStatus === 'checking' || updateCheckStatus === 'updating'"
          @click="checkForUpdate"
        >
          Cerca aggiornamenti
        </button>
      </div>
      <p
        class="mt-2 min-h-5 text-sm"
        :class="updateCheckStatus === 'error' || updateCheckStatus === 'unavailable' ? 'text-feccia' : 'text-cenere'"
        role="status"
      >
        {{ UPDATE_MESSAGES[updateCheckStatus] ?? '' }}
      </p>
      <p class="flex flex-wrap gap-x-5 text-sm">
        <a :href="`${REPO_URL}/releases`" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center font-bold text-rame">
          Novità delle versioni
        </a>
        <a :href="REPO_URL" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center font-bold text-rame">
          Codice sorgente
        </a>
        <a :href="SITE_URL" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center font-bold text-rame">
          Sito del progetto
        </a>
      </p>
    </section>

    <section class="mt-8" aria-label="Sostieni Bacco">
      <SupportCard />
    </section>

    <ConfirmDialog
      :open="deleteConfirmOpen"
      title="Elimina tutti i dati"
      message="Verranno eliminate tutte le bottiglie, le foto, la wishlist e le impostazioni. Continuare?"
      confirm-label="Continua"
      danger
      @confirm="onFirstConfirm"
      @cancel="deleteConfirmOpen = false"
    />
    <ConfirmDialog
      :open="deleteSecondConfirmOpen"
      title="Sei sicuro?"
      message="Questa azione non si può annullare. Elimina tutto?"
      confirm-label="Elimina tutto"
      danger
      @confirm="onSecondConfirm"
      @cancel="deleteSecondConfirmOpen = false"
    />
  </div>
</template>
