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

    <div class="p-4">
      <!-- Margine a destra solo sull'intestazione: lascia spazio al pulsante di chiusura. -->
      <div :class="{ 'pr-12': photos.length === 0 }">
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

      <div class="mt-6 flex gap-3">
        <RouterLink
          :to="`/bottiglia/${bottle.id}/modifica`"
          class="min-h-11 rounded-md border border-rame/30 px-4 py-2 font-bold"
        >
          Modifica
        </RouterLink>
        <button
          type="button"
          class="min-h-11 rounded-md border border-feccia px-4 py-2 font-bold text-feccia"
          @click="confirmOpen = true"
        >
          Elimina
        </button>
      </div>
    </div>

    <!-- Barra d'azione fissa in fondo al pannello: le azioni principali senza scorrere. -->
    <div class="sticky bottom-0 z-10 mt-2 flex gap-2 border-t border-rame/20 bg-doga px-4 pb-4 pt-3">
      <button
        v-if="bottle.cellarCount > 0"
        type="button"
        class="min-h-12 flex-1 rounded-xl bg-feccia px-3 font-bold text-botte"
        @click="uncorkBottle(bottle)"
      >
        Stappa
      </button>
      <button
        type="button"
        class="min-h-12 flex-1 rounded-xl border border-rame/40 px-3 font-bold"
        @click="cellarPanel?.openAdd()"
      >
        Aggiungi
      </button>
      <button
        v-if="!untasted"
        type="button"
        class="min-h-12 flex-1 rounded-xl border border-rame/40 px-3 font-bold"
        @click="shareOpen = true"
      >
        Condividi
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
