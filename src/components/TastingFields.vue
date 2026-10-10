<script setup>
import { computed, useId } from 'vue'
import BottleRating from './BottleRating.vue'
import TagPicker from './TagPicker.vue'
import { useLists } from '../composables/useLists.js'
import { listIdFor } from '../lib/lists.js'

// Assaggio (specs/003-cantina-viva-ui, FR-207–209): punteggio, aromi e abbinamenti, più i campi di
// testo libero sempre visibili. Aromi e abbinamenti sono menu a tendina che aggiungono una voce
// alla volta, con "Altro…" per le voci nuove (specs/006-menu-personalizzabili). Stesso componente
// in nuova bottiglia, modifica e "Com'è?", così si comporta ovunque allo stesso modo.
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
const { texts } = useLists()
const aromas = computed(() => {
  const id = listIdFor('aromaTags', props.type)
  return id ? texts(id) : []
})
const pairings = computed(() => texts('pairing'))

const aromaOn = computed(() => (props.type === 'beer' ? 'border-luppolo bg-luppolo text-doga' : 'border-feccia bg-feccia text-botte'))
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
      <p v-if="!type" class="field-label">Aromi</p>
      <p v-if="!type" class="mt-1 text-sm text-cenere">Scegli prima se è un vino o una birra.</p>
      <TagPicker
        v-else
        v-model="aromaTags"
        label="Aromi"
        new-label="Nuovo aroma"
        placeholder="Es. Balsamico"
        :options="aromas"
        :chip-on-class="aromaOn"
      />
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
      <TagPicker
        v-model="pairingTags"
        label="Con cosa l'ho mangiato"
        new-label="Nuovo abbinamento"
        placeholder="Es. Sushi"
        :options="pairings"
        chip-on-class="border-rame bg-rame text-doga"
      />
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
