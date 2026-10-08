<script setup>
import { reactive, ref, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TypeToggle from '../components/TypeToggle.vue'
import { createWish, updateWish, getWish } from '../db/wishes.js'
import { showBanner } from '../composables/useBanner.js'
import { closeSheet } from '../composables/useSheet.js'
import { requestHomeTab } from '../lib/homeFilter.js'
import { withTimeout } from '../lib/timeout.js'

// Nuovo desiderio o modifica (specs/005-wishlist/contracts/ui-wishlist.md): pochi campi, in un
// pannello sopra la Home.
// `id` arriva dalla rotta di modifica (props: true); dichiararlo evita che finisca come attributo.
const props = defineProps({ id: { type: String, default: null } })
const router = useRouter()
const isEdit = !!props.id
const SAVE_TIMEOUT_MS = 15000
const FIELDS = ['type', 'name', 'producer', 'vintage', 'notes', 'externalUrl']

const form = reactive({ type: 'wine', name: '', producer: '', vintage: '', notes: '', externalUrl: '' })
const errors = ref({})
const saving = ref(false)
const loading = ref(isEdit)
const notFound = ref(false)
const fieldRefs = {}

function setFieldRef(key) {
  return (el) => {
    if (el) fieldRefs[key] = el
  }
}

onMounted(async () => {
  if (!isEdit) return
  const existing = await getWish(props.id)
  if (!existing) {
    notFound.value = true
  } else {
    Object.assign(form, {
      type: existing.type,
      name: existing.name,
      producer: existing.producer ?? '',
      vintage: existing.vintage ? String(existing.vintage) : '',
      notes: existing.notes ?? '',
      externalUrl: existing.externalUrl ?? '',
    })
  }
  loading.value = false
})

async function onSubmit() {
  saving.value = true
  errors.value = {}
  const payload = { ...form, vintage: form.vintage === '' ? null : Number(form.vintage) }
  try {
    if (isEdit) {
      await withTimeout(updateWish(props.id, payload), SAVE_TIMEOUT_MS)
      showBanner({ id: 'wish-saved', message: 'Modifiche salvate', priority: 30 })
      closeSheet(router, `/desiderio/${props.id}`)
    } else {
      await withTimeout(createWish(payload), SAVE_TIMEOUT_MS)
      showBanner({ id: 'wish-saved', message: 'Aggiunto alla wishlist', priority: 30 })
      requestHomeTab('wishlist')
      closeSheet(router, '/')
    }
  } catch (err) {
    if (err?.name === 'ValidationError') {
      errors.value = err.errors
      await nextTick()
      fieldRefs[FIELDS.find((key) => errors.value[key])]?.focus?.()
    } else {
      showBanner({
        id: 'wish-save-error',
        message:
          err?.name === 'QuotaExceededError'
            ? 'Spazio esaurito sul dispositivo: il desiderio non è stato salvato.'
            : err?.name === 'TimeoutError'
              ? 'Il salvataggio non risponde: chiudi le altre finestre di Bacco, riaprila e riprova.'
              : `Impossibile salvare il desiderio (${err?.name ?? 'errore'}). Riprova.`,
        tone: 'error',
        priority: 100,
      })
    }
  } finally {
    saving.value = false
  }
}

const inputClass = 'mt-1 min-h-11 w-full rounded-md border border-rame/30 bg-doga px-3 text-gesso'
</script>

<template>
  <div v-if="notFound" class="p-4 pr-14">
    <p>Desiderio non trovato.</p>
  </div>

  <div v-else-if="!loading">
    <h1 class="p-4 pr-14 font-display text-xl uppercase tracking-wide">
      {{ isEdit ? 'Modifica desiderio' : 'Da provare' }}
    </h1>

    <form id="wish-form" class="space-y-4 px-4" novalidate @submit.prevent="onSubmit">
      <div>
        <p class="field-label">Tipo *</p>
        <div :ref="setFieldRef('type')" tabindex="-1" class="mt-1">
          <TypeToggle v-model="form.type" />
        </div>
        <p v-if="errors.type" class="mt-1 text-sm text-feccia">{{ errors.type }}</p>
      </div>

      <div>
        <label for="wish-name" class="field-label">Nome *</label>
        <input
          id="wish-name"
          :ref="setFieldRef('name')"
          v-model="form.name"
          type="text"
          maxlength="120"
          autocomplete="off"
          :class="inputClass"
          :aria-invalid="!!errors.name"
          :aria-describedby="errors.name ? 'wish-name-error' : undefined"
        />
        <p v-if="errors.name" id="wish-name-error" class="mt-1 text-sm text-feccia">{{ errors.name }}</p>
      </div>

      <div>
        <label for="wish-producer" class="field-label">Produttore</label>
        <input
          id="wish-producer"
          :ref="setFieldRef('producer')"
          v-model="form.producer"
          type="text"
          maxlength="120"
          autocomplete="off"
          placeholder="Azienda agricola o birrificio"
          :class="inputClass"
          :aria-invalid="!!errors.producer"
        />
        <p v-if="errors.producer" class="mt-1 text-sm text-feccia">{{ errors.producer }}</p>
      </div>

      <div class="max-w-[9rem]">
        <label for="wish-vintage" class="field-label">Annata</label>
        <input
          id="wish-vintage"
          :ref="setFieldRef('vintage')"
          v-model="form.vintage"
          type="number"
          inputmode="numeric"
          :class="inputClass"
          :aria-invalid="!!errors.vintage"
        />
        <p v-if="errors.vintage" class="mt-1 text-sm text-feccia">{{ errors.vintage }}</p>
      </div>

      <div>
        <label for="wish-notes" class="field-label">Note</label>
        <textarea
          id="wish-notes"
          :ref="setFieldRef('notes')"
          v-model="form.notes"
          maxlength="5000"
          rows="3"
          placeholder="Chi te l'ha consigliato, perché provarlo…"
          class="mt-1 w-full rounded-md border border-rame/30 bg-doga px-3 py-2 text-gesso"
          :aria-invalid="!!errors.notes"
        ></textarea>
        <p v-if="errors.notes" class="mt-1 text-sm text-feccia">{{ errors.notes }}</p>
      </div>

      <div>
        <label for="wish-url" class="field-label">Link alla scheda tecnica</label>
        <input
          id="wish-url"
          :ref="setFieldRef('externalUrl')"
          v-model="form.externalUrl"
          type="url"
          inputmode="url"
          maxlength="2048"
          placeholder="https://…"
          :class="inputClass"
          :aria-invalid="!!errors.externalUrl"
        />
        <p v-if="errors.externalUrl" class="mt-1 text-sm text-feccia">{{ errors.externalUrl }}</p>
      </div>
    </form>

    <!-- In fondo al contenuto scorrevole del pannello, come nel modulo della bottiglia. -->
    <div class="sticky bottom-0 mt-8 flex gap-2 bg-gradient-to-t from-botte from-60% to-transparent px-4 pb-4 pt-6">
      <button
        type="button"
        class="min-h-12 rounded-md border border-rame/40 bg-botte px-4 font-bold shadow-lg"
        @click="closeSheet(router)"
      >
        Annulla
      </button>
      <button
        type="submit"
        form="wish-form"
        :disabled="saving"
        class="min-h-12 flex-1 rounded-md bg-feccia px-4 font-bold text-botte shadow-lg disabled:opacity-60"
      >
        {{ isEdit ? 'Salva modifiche' : 'Salva' }}
      </button>
    </div>
  </div>
</template>
