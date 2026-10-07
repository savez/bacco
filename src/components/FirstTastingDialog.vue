<script setup>
import { ref, watch, nextTick } from 'vue'
import BottleRating from './BottleRating.vue'

// Primo stappo di un'etichetta mai assaggiata (FR-109): punteggio obbligatorio per
// salvare, analisi organolettica facoltativa. "Più tardi" la lascia da assaggiare.
const props = defineProps({
  open: { type: Boolean, default: false },
  name: { type: String, required: true },
  type: { type: String, default: null },
})
const emit = defineEmits(['save', 'later'])

const dialogRef = ref(null)
const rating = ref(null)
const tasting = ref('')
const invalid = ref(false)

watch(
  () => props.open,
  async (isOpen) => {
    await nextTick()
    if (isOpen) {
      rating.value = null
      tasting.value = ''
      invalid.value = false
      dialogRef.value?.showModal()
    } else {
      dialogRef.value?.close()
    }
  },
)

function onSave() {
  if (rating.value == null) {
    invalid.value = true
    return
  }
  emit('save', { rating: rating.value, tasting: tasting.value })
}

function onDialogCancel(event) {
  event.preventDefault()
  emit('later')
}
</script>

<template>
  <dialog
    ref="dialogRef"
    aria-labelledby="tasting-title"
    class="w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-rame/30 bg-doga p-0 text-gesso shadow-2xl backdrop:bg-black/60"
    @cancel="onDialogCancel"
  >
    <form class="p-5" @submit.prevent="onSave">
      <h2 id="tasting-title" class="font-display text-2xl uppercase leading-none tracking-wide">Com'è?</h2>
      <p class="mt-1 text-sm text-cenere">Primo assaggio di {{ name }}.</p>

      <fieldset class="mt-4">
        <legend class="text-sm font-bold">Punteggio *</legend>
        <BottleRating v-model="rating" :type="type" :invalid="invalid" />
        <p v-if="invalid" class="mt-1 text-sm text-feccia" role="alert">Scegli un punteggio da 1 a 5.</p>
      </fieldset>

      <label for="first-tasting" class="mt-4 block text-sm font-bold">Analisi organolettica personale</label>
      <textarea
        id="first-tasting"
        v-model="tasting"
        maxlength="1000"
        rows="3"
        placeholder="Colore, profumi, sapori, sensazioni."
        class="mt-1 w-full rounded-md border border-rame/30 bg-botte px-3 py-2 text-gesso"
      ></textarea>

      <div class="mt-4 flex flex-col gap-2">
        <button type="submit" class="min-h-12 rounded-full bg-feccia px-4 font-bold text-botte">Salva</button>
        <button type="button" class="min-h-12 rounded-full px-4 font-bold text-cenere" @click="emit('later')">Più tardi</button>
      </div>
    </form>
  </dialog>
</template>
