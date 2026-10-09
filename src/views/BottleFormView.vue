<script setup>
import { reactive, ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TypeToggle from '../components/TypeToggle.vue'
import TastingFields from '../components/TastingFields.vue'
import { keepValidAromas } from '../lib/tastingTags.js'
import PhotoPicker from '../components/PhotoPicker.vue'
import PermissionHelp from '../components/PermissionHelp.vue'
import { explainLocationError } from '../lib/permissions.js'
import { createBottle, updateBottle, getBottle, findSameLabel } from '../db/bottles.js'
import { addToCellar } from '../db/cellar.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { listPhotos, photoUrl } from '../db/photos.js'
import { getCurrentLocation } from '../lib/geo.js'
import { subtypesFor, APPELLATIONS } from '../lib/subtypes.js'
import { RED_GRAPES, WHITE_GRAPES, GRAPE_MAX, isListedGrape } from '../lib/grapes.js'
import { toDateAndTime, fromDateAndTime } from '../lib/format.js'
import { showBanner } from '../composables/useBanner.js'
import { withTimeout } from '../lib/timeout.js'
import { requestHomeTab } from '../lib/homeFilter.js'
import { closeSheet } from '../composables/useSheet.js'
import { getWish } from '../db/wishes.js'

const route = useRoute()
const router = useRouter()
const isEdit = !!route.params.id
// La modifica si apre nel pannello modale (che ha già il suo pulsante di chiusura).
const inSheet = !!route.meta.modal
const NOTES_MAX = 5000
// Oltre questo tempo il salvataggio si considera bloccato: il bottone torna attivo.
const SAVE_TIMEOUT_MS = 15000

const form = reactive({
  // Non più modificabile (la ricerca da codice a barre è stata tolta): resta solo per non
  // perdere quello delle bottiglie registrate prima.
  barcode: '',
  stateSeal: '',
  name: '',
  producer: '',
  vintage: '',
  abv: '',
  type: null,
  subtype: '',
  appellation: '',
  grape: '',
  rating: null,
  aromaTags: [],
  pairingTags: [],
  tasting: '',
  pairing: '',
  notes: '',
  consumedDate: toDateAndTime(new Date().toISOString()).date,
  consumedTime: toDateAndTime(new Date().toISOString()).time,
  externalUrl: '',
})

// Cantina (specs/002-cellar-inventory): in creazione le bottiglie in cantina decidono. Con 0
// la bevo subito (punteggio obbligatorio); con 1 o più vanno in cantina e punteggio e
// analisi arrivano al primo stappo.
// Dal + con la Cantina aperta (`/nuova?cantina=1`) si parte da 1 bottiglia: "Metti in cantina".
const bottleCount = ref(!isEdit && route.query.cantina ? 1 : 0)
const toCellar = computed(() => !isEdit && bottleCount.value >= 1)
function changeCount(delta) {
  bottleCount.value = Math.min(999, Math.max(0, bottleCount.value + delta))
}

// Nuova bottiglia in 2 passi (specs/003-cantina-viva-ui): 1 = Cos'è, 2 = Cantina o assaggio.
// La modifica mostra tutto su una pagina sola.
const step = ref(1)
const showStep1 = computed(() => isEdit || step.value === 1)
const showStep2 = computed(() => isEdit || step.value === 2)
const saveLabel = computed(() => {
  if (isEdit) return 'Salva modifiche'
  return toCellar.value ? `Metti in cantina (${bottleCount.value})` : 'Salva bevuta'
})

async function goNext() {
  errors.value = {}
  if (!form.type) errors.value.type = 'Scegli vino o birra.'
  if (!form.name.trim()) errors.value.name = 'Scrivi il nome.'
  if (Object.keys(errors.value).length > 0) {
    await focusFirstError()
    return
  }
  step.value = 2
  window.scrollTo({ top: 0 })
}

function goBack() {
  step.value = 1
  window.scrollTo({ top: 0 })
}
// In modifica, un'etichetta mai stappata può ricevere il punteggio ma non lo richiede.
const existingUntasted = ref(false)
// Spiegazione del contrassegno di Stato (pulsante ⓘ accanto al campo).
const sealInfoOpen = ref(false)

const errors = ref({})
const saving = ref(false)
// Etichetta già registrata (FR-110): proposta di aggiungere bottiglie invece del doppione.
const duplicate = ref(null)
const duplicateMessage = computed(() => {
  if (!duplicate.value) return ''
  const { match, count } = duplicate.value
  const label = [match.name, match.vintage].filter(Boolean).join(' ')
  return `Hai già «${label}». Aggiungo ${count} bottiglie a quella invece di crearne una nuova?`
})
const loading = ref(isEdit)
const notFound = ref(false)
const fieldRefs = ref({})
const photos = ref([])
let originalPhotoIds = []
// "L'ho provato" (specs/005-wishlist): desiderio da cui nasce la bottiglia, tolto al salvataggio.
let fromWishId = null

function setFieldRef(key) {
  return (el) => {
    if (el) fieldRefs.value[key] = el
  }
}

// --- Sottocategoria (FR-028) -------------------------------------------------------
const subtypeOptions = computed(() => subtypesFor(form.type))
const otherSubtype = ref(false)
// "Altro" è attivo se scelto, o se il valore attuale non è tra quelli predefiniti
// (es. "Saison" arrivato dal registro): così una sottocategoria libera è sempre visibile.
const showOther = computed(
  () => otherSubtype.value || (!!form.subtype && !subtypeOptions.value.includes(form.subtype)),
)

function pickSubtype(value) {
  otherSubtype.value = false
  form.subtype = form.subtype === value ? '' : value
}

function pickOther() {
  otherSubtype.value = true
  if (subtypeOptions.value.includes(form.subtype)) form.subtype = ''
}

// --- Vitigno (specs/004-vitigno) ---------------------------------------------------
// Il menu vale `''` (nessuno), una voce dell'elenco o OTHER_GRAPE: con "Altro…" il vitigno
// è il testo di `form.grape`.
const OTHER_GRAPE = '__other__'
const grapeChoice = ref('')
const grapeOtherRef = ref(null)

watch(grapeChoice, async (choice) => {
  if (choice !== OTHER_GRAPE) return
  await nextTick()
  grapeOtherRef.value?.focus()
})

watch(
  () => form.type,
  (type, previous) => {
    // Cambiando tipo, una sottocategoria predefinita del tipo precedente non ha più senso;
    // una scritta a mano ("Altro") invece resta.
    if (previous && type !== previous && subtypesFor(previous).includes(form.subtype)) form.subtype = ''
    // La denominazione vale solo per il vino.
    form.aromaTags = keepValidAromas(form.aromaTags, type)
    if (type !== 'wine') {
      form.appellation = ''
      form.stateSeal = ''
      form.grape = ''
      grapeChoice.value = ''
    }
  },
)

// --- Posizione -----------------------------------------------------------------------
const location = ref(null)
const locationStatus = ref('idle') // 'idle' | 'loading' | 'done'
const locationHelp = ref(null)

async function onAddLocation() {
  locationStatus.value = 'loading'
  locationHelp.value = null
  try {
    location.value = await getCurrentLocation()
    locationStatus.value = 'done'
  } catch (err) {
    locationStatus.value = 'idle'
    locationHelp.value = explainLocationError(err?.code)
    await nextTick()
    // Il riquadro compare a metà modulo: lo porta in vista, sopra il pulsante "Salva".
    document.getElementById('location-help')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

function onRemoveLocation() {
  location.value = null
  locationStatus.value = 'idle'
}

// --- Caricamento e salvataggio -----------------------------------------------------
onMounted(async () => {
  if (!isEdit) {
    // Da "L'ho provato": i dati del desiderio come punto di partenza. Un desiderio che non c'è
    // più (già provato, link vecchio) lascia il modulo vuoto, senza errori.
    const wish = route.query.desiderio ? await getWish(String(route.query.desiderio)) : null
    if (wish) {
      fromWishId = wish.id
      Object.assign(form, {
        type: wish.type,
        name: wish.name,
        producer: wish.producer ?? '',
        vintage: wish.vintage ? String(wish.vintage) : '',
        notes: wish.notes ?? '',
        externalUrl: wish.externalUrl ?? '',
      })
    }
    return
  }

  const existing = await getBottle(route.params.id)
  if (!existing) {
    notFound.value = true
    loading.value = false
    return
  }
  for (const key of Object.keys(form)) {
    if (key === 'consumedDate' || key === 'consumedTime') continue
    form[key] = existing[key] ?? (key === 'type' || key === 'rating' ? null : '')
  }
  // Un vitigno fuori elenco si riapre come "Altro…" con il testo nel campo.
  grapeChoice.value = !existing.grape ? '' : isListedGrape(existing.grape) ? existing.grape : OTHER_GRAPE
  form.vintage = existing.vintage ? String(existing.vintage) : ''
  form.abv = existing.abv != null ? String(existing.abv).replace('.', ',') : ''
  // Record precedenti alla migrazione v2 restano leggibili anche se non ancora riscritti.
  form.tasting = existing.tasting || ''
  form.aromaTags = existing.aromaTags ?? []
  form.pairingTags = existing.pairingTags ?? []
  existingUntasted.value = existing.tastedAt === null
  Object.assign(form, { consumedDate: toDateAndTime(existing.consumedAt).date, consumedTime: toDateAndTime(existing.consumedAt).time })
  if (existing.location) {
    location.value = existing.location
    locationStatus.value = 'done'
  }
  const existingPhotos = await listPhotos(route.params.id)
  photos.value = existingPhotos.map((p) => ({ id: p.id, blob: p.blob, thumb: p.thumb, url: photoUrl(p.blob), isNew: false }))
  originalPhotoIds = existingPhotos.map((p) => p.id)
  loading.value = false
  await nextTick()
})

function setNow() {
  const now = toDateAndTime(new Date().toISOString())
  form.consumedDate = now.date
  form.consumedTime = now.time
}

async function focusFirstError() {
  const firstKey = ['type', 'name', 'bottles', 'rating'].find((k) => errors.value[k])
  // Un errore dei dati del passo 1 trovato al salvataggio riporta al passo 1.
  if (!isEdit && (firstKey === 'type' || firstKey === 'name')) step.value = 1
  await nextTick()
  if (firstKey === 'rating') document.querySelector('[data-field="rating"]')?.focus()
  else fieldRefs.value[firstKey]?.focus?.()
}

async function onSubmit({ allowDuplicate = false } = {}) {
  saving.value = true
  errors.value = {}
  const count = bottleCount.value
  const payload = {
    ...form,
    grape: grapeChoice.value === OTHER_GRAPE ? form.grape : grapeChoice.value,
    vintage: form.vintage === '' ? null : Number(form.vintage),
    consumedAt: fromDateAndTime(form.consumedDate, form.consumedTime),
    location: location.value,
    ...(toCellar.value
      ? { tastedAt: null, rating: null, tasting: '', pairing: '', aromaTags: [], pairingTags: [], cellarCount: count }
      : {}),
  }
  const addPhotos = photos.value.filter((p) => p.isNew).map((p) => ({ blob: p.blob, thumb: p.thumb }))
  const currentIds = new Set(photos.value.filter((p) => !p.isNew).map((p) => p.id))
  const removePhotoIds = originalPhotoIds.filter((id) => !currentIds.has(id))

  try {
    if (isEdit) {
      await withTimeout(updateBottle(route.params.id, payload, { addPhotos, removePhotoIds }), SAVE_TIMEOUT_MS)
      showBanner({ id: 'bottle-saved', message: 'Modifiche salvate', priority: 30 })
      closeSheet(router, `/bottiglia/${route.params.id}`)
    } else {
      if (toCellar.value && !allowDuplicate) {
        const match = await withTimeout(findSameLabel(payload), SAVE_TIMEOUT_MS)
        if (match) {
          duplicate.value = { match, count }
          return
        }
      }
      await withTimeout(createBottle(payload, { addPhotos, removeWishId: fromWishId }), SAVE_TIMEOUT_MS)
      if (toCellar.value) {
        showBanner({ id: 'bottle-saved', message: count === 1 ? 'In cantina: 1 bottiglia' : `In cantina: ${count} bottiglie`, priority: 30 })
        requestHomeTab('cantina')
        router.push('/')
      } else {
        showBanner({ id: 'bottle-saved', message: 'Bottiglia salvata', priority: 30 })
        // La bevuta appena salvata si vede nel Diario, qualunque scheda fosse aperta prima.
        requestHomeTab('diario')
        router.push('/')
      }
    }
  } catch (err) {
    if (err?.name === 'ValidationError') {
      errors.value = err.errors
      await focusFirstError()
    } else {
      showBanner({
        id: 'bottle-save-error',
        message:
          err?.name === 'QuotaExceededError'
            ? 'Spazio esaurito sul dispositivo: la bottiglia non è stata salvata. Elimina qualche foto o fai un backup.'
            : err?.name === 'TimeoutError'
              ? 'Il salvataggio non risponde: chiudi le altre finestre di Bacco, riaprila e riprova.'
              : `Impossibile salvare la bottiglia (${err?.name ?? 'errore'}). Riprova.`,
        tone: 'error',
        priority: 100,
      })
    }
  } finally {
    saving.value = false
  }
}

async function onAddToExisting() {
  const { match, count } = duplicate.value
  duplicate.value = null
  try {
    await addToCellar(match.id, count, { removeWishId: fromWishId })
    showBanner({ id: 'bottle-saved', message: `Aggiunte ${count} bottiglie a ${match.name}`, priority: 30 })
    router.replace(`/bottiglia/${match.id}`)
  } catch (err) {
    showBanner({ id: 'bottle-save-error', message: err.message, tone: 'error', priority: 100 })
  }
}

function onCreateAnyway() {
  duplicate.value = null
  onSubmit({ allowDuplicate: true })
}

const inputClass = 'mt-1 min-h-11 w-full rounded-md border border-rame/30 bg-doga px-3 text-gesso'
const chipClass = 'min-h-11 rounded-full border px-3 text-sm font-bold'
</script>

<template>
  <div v-if="notFound" class="p-4 text-center">
    <p>Bottiglia non trovata.</p>
  </div>

  <div v-else-if="!loading" :class="inSheet ? '' : 'pb-36'">
    <div class="flex min-h-11 items-center gap-2 p-4" :class="{ 'pr-14': inSheet }">
      <button v-if="!inSheet" type="button" aria-label="Chiudi" class="min-h-11 min-w-11 text-xl" @click="router.back()">✕</button>
      <div>
        <p v-if="!isEdit" class="text-xs font-bold text-cenere">Passo {{ step }} di 2</p>
        <h1 class="font-display text-xl uppercase tracking-wide">
          {{ isEdit ? 'Modifica bottiglia' : step === 1 ? "Cos'è" : 'Cantina o assaggio' }}
        </h1>
      </div>
    </div>
    <div
      v-if="!isEdit"
      class="mx-4 mb-6 h-1 rounded-full bg-doga"
      role="progressbar"
      aria-label="Avanzamento"
      :aria-valuenow="step"
      aria-valuemin="1"
      aria-valuemax="2"
    >
      <div class="h-1 rounded-full bg-feccia transition-all" :class="step === 1 ? 'w-1/2' : 'w-full'"></div>
    </div>

    <form id="bottle-form" class="space-y-8 px-4" @submit.prevent="onSubmit">
      <fieldset v-show="showStep1">
        <legend class="section-title">Foto</legend>
        <PhotoPicker v-model="photos" />
      </fieldset>

      <!-- Ordine del modulo: riconosco (foto, codice) → descrivo (cos'è) → decido (cantina o la
           bevo adesso) → assaggio → note → quando e dove → scheda tecnica. -->
      <fieldset v-show="showStep1" class="space-y-4">
        <legend class="section-title">Cos'è</legend>
        <div>
          <p class="field-label">Tipo *</p>
          <div :ref="setFieldRef('type')" tabindex="-1" class="mt-1">
            <TypeToggle v-model="form.type" />
          </div>
          <p v-if="errors.type" class="mt-1 text-sm text-feccia">{{ errors.type }}</p>
        </div>

        <div v-if="form.type">
          <p id="subtype-label" class="field-label">{{ form.type === 'wine' ? 'Che vino' : 'Che birra' }}</p>
          <div role="group" aria-labelledby="subtype-label" class="mt-1 flex flex-wrap gap-2">
            <button
              v-for="option in subtypeOptions"
              :key="option"
              type="button"
              :aria-pressed="form.subtype === option"
              :class="[
                chipClass,
                form.subtype === option
                  ? form.type === 'wine'
                    ? 'border-feccia bg-feccia text-botte'
                    : 'border-luppolo bg-luppolo text-doga'
                  : 'border-rame/30 text-cenere',
              ]"
              @click="pickSubtype(option)"
            >
              {{ option }}
            </button>
            <button
              type="button"
              :aria-pressed="showOther"
              :class="[chipClass, showOther ? 'border-rame bg-rame text-doga' : 'border-rame/30 text-cenere']"
              @click="pickOther"
            >
              Altro…
            </button>
          </div>
          <input
            v-if="showOther"
            v-model="form.subtype"
            type="text"
            maxlength="40"
            aria-label="Altra sottocategoria"
            placeholder="Es. Saison, Orange wine"
            :class="inputClass"
          />
        </div>

        <div v-if="form.type === 'wine'">
          <label for="grape" class="field-label">Vitigno</label>
          <!-- Menu nativo senza aspetto di sistema (come Anno/Mese in Home): Safari ignorerebbe
               forma e altezza. Il menu che si apre resta quello del sistema. -->
          <div class="relative mt-1">
            <select
              id="grape"
              v-model="grapeChoice"
              :class="[inputClass, '!mt-0 appearance-none pr-10']"
              :aria-invalid="!!errors.grape"
            >
              <option value="">—</option>
              <optgroup label="Bacca nera">
                <option v-for="g in RED_GRAPES" :key="g" :value="g">{{ g }}</option>
              </optgroup>
              <optgroup label="Bacca bianca">
                <option v-for="g in WHITE_GRAPES" :key="g" :value="g">{{ g }}</option>
              </optgroup>
              <option :value="OTHER_GRAPE">Altro…</option>
            </select>
            <svg
              viewBox="0 0 24 24"
              class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cenere"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
          <template v-if="grapeChoice === OTHER_GRAPE">
            <label for="grape-other" class="mt-3 block text-sm font-bold">Quale vitigno?</label>
            <input
              id="grape-other"
              ref="grapeOtherRef"
              v-model="form.grape"
              type="text"
              :maxlength="GRAPE_MAX"
              autocomplete="off"
              placeholder="Es. Timorasso, Merlot e Cabernet Franc"
              :class="inputClass"
              :aria-invalid="!!errors.grape"
              :aria-describedby="errors.grape ? 'grape-error' : undefined"
            />
          </template>
          <p v-if="errors.grape" id="grape-error" class="mt-1 text-sm text-feccia">{{ errors.grape }}</p>
        </div>

        <div>
          <label for="name" class="field-label">Nome *</label>
          <input
            id="name"
            :ref="setFieldRef('name')"
            v-model="form.name"
            type="text"
            autocomplete="off"
            :class="inputClass"
            :aria-invalid="!!errors.name"
            :aria-describedby="errors.name ? 'name-error' : undefined"
          />
          <p v-if="errors.name" id="name-error" class="mt-1 text-sm text-feccia">{{ errors.name }}</p>
        </div>

        <div>
          <label for="producer" class="field-label">Produttore</label>
          <!-- Nome e produttore sono campi di testo semplici: niente suggerimenti, che su iOS
               diventavano un menu a tendina. -->
          <input id="producer" v-model="form.producer" type="text" autocomplete="off" :class="inputClass" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="vintage" class="field-label">Annata</label>
            <input
              id="vintage"
              v-model="form.vintage"
              type="number"
              inputmode="numeric"
              :class="inputClass"
              :aria-invalid="!!errors.vintage"
            />
          </div>
          <div>
            <label for="abv" class="field-label">Gradazione</label>
            <div class="relative">
              <input
                id="abv"
                v-model="form.abv"
                type="text"
                inputmode="decimal"
                placeholder="13,5"
                aria-describedby="abv-unit"
                :class="[inputClass, 'pr-16']"
                :aria-invalid="!!errors.abv"
              />
              <span id="abv-unit" class="pointer-events-none absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-sm text-cenere">
                % vol
              </span>
            </div>
          </div>
        </div>
        <p v-if="errors.vintage" class="text-sm text-feccia">{{ errors.vintage }}</p>
        <p v-if="errors.abv" class="text-sm text-feccia">{{ errors.abv }}</p>
        <div v-if="form.type === 'wine'">
          <p id="appellation-label" class="field-label">Denominazione</p>
          <div role="group" aria-labelledby="appellation-label" class="mt-1 flex flex-wrap gap-2">
            <button
              v-for="option in APPELLATIONS"
              :key="option"
              type="button"
              :aria-pressed="form.appellation === option"
              :class="[
                chipClass,
                'min-w-16',
                form.appellation === option ? 'border-feccia bg-feccia text-botte' : 'border-rame/30 text-cenere',
              ]"
              @click="form.appellation = form.appellation === option ? '' : option"
            >
              {{ option }}
            </button>
          </div>
          <p v-if="errors.appellation" class="mt-1 text-sm text-feccia">{{ errors.appellation }}</p>
        </div>

        <div v-if="form.type === 'wine'">
          <div class="flex items-center gap-1">
            <label for="stateSeal" class="field-label">Contrassegno di Stato</label>
            <button
              type="button"
              class="-my-2 flex h-11 w-11 items-center justify-center rounded-full text-cenere"
              :aria-expanded="sealInfoOpen"
              aria-controls="state-seal-info"
              aria-label="Che cos'è il contrassegno di Stato"
              @click="sealInfoOpen = !sealInfoOpen"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
            </button>
          </div>
          <p v-if="sealInfoOpen" id="state-seal-info" class="mb-2 rounded-md border border-rame/30 bg-doga p-3 text-sm text-gesso">
            È il codice sulla fascetta di Stato al collo delle bottiglie DOC e DOCG (es. ADK007842971).
            Puoi verificarne l'autenticità con l'app ufficiale <strong>Trust your wine</strong> del
            Poligrafico e Zecca dello Stato.
          </p>
          <input
            id="stateSeal"
            v-model="form.stateSeal"
            type="text"
            autocapitalize="characters"
            autocomplete="off"
            spellcheck="false"
            maxlength="24"
            placeholder="Es. ADK007842971"
            :class="[inputClass, 'uppercase']"
            :aria-invalid="!!errors.stateSeal"
            :aria-describedby="errors.stateSeal ? 'state-seal-error' : undefined"
          />
          <p v-if="errors.stateSeal" id="state-seal-error" class="mt-1 text-sm text-feccia">{{ errors.stateSeal }}</p>
        </div>
      </fieldset>

      <fieldset v-if="!isEdit && step === 2">
        <legend class="section-title">Cantina</legend>
        <div class="rounded-2xl bg-doga p-4">
          <p id="bottles-label" class="font-bold">Bottiglie in cantina</p>
          <div class="mt-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Una bottiglia in meno"
              class="flex h-12 w-12 items-center justify-center rounded-full border border-rame/40 text-2xl"
              :disabled="bottleCount === 0"
              @click="changeCount(-1)"
            >
              −
            </button>
            <output
              :ref="setFieldRef('bottles')"
              tabindex="-1"
              aria-labelledby="bottles-label"
              aria-live="polite"
              class="font-display text-5xl text-luppolo"
            >
              {{ bottleCount }}
            </output>
            <button
              type="button"
              aria-label="Una bottiglia in più"
              class="flex h-12 w-12 items-center justify-center rounded-full border border-rame/40 text-2xl"
              :disabled="bottleCount === 999"
              @click="changeCount(1)"
            >
              +
            </button>
          </div>
          <p class="mt-2 text-center text-sm text-cenere">
            {{ toCellar ? 'Vanno in cantina: punteggio e analisi te li chiedo alla prima bottiglia stappata.' : '0 = la bevo adesso' }}
          </p>
        </div>
      </fieldset>

      <!-- Con bottiglie in cantina l'assaggio arriva al primo stappo: il blocco sparisce intero. -->
      <fieldset v-if="showStep2 && !toCellar">
        <legend class="section-title">Assaggio</legend>
        <TastingFields
          v-model:rating="form.rating"
          v-model:aroma-tags="form.aromaTags"
          v-model:pairing-tags="form.pairingTags"
          v-model:tasting="form.tasting"
          v-model:pairing="form.pairing"
          :type="form.type"
          :rating-required="!existingUntasted"
          :errors="errors"
        />
        <p v-if="errors.rating" class="mt-1 text-sm text-feccia">{{ errors.rating }}</p>
      </fieldset>

      <fieldset v-show="showStep2">
        <legend class="section-title">Note</legend>
        <div>
          <label for="notes" class="sr-only">Note</label>
          <textarea
            id="notes"
            v-model="form.notes"
            :maxlength="NOTES_MAX"
            rows="3"
            class="mt-1 w-full rounded-md border border-rame/30 bg-doga px-3 py-2 text-gesso"
          ></textarea>
          <p class="mt-1 text-xs text-cenere">Inizia una riga con «- » per un elenco.</p>
        </div>
      </fieldset>

      <fieldset v-show="showStep2" class="space-y-4">
        <legend class="section-title">{{ toCellar ? 'Registrata quando e dove' : 'Quando e dove' }}</legend>
        <div>
          <div class="grid grid-cols-[1fr_9rem] gap-3">
            <div>
              <label for="consumedDate" class="field-label">Data</label>
              <input id="consumedDate" v-model="form.consumedDate" type="date" :class="inputClass" />
            </div>
            <div>
              <label for="consumedTime" class="field-label">Ora</label>
              <input id="consumedTime" v-model="form.consumedTime" type="time" :class="inputClass" />
            </div>
          </div>
          <button type="button" class="mt-2 min-h-11 text-sm font-bold text-rame" @click="setNow">
            Adesso
          </button>
          <p v-if="errors.consumedAt" class="mt-1 text-sm text-feccia">{{ errors.consumedAt }}</p>
        </div>
        <div>
          <p v-if="locationStatus === 'loading'" class="text-sm text-cenere">Ricerca posizione…</p>
          <div v-else-if="locationStatus === 'done'" class="flex flex-wrap items-center gap-2">
            <p class="text-sm">📍 Posizione aggiunta (± {{ Math.round(location.accuracy) }} m)</p>
            <button type="button" class="min-h-11 text-sm font-bold text-feccia" @click="onRemoveLocation">
              Rimuovi posizione
            </button>
          </div>
          <PermissionHelp v-else-if="locationHelp" id="location-help" :help="locationHelp" @retry="onAddLocation" />
          <button
            v-else
            type="button"
            class="min-h-11 rounded-md border border-rame/30 px-3 text-sm font-bold"
            @click="onAddLocation"
          >
            📍 Aggiungi posizione
          </button>
        </div>
      </fieldset>

      <fieldset v-show="showStep2">
        <legend class="section-title">Scheda tecnica</legend>
        <label for="externalUrl" class="field-label">Link alla scheda tecnica o organolettica</label>
        <input
          id="externalUrl"
          v-model="form.externalUrl"
          type="url"
          inputmode="url"
          placeholder="https://…"
          :class="inputClass"
          :aria-invalid="!!errors.externalUrl"
        />
        <p v-if="errors.externalUrl" class="mt-1 text-sm text-feccia">{{ errors.externalUrl }}</p>
      </fieldset>
    </form>

    <!-- Nel pannello il pulsante resta in fondo al contenuto scorrevole; nella pagina sopra il menu. -->
    <div
      :class="
        inSheet
          ? 'sticky bottom-0 mt-8 bg-gradient-to-t from-botte from-60% to-transparent px-4 pb-4 pt-6'
          : 'fixed inset-x-0 bottom-16 mx-auto max-w-xl px-4'
      "
    >
      <button
        v-if="!isEdit && step === 1"
        type="button"
        class="min-h-12 w-full rounded-md bg-feccia px-4 font-bold text-botte shadow-lg"
        @click="goNext"
      >
        Avanti
      </button>
      <div v-else class="flex gap-2">
        <button
          v-if="!isEdit"
          type="button"
          class="min-h-12 rounded-md border border-rame/40 bg-botte px-4 font-bold shadow-lg"
          @click="goBack"
        >
          Indietro
        </button>
        <button
          type="submit"
          form="bottle-form"
          :disabled="saving"
          class="min-h-12 flex-1 rounded-md bg-feccia px-4 font-bold text-botte shadow-lg disabled:opacity-60"
        >
          {{ saveLabel }}
        </button>
      </div>
    </div>

    <ConfirmDialog
      :open="!!duplicate"
      title="Ce l'hai già"
      :message="duplicateMessage"
      confirm-label="Aggiungi"
      cancel-label="Crea nuova"
      escape-dismisses
      @confirm="onAddToExisting"
      @cancel="onCreateAnyway"
      @dismiss="duplicate = null"
    />
  </div>
</template>

<style scoped>
.section-title {
  margin-bottom: 0.5rem;
  font-family: var(--font-display);
  font-size: 1.25rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--c-cenere);
}
.field-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
}
</style>
