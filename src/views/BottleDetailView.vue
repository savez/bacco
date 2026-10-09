<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BottleRatingMark from '../components/BottleRatingMark.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import NotesView from '../components/NotesView.vue'
import ShareCardDialog from '../components/ShareCardDialog.vue'
import { getBottle, deleteBottle, liveBottle } from '../db/bottles.js'
import CellarPanel from '../components/CellarPanel.vue'
import FirstTastingDialog from '../components/FirstTastingDialog.vue'
import { useUncork } from '../composables/useUncork.js'
import { listPhotos, photoUrl, revokePhotoUrl } from '../db/photos.js'
import { getRatingLevel } from '../lib/rating.js'
import { formatDateTime, formatAbv, kindLabel } from '../lib/format.js'
import { showBanner } from '../composables/useBanner.js'
import { closeSheet } from '../composables/useSheet.js'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()

const bottle = ref(null)
const photos = ref([])
const notFound = ref(false)
const confirmOpen = ref(false)
const shareOpen = ref(false)
// Barra d'azione fissa (specs/003-cantina-viva-ui): Stappa usa lo stesso flusso della riga
// della cantina, con Annulla e "Com'è?" al primo stappo.
const { tastingFor, uncorkBottle, saveTasting, later } = useUncork()
const cellarPanel = ref(null)

function revokeAll() {
  for (const photo of photos.value) revokePhotoUrl(photo.url)
}

// `watch` sull'id (non `watchEffect`, che tratterebbe anche `photos.value` come
// dipendenza, perché `revokeAll` la legge: l'effetto si assegnerebbe da solo in
// coda infinita). `requestId` scarta un risultato arrivato in ritardo se l'utente
// è già passato a un'altra bottiglia prima che la richiesta precedente finisse.
let requestId = 0
let subscription = null

watch(
  () => props.id,
  async (id) => {
    const thisRequest = ++requestId
    subscription?.unsubscribe()
    subscription = null
    revokeAll()
    notFound.value = false
    bottle.value = null
    photos.value = []

    const found = await getBottle(id)
    if (thisRequest !== requestId) return
    if (!found) {
      notFound.value = true
      return
    }
    bottle.value = found
    // Da qui la scheda segue l'etichetta nel DB (cantina, primo assaggio, annullamenti).
    subscription = liveBottle(id).subscribe((current) => {
      if (thisRequest === requestId && current) bottle.value = current
    })

    const stored = await listPhotos(id)
    if (thisRequest !== requestId) return
    photos.value = stored.map((p) => ({ id: p.id, url: photoUrl(p.blob) }))
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  subscription?.unsubscribe()
  revokeAll()
})

// Etichetta in cantina mai stappata: niente punteggio, niente card da condividere.
const untasted = computed(() => bottle.value?.tastedAt === null)
const aromaTags = computed(() => bottle.value?.aromaTags ?? [])
const pairingTags = computed(() => bottle.value?.pairingTags ?? [])
const tagClass = 'rounded-full border border-rame/40 px-3 py-1 text-sm font-bold'
// Pulsanti della barra: solo testo, su una riga anche a 320 px.
// Barra della scheda: l'azione principale a parole, le altre come icone (con nome per i lettori di schermo).
// Sagoma del vino come in BottleRow.vue (viewBox 24×48), per il riquadro della scheda senza foto.
const WINE_BOTTLE = 'M10.5 5H13.5V14C13.5 16 19 16.5 19 21V44A2 2 0 0 1 17 46H7A2 2 0 0 1 5 44V21C5 16.5 10.5 16 10.5 14Z'
const iconButton = 'flex h-12 w-11 shrink-0 items-center justify-center rounded-xl border'
const registeredOnly = computed(() => untasted.value || (bottle.value?.tastedAt && bottle.value.tastedAt !== bottle.value.consumedAt))
const firstTastedLater = computed(() => !untasted.value && registeredOnly.value)
const deleteMessage = computed(() =>
  bottle.value?.cellarCount > 0
    ? `Eliminare questa etichetta? Hai ancora ${bottle.value.cellarCount} ${bottle.value.cellarCount === 1 ? 'bottiglia' : 'bottiglie'} in cantina: si perdono anche le foto e il registro movimenti.`
    : 'Eliminare questa bottiglia? Anche le foto e il registro movimenti verranno eliminati.',
)

function onDeleteConfirmed() {
  confirmOpen.value = false
  deleteBottle(props.id).then(() => {
    showBanner({ id: 'bottle-deleted', message: 'Bottiglia eliminata', priority: 30 })
    closeSheet(router)
  })
}
</script>

<template>
  <div v-if="notFound" class="p-4 text-center">
    <p>Bottiglia non trovata.</p>
    <RouterLink to="/" class="mt-2 inline-block min-h-11 font-bold text-rame">Torna al registro</RouterLink>
  </div>

  <div v-else-if="bottle">
    <div v-if="photos.length > 0" class="flex snap-x snap-mandatory gap-2 overflow-x-auto">
      <img
        v-for="(photo, i) in photos"
        :key="photo.id"
        :src="photo.url"
        :alt="`Foto ${i + 1} di ${photos.length} di ${bottle.name}`"
        class="h-64 w-full shrink-0 snap-center object-cover"
      />
    </div>
    <!-- Senza foto: un riquadro della stessa altezza con la sagoma della bottiglia, nel colore del
         vino o della birra, così tutte le schede hanno la stessa struttura. -->
    <div
      v-else
      class="flex h-64 items-center justify-center"
      :class="bottle.type === 'wine' ? 'bg-feccia/15 text-feccia' : 'bg-luppolo/15 text-luppolo'"
    >
      <svg v-if="bottle.type === 'wine'" viewBox="0 0 24 48" class="h-40 w-20" aria-hidden="true">
        <path :d="WINE_BOTTLE" fill="currentColor" />
      </svg>
      <!-- Birra: boccale con la schiuma, come nell'icona dell'app (una bottiglia così grande
           sembrerebbe di vino). -->
      <svg v-else viewBox="0 0 48 48" class="h-40 w-40" aria-hidden="true">
        <g fill="currentColor">
          <g opacity="0.5">
            <circle cx="15" cy="14" r="5" />
            <circle cx="22" cy="11" r="6" />
            <circle cx="29" cy="14" r="5" />
            <rect x="10" y="14" width="24" height="5" />
          </g>
          <path d="M10 19h24v20a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5Z" />
        </g>
        <path d="M34 24h4a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-4" fill="none" stroke="currentColor" stroke-width="3.5" />
      </svg>
    </div>

    <div class="p-4">
      <div>
        <p class="text-sm font-bold uppercase text-cenere">
          {{ kindLabel(bottle) }}
        </p>
        <h1 class="font-display text-3xl">{{ bottle.name }}</h1>
      </div>
      <p v-if="bottle.producer || bottle.vintage" class="font-display text-xl text-cenere">
        {{ [bottle.producer, bottle.vintage].filter(Boolean).join(' · ') }}
      </p>
      <p v-if="bottle.abv != null" class="mt-1 text-sm font-bold text-cenere">{{ formatAbv(bottle.abv) }}</p>

      <p v-if="untasted" class="mt-4 inline-flex rounded-full border border-luppolo px-3 py-1 text-sm font-bold text-luppolo">
        Da assaggiare
      </p>
      <div v-else class="mt-4 flex items-center gap-3">
        <BottleRatingMark :value="bottle.rating" :type="bottle.type" size="md" />
        <div>
          <p class="font-bold">{{ getRatingLevel(bottle.rating)?.label }}</p>
          <p class="text-sm text-cenere">{{ getRatingLevel(bottle.rating)?.description }}</p>
        </div>
      </div>

      <p class="mt-4 text-sm text-cenere">
        <!-- "Quando" è la registrazione se l'etichetta è entrata in cantina senza berla. -->
        <template v-if="registeredOnly">Registrata il </template>{{ formatDateTime(bottle.consumedAt) }}
      </p>
      <p v-if="firstTastedLater" class="text-sm text-cenere">Primo assaggio: {{ formatDateTime(bottle.tastedAt) }}</p>

      <CellarPanel ref="cellarPanel" :key="bottle.id" :bottle="bottle" />

      <dl v-if="bottle.tasting || bottle.pairing || aromaTags.length || pairingTags.length" class="mt-6 space-y-4">
        <div v-if="bottle.tasting || aromaTags.length">
          <dt class="font-display text-sm uppercase tracking-wide text-cenere">Analisi organolettica personale</dt>
          <dd>
            <ul v-if="aromaTags.length" class="mt-1 flex flex-wrap gap-1.5" aria-label="Aromi">
              <li v-for="tag in aromaTags" :key="tag" :class="tagClass">{{ tag }}</li>
            </ul>
            <p v-if="bottle.tasting" class="mt-2 whitespace-pre-line">{{ bottle.tasting }}</p>
          </dd>
        </div>
        <div v-if="bottle.pairing || pairingTags.length">
          <dt class="font-display text-sm uppercase tracking-wide text-cenere">Con cosa l'ho mangiato</dt>
          <dd>
            <ul v-if="pairingTags.length" class="mt-1 flex flex-wrap gap-1.5" aria-label="Abbinamenti">
              <li v-for="tag in pairingTags" :key="tag" :class="tagClass">{{ tag }}</li>
            </ul>
            <p v-if="bottle.pairing" class="mt-2">{{ bottle.pairing }}</p>
          </dd>
        </div>
      </dl>

      <div v-if="bottle.notes" class="mt-4">
        <p class="font-display text-sm uppercase tracking-wide text-cenere">Note</p>
        <NotesView :notes="bottle.notes" />
      </div>

      <p v-if="bottle.stateSeal" class="mt-2 text-sm text-cenere">
        Contrassegno di Stato: <span class="font-bold text-gesso">{{ bottle.stateSeal }}</span>
        <span class="block text-xs">Verificalo con l'app Trust your wine del Poligrafico dello Stato.</span>
      </p>

      <p v-if="bottle.location && !untasted" class="mt-2 text-sm text-cenere">
        Luogo:
        <RouterLink :to="`/mappa?bottiglia=${bottle.id}`" class="font-bold text-rame">
          Vedi sulla mappa
        </RouterLink>
      </p>

      <p v-if="bottle.externalUrl" class="mt-2 text-sm">
        <a :href="bottle.externalUrl" target="_blank" rel="noopener noreferrer" class="font-bold text-rame">
          Scheda tecnica
        </a>
      </p>
    </div>

    <!-- Barra d'azione fissa in fondo al pannello, tutte le azioni sulla stessa riga: Stappa (o
         "Metti in cantina", che porta al selettore della sezione Cantina) a parole, poi Modifica,
         Elimina e Condividi come icone, così ci stanno anche a 320 px. -->
    <div class="sticky bottom-0 z-10 mt-2 flex gap-1.5 border-t border-rame/20 bg-doga px-4 pb-4 pt-3">
      <button
        v-if="bottle.cellarCount > 0"
        type="button"
        class="flex min-h-12 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-xl bg-feccia px-2 text-sm font-bold text-botte"
        @click="uncorkBottle(bottle)"
      >
        Stappa
      </button>
      <button v-else type="button" class="flex min-h-12 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-xl bg-feccia px-2 text-sm font-bold text-botte" @click="cellarPanel?.focusStepper()">
        Metti in cantina
      </button>
      <RouterLink :to="`/bottiglia/${bottle.id}/modifica`" :aria-label="`Modifica ${bottle.name}`" :class="[iconButton, 'border-rame/40']">
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </RouterLink>
      <button type="button" :aria-label="`Elimina ${bottle.name}`" :class="[iconButton, 'border-feccia text-feccia']" @click="confirmOpen = true">
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
        </svg>
      </button>
      <button
        v-if="!untasted"
        type="button"
        :aria-label="`Condividi ${bottle.name}`"
        :class="[iconButton, 'border-rame/40']"
        @click="shareOpen = true"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
        </svg>
      </button>
    </div>

    <FirstTastingDialog
      :open="!!tastingFor"
      :name="tastingFor?.name ?? ''"
      :type="tastingFor?.type ?? null"
      @save="saveTasting"
      @later="later"
    />
    <ShareCardDialog v-if="shareOpen" :bottle="bottle" @close="shareOpen = false" />

    <ConfirmDialog
      :open="confirmOpen"
      title="Elimina bottiglia"
      :message="deleteMessage"
      confirm-label="Elimina"
      danger
      @confirm="onDeleteConfirmed"
      @cancel="confirmOpen = false"
    />
  </div>
</template>
