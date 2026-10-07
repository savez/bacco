<script setup>
defineProps({
  modelValue: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div role="radiogroup" aria-label="Tipo" class="inline-flex rounded-md border border-rame/30">
    <label
      class="min-h-11 cursor-pointer rounded-l-md px-4 py-2 text-sm font-bold"
      :class="modelValue === 'wine' ? 'bg-feccia text-botte' : 'text-cenere'"
    >
      <input
        type="radio"
        name="bottle-type"
        value="wine"
        class="sr-only"
        :checked="modelValue === 'wine'"
        @change="emit('update:modelValue', 'wine')"
      />
      Vino
    </label>
    <label
      class="min-h-11 cursor-pointer rounded-r-md px-4 py-2 text-sm font-bold"
      :class="modelValue === 'beer' ? 'bg-luppolo text-doga' : 'text-cenere'"
    >
      <input
        type="radio"
        name="bottle-type"
        value="beer"
        class="sr-only"
        :checked="modelValue === 'beer'"
        @change="emit('update:modelValue', 'beer')"
      />
      Birra
    </label>
  </div>
</template>
