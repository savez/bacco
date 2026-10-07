<script setup>
import { ref, watch, nextTick } from 'vue'
import TastingFields from './TastingFields.vue'

// Primo stappo di un'etichetta mai assaggiata (FR-204/209): punteggio obbligatorio per
// salvare, chip di aromi e abbinamento e testi liberi come in tutti gli altri punti.
// "Più tardi" la lascia da assaggiare.
const props = defineProps({
  open: { type: Boolean, default: false },
  name: { type: String, required: true },
  type: { type: String, default: null },
})
const emit = defineEmits(['save', 'later'])

const dialogRef = ref(null)
const rating = ref(null)
const aromaTags = ref([])
const pairingTags = ref([])
const tasting = ref('')
const pairing = ref('')
const errors = ref({})

watch(
  () => props.open,
  async (isOpen) => {
    await nextTick()
    if (isOpen) {
      rating.value = null
      aromaTags.value = []
      pairingTags.value = []
      tasting.value = ''
      pairing.value = ''
      errors.value = {}
      dialogRef.value?.showModal()
    } else {
      dialogRef.value?.close()
    }
  },
)

function onSave() {
  if (rating.value == null) {
    errors.value = { rating: 'Scegli un punteggio da 1 a 5.' }
    return
  }
  emit('save', {
    rating: rating.value,
    aromaTags: aromaTags.value,
    pairingTags: pairingTags.value,
    tasting: tasting.value,
    pairing: pairing.value,
  })
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
    class="w-[calc(100%-2rem)] max-w-md rounded-3xl border border-rame/30 bg-doga p-0 text-gesso shadow-2xl backdrop:bg-black/60"
    @cancel="onDialogCancel"
  >
    <form class="flex max-h-[85dvh] flex-col" @submit.prevent="onSave">
      <div class="overflow-y-auto px-5 pt-5">
        <h2 id="tasting-title" class="font-display text-2xl uppercase leading-none tracking-wide">Com'è?</h2>
        <p class="mt-1 text-sm text-cenere">Primo assaggio di {{ name }}.</p>
        <TastingFields
          v-model:rating="rating"
          v-model:aroma-tags="aromaTags"
          v-model:pairing-tags="pairingTags"
          v-model:tasting="tasting"
          v-model:pairing="pairing"
          class="mt-4 pb-2"
          :type="type"
          :errors="errors"
        />
        <p v-if="errors.rating" class="text-sm text-feccia" role="alert">{{ errors.rating }}</p>
      </div>
      <div class="flex flex-col gap-2 border-t border-rame/20 p-4">
        <button type="submit" class="min-h-12 rounded-full bg-feccia px-4 font-bold text-botte">Salva</button>
        <button type="button" class="min-h-12 rounded-full px-4 font-bold text-cenere" @click="emit('later')">Più tardi</button>
      </div>
    </form>
  </dialog>
</template>
