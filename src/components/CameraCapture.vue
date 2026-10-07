<script setup>
import { ref, onMounted } from 'vue'
import { useCamera } from '../composables/useCamera.js'
import PermissionHelp from './PermissionHelp.vue'

// Fotocamera a tutto schermo per scattare una foto (FR-008): si apre già attiva.
const emit = defineEmits(['captured', 'close'])

const dialogRef = ref(null)
const videoRef = ref(null)
const { start, stop, help, ready } = useCamera(videoRef)

onMounted(() => {
  dialogRef.value?.showModal()
  start()
})

function shoot() {
  const video = videoRef.value
  if (!video?.videoWidth) return
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  canvas.toBlob(
    (blob) => {
      if (!blob) return
      stop()
      emit('captured', blob)
    },
    'image/jpeg',
    0.92,
  )
}

function onFileChosen(event) {
  const file = event.target.files?.[0]
  if (file) {
    stop()
    emit('captured', file)
  }
}

function close() {
  stop()
  emit('close')
}
</script>

<template>
  <dialog
    ref="dialogRef"
    aria-label="Scatta foto"
    class="m-0 h-dvh max-h-none w-full max-w-none bg-black p-0 text-gesso"
    @cancel.prevent="close"
  >
    <div class="relative flex h-full flex-col">
      <div class="flex items-center justify-between p-3">
        <button type="button" class="min-h-11 rounded-md px-3 font-bold text-gesso" @click="close">Annulla</button>
        <p class="font-display text-lg uppercase tracking-wide">Scatta foto</p>
        <span class="w-16"></span>
      </div>

      <video v-show="!help" ref="videoRef" playsinline muted class="min-h-0 flex-1 object-cover"></video>

      <div v-if="help" class="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-4">
        <PermissionHelp :help="help" class="w-full max-w-md" @retry="start" />
        <p class="text-sm text-cenere">Oppure:</p>
        <label class="flex min-h-11 cursor-pointer items-center rounded-md bg-feccia px-4 font-bold text-botte">
          Scegli una foto dal dispositivo
          <input type="file" accept="image/*" class="sr-only" @change="onFileChosen" />
        </label>
      </div>

      <div v-else class="flex justify-center p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          :disabled="!ready"
          aria-label="Scatta"
          class="h-18 w-18 rounded-full border-4 border-gesso bg-feccia disabled:opacity-50"
          @click="shoot"
        ></button>
      </div>
    </div>
  </dialog>
</template>
