<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { listPhotos } from '../db/photos.js'
import { renderShareCard, shareOrDownload } from '../lib/shareCard.js'

const props = defineProps({
  bottle: { type: Object, required: true },
})
const emit = defineEmits(['close'])

const dialogRef = ref(null)
const previewUrl = ref(null)
const preparing = ref(true)
let cardBlob

onMounted(async () => {
  dialogRef.value?.showModal()
  const photos = await listPhotos(props.bottle.id)
  cardBlob = await renderShareCard(props.bottle, photos[0]?.blob ?? null)
  previewUrl.value = URL.createObjectURL(cardBlob)
  preparing.value = false
})

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

function onClose() {
  emit('close')
}

async function onShare() {
  if (cardBlob) await shareOrDownload(cardBlob, props.bottle)
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="w-[calc(100%-2rem)] max-w-sm rounded-lg border border-rame/30 bg-doga p-4 text-gesso backdrop:bg-black/50"
    @cancel="onClose"
  >
    <h2 class="font-display text-lg uppercase tracking-wide">Condividi</h2>

    <p v-if="preparing" class="mt-3 text-sm text-cenere">Preparazione della card…</p>
    <img
      v-if="previewUrl"
      :src="previewUrl"
      alt="Anteprima della card da condividere"
      class="mt-3 w-full rounded-md"
    />

    <div class="mt-4 flex gap-2">
      <button
        type="button"
        :disabled="preparing"
        class="min-h-11 flex-1 rounded-md bg-feccia px-3 font-bold text-botte disabled:opacity-60"
        @click="onShare"
      >
        Condividi
      </button>
      <button type="button" class="min-h-11 rounded-md border border-rame/30 px-3 font-bold" @click="onClose">
        Chiudi
      </button>
    </div>
  </dialog>
</template>
