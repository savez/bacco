<script setup>
import { ref, watch, nextTick, useId } from 'vue'

// Dialogo per un numero di bottiglie: "Aggiungi in cantina" e "Correggi quantità".
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  label: { type: String, required: true },
  confirmLabel: { type: String, required: true },
  initial: { type: Number, default: 1 },
  min: { type: Number, default: 1 },
  max: { type: Number, default: 999 },
  error: { type: String, default: '' },
})
const emit = defineEmits(['confirm', 'cancel'])

// Id unici: nella scheda ci sono due dialoghi (Aggiungi e Correggi quantità).
const uid = useId()

const dialogRef = ref(null)
const inputRef = ref(null)
const value = ref(String(props.initial))
const localError = ref('')

watch(
  () => props.open,
  async (isOpen) => {
    await nextTick()
    if (isOpen) {
      value.value = String(props.initial)
      localError.value = ''
      dialogRef.value?.showModal()
      inputRef.value?.focus()
      inputRef.value?.select()
    } else {
      dialogRef.value?.close()
    }
  },
)

function onConfirm() {
  const n = Number(value.value)
  if (!Number.isInteger(n) || n < props.min || n > props.max) {
    localError.value = `Indica un numero da ${props.min} a ${props.max}.`
    inputRef.value?.focus()
    return
  }
  emit('confirm', n)
}

function onDialogCancel(event) {
  event.preventDefault()
  emit('cancel')
}
</script>

<template>
  <dialog
    ref="dialogRef"
    :aria-labelledby="`${uid}-title`"
    class="w-[calc(100%-2rem)] max-w-xs rounded-2xl border border-rame/30 bg-doga p-0 text-gesso backdrop:bg-black/60"
    @cancel="onDialogCancel"
  >
    <form class="p-5" @submit.prevent="onConfirm">
      <h2 :id="`${uid}-title`" class="font-display text-xl uppercase tracking-wide">{{ title }}</h2>
      <label :for="`${uid}-input`" class="mt-4 block text-sm font-bold">{{ label }}</label>
      <input
        :id="`${uid}-input`"
        ref="inputRef"
        v-model="value"
        type="number"
        inputmode="numeric"
        :min="min"
        :max="max"
        step="1"
        class="mt-1 min-h-12 w-full rounded-md border border-rame/30 bg-botte px-3 text-lg text-gesso"
        :aria-invalid="!!(localError || error)"
        :aria-describedby="`${uid}-error`"
      />
      <p :id="`${uid}-error`" class="mt-1 min-h-5 text-sm text-feccia" role="alert">{{ localError || error }}</p>
      <div class="mt-3 flex justify-end gap-2">
        <button type="button" class="min-h-11 rounded-md px-3 font-bold text-cenere" @click="emit('cancel')">Annulla</button>
        <button type="submit" class="min-h-11 rounded-md bg-feccia px-4 font-bold text-botte">{{ confirmLabel }}</button>
      </div>
    </form>
  </dialog>
</template>
