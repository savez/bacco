<script setup>
import { ref, onMounted } from 'vue'
import { useCamera } from '../composables/useCamera.js'
import PermissionHelp from './PermissionHelp.vue'
import { createBarcodeDetector } from '../lib/barcode.js'
import { isValidBarcode } from '../lib/validate.js'

// Scansione a tutto schermo (FR-024): si apre già con la fotocamera attiva. Il codice
// si può sempre digitare nel campo del modulo, quindi qui non c'è un campo manuale.
const emit = defineEmits(['detected', 'close'])

const dialogRef = ref(null)
const videoRef = ref(null)
const { start, stop, help, ready } = useCamera(videoRef)
let detector
let timer

async function loop() {
  if (!ready.value) return
  try {
    const results = await detector.detect(videoRef.value)
    const match = results.find((r) => isValidBarcode(r.rawValue))
    if (match) {
      stop()
      navigator.vibrate?.(60)
      emit('detected', match.rawValue)
      return
    }
  } catch {
    // Fotogramma non leggibile: si riprova al successivo.
  }
  timer = setTimeout(loop, 200)
}

async function begin() {
  await start()
  if (help.value) return
  detector ??= await createBarcodeDetector()
  loop()
}

onMounted(() => {
  dialogRef.value?.showModal()
  begin()
})

function close() {
  clearTimeout(timer)
  stop()
  emit('close')
}
</script>

<template>
  <dialog
    ref="dialogRef"
    aria-label="Scansiona codice a barre"
    class="m-0 h-dvh max-h-none w-full max-w-none bg-black p-0 text-gesso"
    @cancel.prevent="close"
  >
    <div class="relative flex h-full flex-col">
      <div class="relative z-10 flex items-center justify-between p-3">
        <button type="button" class="min-h-11 rounded-md px-3 font-bold text-gesso" @click="close">Annulla</button>
        <p class="font-display text-lg uppercase tracking-wide">Codice a barre</p>
        <span class="w-16"></span>
      </div>

      <div class="relative min-h-0 flex-1">
        <video v-show="!help" ref="videoRef" playsinline muted class="absolute inset-0 h-full w-full object-cover"></video>
        <div v-if="!help" class="absolute inset-0 flex items-center justify-center">
          <div class="h-40 w-4/5 max-w-sm rounded-xl border-4 border-rame shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"></div>
        </div>
        <p v-if="!help" class="absolute inset-x-0 bottom-8 text-center text-sm">
          Inquadra il codice a barre dell'etichetta
        </p>
        <div v-else class="flex h-full flex-col items-center justify-center gap-3 overflow-y-auto p-4">
          <PermissionHelp :help="help" class="w-full max-w-md" @retry="begin" />
          <p class="text-sm text-cenere">Oppure chiudi e digita il codice nel campo del modulo.</p>
        </div>
      </div>
    </div>
  </dialog>
</template>
