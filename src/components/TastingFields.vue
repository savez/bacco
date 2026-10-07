<script setup>
import { computed, useId } from 'vue'
import BottleRating from './BottleRating.vue'
import { aromasFor, PAIRINGS } from '../lib/tastingTags.js'

// Assaggio (specs/003-cantina-viva-ui, FR-207–209): punteggio, aromi e abbinamento a chip, più
// i campi di testo libero sempre visibili. Stesso componente in nuova bottiglia, modifica e
// "Com'è?", così si comporta ovunque allo stesso modo.
const props = defineProps({
  type: { type: String, default: null },
  ratingRequired: { type: Boolean, default: true },
  showRating: { type: Boolean, default: true },
  errors: { type: Object, default: () => ({}) },
})
const rating = defineModel('rating', { type: Number, default: null })
const aromaTags = defineModel('aromaTags', { type: Array, default: () => [] })
const pairingTags = defineModel('pairingTags', { type: Array, default: () => [] })
const tasting = defineModel('tasting', { type: String, default: '' })
const pairing = defineModel('pairing', { type: String, default: '' })

const uid = useId()
const aromas = computed(() => aromasFor(props.type))

// Nel template i ref dei modelli arrivano già "scartati": per cambiarli servono funzioni
// che lavorano sul ref, una per gruppo.
const toggled = (list, tag) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag])
function toggleAroma(tag) {
  aromaTags.value = toggled(aromaTags.value, tag)
}
function togglePairing(tag) {
  pairingTags.value = toggled(pairingTags.value, tag)
}

const chipBase = 'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold'
const aromaOn = computed(() => (props.type === 'beer' ? 'border-luppolo bg-luppolo text-doga' : 'border-feccia bg-feccia text-botte'))
const chipOff = 'border-rame/30 text-cenere'
const inputClass = 'mt-1 w-full rounded-md border border-rame/30 bg-doga px-3 text-gesso'
</script>

<template>
  <div class="space-y-5">
    <fieldset v-if="showRating">
      <legend class="field-label">{{ ratingRequired ? 'Punteggio *' : 'Punteggio' }}</legend>
      <div tabindex="-1" data-field="rating">
        <BottleRating v-model="rating" :type="type" :invalid="!!errors.rating" />
      </div>
    </fieldset>

    <div>
      <p :id="`${uid}-aromi`" class="field-label">Aromi</p>
      <p v-if="!type" class="mt-1 text-sm text-cenere">Scegli prima se è un vino o una birra.</p>
      <div v-else role="group" :aria-labelledby="`${uid}-aromi`" class="mt-1 flex flex-wrap gap-2">
        <button
          v-for="tag in aromas"
          :key="tag"
          type="button"
          :aria-pressed="aromaTags.includes(tag)"
          :class="[chipBase, aromaTags.includes(tag) ? aromaOn : chipOff]"
          @click="toggleAroma(tag)"
        >
          {{ tag }}
        </button>
      </div>
      <label :for="`${uid}-tasting`" class="mt-3 block text-sm font-bold">Analisi organolettica personale</label>
      <textarea
        :id="`${uid}-tasting`"
        v-model="tasting"
        maxlength="1000"
        rows="3"
        placeholder="Colore, profumi, sapori, sensazioni…"
        :class="[inputClass, 'py-2']"
        :aria-invalid="!!errors.tasting"
      ></textarea>
      <p v-if="errors.tasting" class="mt-1 text-sm text-feccia">{{ errors.tasting }}</p>
    </div>

    <div>
      <p :id="`${uid}-abbinamento`" class="field-label">Con cosa l'ho mangiato</p>
      <div role="group" :aria-labelledby="`${uid}-abbinamento`" class="mt-1 flex flex-wrap gap-2">
        <button
          v-for="tag in PAIRINGS"
          :key="tag"
          type="button"
          :aria-pressed="pairingTags.includes(tag)"
          :class="[chipBase, pairingTags.includes(tag) ? 'border-rame bg-rame text-doga' : chipOff]"
          @click="togglePairing(tag)"
        >
          {{ tag }}
        </button>
      </div>
      <label :for="`${uid}-pairing`" class="mt-3 block text-sm font-bold">Altro sull'abbinamento</label>
      <input
        :id="`${uid}-pairing`"
        v-model="pairing"
        type="text"
        maxlength="500"
        placeholder="Es. brasato, pizza margherita"
        :class="[inputClass, 'min-h-11']"
      />
    </div>
  </div>
</template>

<style scoped>
.field-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
}
</style>
