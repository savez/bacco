<script setup>
// Spiega perché fotocamera o posizione non sono disponibili e come sbloccarle (FR-030).
defineProps({
  help: { type: Object, required: true }, // { title, steps[] }
  retryLabel: { type: String, default: 'Riprova' },
})
const emit = defineEmits(['retry'])
</script>

<template>
  <div role="alert" class="rounded-md border-l-4 border-luppolo bg-doga p-3 text-left text-gesso">
    <p class="font-bold">{{ help.title }}</p>
    <ol v-if="help.steps.length > 1" class="mt-2 list-decimal space-y-1 pl-5 text-sm">
      <li v-for="step in help.steps" :key="step">{{ step }}</li>
    </ol>
    <p v-else-if="help.steps.length" class="mt-2 text-sm">{{ help.steps[0] }}</p>
    <button
      type="button"
      class="mt-3 min-h-11 rounded-md bg-rame px-4 text-sm font-bold text-doga"
      @click="emit('retry')"
    >
      {{ retryLabel }}
    </button>
  </div>
</template>
