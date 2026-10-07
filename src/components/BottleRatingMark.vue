<script setup>
import { computed } from 'vue'
import { getRatingLevel } from '../lib/rating.js'

// Versione leggera, di sola lettura, per lista e scheda: un solo <svg> per riga, senza
// clipPath né animazioni (con 1.000 bottiglie nel registro conta, SC-005).
const props = defineProps({
  value: { type: Number, required: true },
  type: { type: String, default: null },
  size: { type: String, default: 'sm' }, // 'sm' | 'md'
})

const BODY = {
  wine: 'M10.5 5H13.5V14C13.5 16 19 16.5 19 21V44A2 2 0 0 1 17 46H7A2 2 0 0 1 5 44V21C5 16.5 10.5 16 10.5 14Z',
  beer: 'M10 5.5H14V16C14 19 18 20 18 25V44A2 2 0 0 1 16 46H8A2 2 0 0 1 6 44V25C6 20 10 19 10 16Z',
}

const body = computed(() => BODY[props.type === 'beer' ? 'beer' : 'wine'])
const cap = computed(() =>
  props.type === 'beer' ? { x: 9.25, y: 2.5, width: 5.5, height: 3 } : { x: 10, y: 1.5, width: 4, height: 3.5 },
)
// Classi scritte per intero: Tailwind non genera classi composte a runtime.
const TONES = {
  wine: { body: 'fill-feccia stroke-feccia', cap: 'fill-feccia' },
  beer: { body: 'fill-luppolo stroke-luppolo', cap: 'fill-luppolo' },
  none: { body: 'fill-rame stroke-rame', cap: 'fill-rame' },
}
const tone = computed(() => TONES[props.type] ?? TONES.none)
const label = computed(() => {
  const level = getRatingLevel(props.value)
  return level ? `Punteggio ${props.value} su 5: ${level.label}` : `Punteggio ${props.value} su 5`
})
</script>

<template>
  <svg
    viewBox="0 0 120 48"
    role="img"
    :aria-label="label"
    class="shrink-0"
    :class="size === 'md' ? 'h-9 w-[5.625rem]' : 'h-6 w-15'"
  >
    <g v-for="n in 5" :key="n" :transform="`translate(${(n - 1) * 24} 0)`">
      <path
        :d="body"
        stroke-width="1.6"
        stroke-linejoin="round"
        :class="n <= value ? tone.body : 'fill-none stroke-cenere'"
      />
      <rect v-bind="cap" rx="0.8" :class="n <= value ? tone.cap : 'fill-cenere'" />
    </g>
  </svg>
</template>
