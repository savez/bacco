<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { resizeImage, makeThumbnail } from '../lib/image.js'
import { photoUrl, revokePhotoUrl } from '../db/photos.js'
import CameraCapture from './CameraCapture.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const processing = ref(false)
const cameraOpen = ref(false)
const error = ref('')

onBeforeUnmount(() => {
  for (const photo of props.modelValue) {
    if (photo.url) revokePhotoUrl(photo.url)
  }
})

async function addFiles(fileList) {
  const files = Array.from(fileList ?? [])
  if (files.length === 0) return
  processing.value = true
  error.value = ''
  try {
    const added = []
    for (const file of files) {
      const blob = await resizeImage(file)
      const thumb = await makeThumbnail(blob)
      added.push({ id: crypto.randomUUID(), blob, thumb, url: photoUrl(blob), isNew: true })
    }
    emit('update:modelValue', [...props.modelValue, ...added])
  } catch {
    error.value = 'Impossibile elaborare una o più foto. Riprova con un\'altra immagine.'
  } finally {
    processing.value = false
  }
}

function onCaptured(blob) {
  cameraOpen.value = false
  addFiles([blob])
}

function onGalleryChange(event) {
  addFiles(event.target.files)
  event.target.value = ''
}

function removePhoto(id) {
  const photo = props.modelValue.find((p) => p.id === id)
  if (photo?.url) revokePhotoUrl(photo.url)
  emit(
    'update:modelValue',
    props.modelValue.filter((p) => p.id !== id),
  )
}
</script>

<template>
  <div>
    <div class="flex gap-2">
      <button
        type="button"
        class="flex min-h-11 items-center gap-2 rounded-md bg-rame px-3 text-sm font-bold text-doga"
        @click="cameraOpen = true"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
          <circle cx="12" cy="14" r="3.5" />
        </svg>
        Scatta foto
      </button>
      <label
        class="flex min-h-11 cursor-pointer items-center rounded-md border border-rame/30 px-3 text-sm font-bold"
      >
        Scegli dalla galleria
        <input type="file" accept="image/*" multiple class="sr-only" @change="onGalleryChange" />
      </label>
    </div>

    <CameraCapture v-if="cameraOpen" @captured="onCaptured" @close="cameraOpen = false" />

    <p v-if="processing" class="mt-2 text-sm text-cenere">Preparazione foto…</p>
    <p v-if="error" class="mt-2 text-sm text-feccia">{{ error }}</p>

    <div v-if="modelValue.length > 0" class="mt-3 flex flex-wrap gap-2">
      <div v-for="photo in modelValue" :key="photo.id" class="relative">
        <img :src="photo.url" alt="Anteprima foto" class="h-20 w-20 rounded-md object-cover" />
        <button
          type="button"
          class="absolute -right-4 -top-4 flex min-h-11 min-w-11 items-center justify-center"
          :aria-label="`Rimuovi foto`"
          @click="removePhoto(photo.id)"
        >
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-feccia text-sm text-botte shadow">✕</span>
        </button>
      </div>
    </div>
  </div>
</template>
