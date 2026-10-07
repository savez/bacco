<script setup>
import { reactive, ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TypeToggle from '../components/TypeToggle.vue'
import BottleRating from '../components/BottleRating.vue'
import PhotoPicker from '../components/PhotoPicker.vue'
import BarcodeScanner from '../components/BarcodeScanner.vue'
import BarcodeField from '../components/BarcodeField.vue'
import LookupStatus from '../components/LookupStatus.vue'
import PermissionHelp from '../components/PermissionHelp.vue'
import { explainLocationError } from '../lib/permissions.js'
import { createBottle, updateBottle, getBottle, getSuggestions, findLatestByBarcode } from '../db/bottles.js'
import { listPhotos, photoUrl } from '../db/photos.js'
import { lookupBarcode } from '../lib/openFoodFacts.js'
import { getCurrentLocation } from '../lib/geo.js'
import { isValidBarcode, isValidGtinChecksum } from '../lib/validate.js'
import { subtypesFor, APPELLATIONS } from '../lib/subtypes.js'
import { computeFill } from '../lib/lookupFill.js'
import { toDateAndTime, fromDateAndTime } from '../lib/format.js'
import { showBanner } from '../composables/useBanner.js'
import { closeSheet } from '../composables/useSheet.js'

const route = useRoute()
const router = useRouter()
const isEdit = !!route.params.id
// La modifica si apre nel pannello modale (che ha già il suo pulsante di chiusura).
const inSheet = !!route.meta.modal
const NOTES_MAX = 5000

const form = reactive({
  barcode: '',
  name: '',
  producer: '',
  vintage: '',
  abv: '',
  type: null,
  subtype: '',
  appellation: '',
  rating: null,
  tasting: '',
  pairing: '',
  notes: '',
  consumedDate: toDateAndTime(new Date().toISOString()).date,
  consumedTime: toDateAndTime(new Date().toISOString()).time,
  externalUrl: '',
})

const errors = ref({})
const saving = ref(false)
const loading = ref(isEdit)
const notFound = ref(false)
const suggestions = ref({ names: [], producers: [] })
const fieldRefs = ref({})
const photos = ref([])
let originalPhotoIds = []

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

watch(
  () => form.type,
  (type, previous) => {
    // Cambiando tipo, una sottocategoria predefinita del tipo precedente non ha più senso;
    // una scritta a mano ("Altro") invece resta.
    if (previous && type !== previous && subtypesFor(previous).includes(form.subtype)) form.subtype = ''
    // La denominazione vale solo per il vino.
    if (type !== 'wine') form.appellation = ''
  },
)

// --- Codice a barre e ricerca (FR-024–027a) ----------------------------------------
const scannerOpen = ref(false)
const lookup = reactive({ phase: 'idle', filled: [] })
const fieldSource = reactive({
  name: null,
  producer: null,
  type: null,
  subtype: null,
  appellation: null,
  vintage: null,
  abv: null,
})
let applyingFromLookup = false
let suppressLookup = false
let scannedCode = null
let lookupSeq = 0
let debounceTimer

for (const key of Object.keys(fieldSource)) {
  watch(
    () => form[key],
    () => {
      if (!applyingFromLookup) fieldSource[key] = null
    },
  )
}

/** Precompila solo i campi vuoti (src/lib/lookupFill.js); restituisce i campi compilati. */
function applyFields(fields, source) {
  const { updates, filled } = computeFill(form, fields)
  applyingFromLookup = true
  for (const [key, value] of Object.entries(updates)) {
    form[key] = value
    fieldSource[key] = source
  }
  nextTick(() => {
    applyingFromLookup = false
  })
  return filled
}

async function runLookup(code) {
  const seq = ++lookupSeq
  lookup.filled = []
  lookup.phase = 'registry'
  const fromRegistry = await findLatestByBarcode(code)
  if (seq !== lookupSeq) return
  if (fromRegistry) {
    lookup.filled = applyFields(fromRegistry, 'registry')
    lookup.phase = 'found-registry'
    return
  }
  if (!navigator.onLine) {
    lookup.phase = 'offline'
    return
  }
  lookup.phase = 'online'
  const result = await lookupBarcode(code)
  if (seq !== lookupSeq) return
  if (result.status === 'found') {
    lookup.filled = applyFields(result.fields, 'off')
    lookup.phase = 'found-off'
  } else {
    lookup.phase = { not_found: 'not-found', offline: 'offline' }[result.status] ?? 'error'
  }
}

function lookupIfValid(code, delay) {
  clearTimeout(debounceTimer)
  if (isValidBarcode(code) && isValidGtinChecksum(code)) {
    debounceTimer = setTimeout(() => runLookup(code), delay)
  }
}

watch(
  () => form.barcode,
  (code) => {
    if (code === scannedCode) {
      // Codice appena letto dalla fotocamera: la ricerca è già partita.
      scannedCode = null
      return
    }
    lookupSeq++ // annulla una ricerca in corso per il codice precedente
    lookup.phase = 'idle'
    lookup.filled = []
    clearTimeout(debounceTimer)
    if (suppressLookup) return
    lookupIfValid(code, 600)
  },
)

function onBarcodeDetected(code) {
  scannerOpen.value = false
  // Il lettore ha già validato il codice: ricerca subito, senza passare dal controllo
  // della cifra GTIN (che non vale per gli UPC-E a 8 cifre).
  if (form.barcode !== code) {
    scannedCode = code
    form.barcode = code
  }
  runLookup(code)
}

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
  getSuggestions().then((s) => {
    suggestions.value = s
  })
  if (!isEdit) return

  const existing = await getBottle(route.params.id)
  if (!existing) {
    notFound.value = true
    loading.value = false
    return
  }
  suppressLookup = true
  for (const key of Object.keys(form)) {
    if (key === 'consumedDate' || key === 'consumedTime') continue
    form[key] = existing[key] ?? (key === 'type' || key === 'rating' ? null : '')
  }
  form.vintage = existing.vintage ? String(existing.vintage) : ''
  form.abv = existing.abv != null ? String(existing.abv).replace('.', ',') : ''
  // Record precedenti alla migrazione v2 restano leggibili anche se non ancora riscritti.
  form.tasting = existing.tasting || ''
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
  suppressLookup = false
})

function setNow() {
  const now = toDateAndTime(new Date().toISOString())
  form.consumedDate = now.date
  form.consumedTime = now.time
}

async function focusFirstError() {
  await nextTick()
  const firstKey = ['name', 'type', 'rating'].find((k) => errors.value[k])
  fieldRefs.value[firstKey]?.focus?.()
}

async function onSubmit() {
  saving.value = true
  errors.value = {}
  const payload = {
    ...form,
    vintage: form.vintage === '' ? null : Number(form.vintage),
    consumedAt: fromDateAndTime(form.consumedDate, form.consumedTime),
    location: location.value,
  }
  const addPhotos = photos.value.filter((p) => p.isNew).map((p) => ({ blob: p.blob, thumb: p.thumb }))
  const currentIds = new Set(photos.value.filter((p) => !p.isNew).map((p) => p.id))
  const removePhotoIds = originalPhotoIds.filter((id) => !currentIds.has(id))

  try {
    if (isEdit) {
      await updateBottle(route.params.id, payload, { addPhotos, removePhotoIds })
      showBanner({ id: 'bottle-saved', message: 'Modifiche salvate', priority: 30 })
      closeSheet(router, `/bottiglia/${route.params.id}`)
    } else {
      await createBottle(payload, { addPhotos })
      showBanner({ id: 'bottle-saved', message: 'Bottiglia salvata', priority: 30 })
      router.push('/')
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
            : 'Impossibile salvare la bottiglia. Riprova.',
        tone: 'error',
        priority: 100,
      })
    }
  } finally {
    saving.value = false
  }
}

function sourceLabel(key) {
  return fieldSource[key] === 'registry' ? 'dal tuo registro' : 'da Open Food Facts'
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
      <h1 class="font-display text-xl uppercase tracking-wide">
        {{ isEdit ? 'Modifica bottiglia' : 'Nuova bottiglia' }}
      </h1>
    </div>

    <form id="bottle-form" class="space-y-8 px-4" @submit.prevent="onSubmit">
      <fieldset>
        <legend class="section-title">Foto</legend>
        <PhotoPicker v-model="photos" />
      </fieldset>

      <fieldset>
        <legend class="section-title">Codice a barre</legend>
        <BarcodeField v-model="form.barcode" @scan="scannerOpen = true" @submit="lookupIfValid(form.barcode, 0)" />
        <LookupStatus :code="form.barcode" :phase="lookup.phase" :filled="lookup.filled" />
        <p v-if="errors.barcode" class="mt-1 text-sm text-feccia">{{ errors.barcode }}</p>
      </fieldset>

      <fieldset class="space-y-4">
        <legend class="section-title">Bottiglia</legend>
        <div>
          <label for="name" class="field-label">Nome *</label>
          <input
            id="name"
            :ref="setFieldRef('name')"
            v-model="form.name"
            type="text"
            autocomplete="off"
            list="name-suggestions"
            :class="inputClass"
            :aria-invalid="!!errors.name"
            :aria-describedby="errors.name ? 'name-error' : undefined"
          />
          <datalist id="name-suggestions">
            <option v-for="n in suggestions.names" :key="n" :value="n" />
          </datalist>
          <p v-if="fieldSource.name" class="source-tag">{{ sourceLabel('name') }}</p>
          <p v-if="errors.name" id="name-error" class="mt-1 text-sm text-feccia">{{ errors.name }}</p>
        </div>

        <div>
          <label for="producer" class="field-label">Produttore</label>
          <input id="producer" v-model="form.producer" type="text" list="producer-suggestions" :class="inputClass" />
          <datalist id="producer-suggestions">
            <option v-for="p in suggestions.producers" :key="p" :value="p" />
          </datalist>
          <p v-if="fieldSource.producer" class="source-tag">{{ sourceLabel('producer') }}</p>
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
            <p v-if="fieldSource.vintage" class="source-tag">{{ sourceLabel('vintage') }}</p>
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
            <p v-if="fieldSource.abv" class="source-tag">{{ sourceLabel('abv') }}</p>
          </div>
        </div>
        <p v-if="errors.vintage" class="text-sm text-feccia">{{ errors.vintage }}</p>
        <p v-if="errors.abv" class="text-sm text-feccia">{{ errors.abv }}</p>

        <div>
          <p class="field-label">Tipo *</p>
          <div :ref="setFieldRef('type')" tabindex="-1" class="mt-1">
            <TypeToggle v-model="form.type" />
          </div>
          <p v-if="fieldSource.type" class="source-tag">{{ sourceLabel('type') }}</p>
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
          <p v-if="fieldSource.subtype" class="source-tag">{{ sourceLabel('subtype') }}</p>
        </div>

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
          <p v-if="fieldSource.appellation" class="source-tag">{{ sourceLabel('appellation') }}</p>
          <p v-if="errors.appellation" class="mt-1 text-sm text-feccia">{{ errors.appellation }}</p>
        </div>
      </fieldset>

      <fieldset>
        <legend class="section-title">Punteggio *</legend>
        <div :ref="setFieldRef('rating')" tabindex="-1">
          <BottleRating v-model="form.rating" :type="form.type" :invalid="!!errors.rating" />
        </div>
      </fieldset>

      <fieldset class="space-y-4">
        <legend class="section-title">Degustazione</legend>
        <div>
          <label for="tasting" class="field-label">Analisi organolettica personale</label>
          <textarea
            id="tasting"
            v-model="form.tasting"
            maxlength="1000"
            rows="4"
            placeholder="Colore, profumi, sapori, sensazioni. Es. rubino; ciliegia e viola; tannico, lungo."
            class="mt-1 w-full rounded-md border border-rame/30 bg-doga px-3 py-2 text-gesso"
            :aria-invalid="!!errors.tasting"
          ></textarea>
          <p v-if="errors.tasting" class="mt-1 text-sm text-feccia">{{ errors.tasting }}</p>
        </div>
        <div>
          <label for="pairing" class="field-label">Con cosa l'ho mangiato</label>
          <input id="pairing" v-model="form.pairing" type="text" maxlength="500" placeholder="Es. brasato, pizza margherita" :class="inputClass" />
        </div>
        <div>
          <label for="notes" class="field-label">Note</label>
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

      <fieldset class="space-y-4">
        <legend class="section-title">Quando e dove</legend>
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

      <fieldset>
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
        type="submit"
        form="bottle-form"
        :disabled="saving"
        class="min-h-11 w-full rounded-md bg-feccia px-4 font-bold text-botte shadow-lg disabled:opacity-60"
      >
        Salva bottiglia
      </button>
    </div>

    <BarcodeScanner v-if="scannerOpen" @detected="onBarcodeDetected" @close="scannerOpen = false" />
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
.source-tag {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--c-rame);
}
</style>
