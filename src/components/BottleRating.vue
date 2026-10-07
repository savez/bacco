<script setup>
import { computed } from 'vue'
import BottleIcon from './BottleIcon.vue'
import { RATING_LEVELS, getRatingLevel } from '../lib/rating.js'

const props = defineProps({
  modelValue: { type: Number, default: null },
  type: { type: String, default: null },
  invalid: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const level = computed(() => getRatingLevel(props.modelValue))
</script>

<template>
  <div>
    <div
      role="radiogroup"
      aria-label="Punteggio"
      class="flex gap-1"
      :aria-describedby="invalid ? 'rating-error' : 'rating-level'"
    >
      <label
        v-for="opt in RATING_LEVELS"
        :key="opt.value"
        class="rating-option flex h-16 min-w-11 flex-1 cursor-pointer items-center justify-center rounded-lg"
      >
        <span class="sr-only">{{ opt.value }} – {{ opt.label }}</span>
        <input
          type="radio"
          name="rating"
          class="sr-only"
          :value="opt.value"
          :checked="modelValue === opt.value"
          @change="emit('update:modelValue', opt.value)"
        />
        <BottleIcon :type="type" :filled="modelValue != null && opt.value <= modelValue" class="h-14 w-7" />
      </label>
    </div>
    <p id="rating-level" class="mt-1 min-h-6 font-display text-lg uppercase tracking-wide">
      <template v-if="level">{{ level.value }} · {{ level.label }}</template>
      <span v-else class="font-sans text-sm normal-case tracking-normal text-cenere">Tocca una bottiglia</span>
    </p>
    <p v-if="level" class="text-sm text-cenere">{{ level.description }}</p>
    <p v-if="invalid" id="rating-error" class="text-sm text-feccia">Scegli un punteggio da 1 a 5.</p>
  </div>
</template>

<style scoped>
.rating-option:has(input:focus-visible) {
  outline: 2px solid var(--c-rame);
  outline-offset: 2px;
}
</style>
