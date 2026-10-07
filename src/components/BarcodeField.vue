<script setup>
// Campo del codice a barre con l'icona fotocamera accanto (FR-024).
defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue', 'scan', 'submit'])

function onInput(event) {
  // Solo cifre: gli spazi copiati da un'etichetta vengono tolti.
  emit('update:modelValue', event.target.value.replace(/\D/g, ''))
}
</script>

<template>
  <div class="flex gap-2">
    <input
      id="barcode"
      :value="modelValue"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      placeholder="Digita o scansiona"
      class="min-h-11 min-w-0 flex-1 rounded-md border border-rame/30 bg-doga px-3 font-mono tracking-wider text-gesso"
      @input="onInput"
      @keydown.enter.prevent="emit('submit')"
    />
    <button
      type="button"
      aria-label="Scansiona con la fotocamera"
      class="flex min-h-11 min-w-11 items-center justify-center rounded-md bg-rame text-doga"
      @click="emit('scan')"
    >
      <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
        <path d="M7 8v8M10 8v8M13 8v8M16 8v8" />
      </svg>
    </button>
  </div>
</template>
