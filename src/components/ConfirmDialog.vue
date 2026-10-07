<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, required: true },
  confirmLabel: { type: String, default: 'Conferma' },
  cancelLabel: { type: String, default: 'Annulla' },
  // Quando il secondo pulsante non è "annulla" (es. "Crea nuova"), Esc chiude e basta.
  escapeDismisses: { type: Boolean, default: false },
  danger: { type: Boolean, default: false },
})
const emit = defineEmits(['confirm', 'cancel', 'dismiss'])

const dialogRef = ref(null)
const cancelRef = ref(null)

watch(
  () => props.open,
  async (isOpen) => {
    await nextTick()
    if (isOpen) {
      dialogRef.value?.showModal()
      cancelRef.value?.focus()
    } else {
      dialogRef.value?.close()
    }
  },
)

function onCancel() {
  emit('cancel')
}

function onConfirm() {
  emit('confirm')
}

function onDialogCancel(event) {
  // Evento nativo "cancel" generato da Esc: trattato come annullamento.
  event.preventDefault()
  if (props.escapeDismisses) emit('dismiss')
  else onCancel()
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="w-[calc(100%-2rem)] max-w-sm rounded-lg border border-rame/30 bg-doga p-0 text-gesso backdrop:bg-black/50"
    @cancel="onDialogCancel"
  >
    <div class="p-4">
      <h2 class="font-display text-lg uppercase tracking-wide">
        {{ title }}
      </h2>
      <p class="mt-2 text-sm text-cenere">
        {{ message }}
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <button
          ref="cancelRef"
          type="button"
          class="min-h-11 rounded-md px-3 text-sm font-bold text-cenere"
          @click="onCancel"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="min-h-11 rounded-md px-3 text-sm font-bold"
          :class="danger ? 'bg-feccia text-botte' : 'bg-rame text-doga'"
          @click="onConfirm"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </dialog>
</template>
