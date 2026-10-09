<script setup>
import { computed } from 'vue'

// Sagoma del tipo: bottiglia per il vino, boccale con la schiuma per la birra (una bottiglia di
// birra si confonde con quella del vino). Righe dell'elenco ("sm") e scheda senza foto ("lg");
// prende il colore dal testo del contenitore.
const props = defineProps({
  type: { type: String, required: true }, // 'wine' | 'beer'
  size: { type: String, default: 'sm' }, // 'sm' | 'lg'
})

const WINE_BOTTLE = 'M10.5 5H13.5V14C13.5 16 19 16.5 19 21V44A2 2 0 0 1 17 46H7A2 2 0 0 1 5 44V21C5 16.5 10.5 16 10.5 14Z'
const SIZES = {
  sm: { wine: 'h-9 w-5', beer: 'h-9 w-9' },
  lg: { wine: 'h-40 w-20', beer: 'h-40 w-40' },
}
const sizeClass = computed(() => SIZES[props.size][props.type === 'wine' ? 'wine' : 'beer'])
</script>

<template>
  <svg v-if="type === 'wine'" viewBox="0 0 24 48" :class="sizeClass" aria-hidden="true">
    <path :d="WINE_BOTTLE" fill="currentColor" />
  </svg>
  <svg v-else viewBox="0 0 48 48" :class="sizeClass" aria-hidden="true">
    <g fill="currentColor">
      <g opacity="0.5">
        <circle cx="15" cy="14" r="5" />
        <circle cx="22" cy="11" r="6" />
        <circle cx="29" cy="14" r="5" />
        <rect x="10" y="14" width="24" height="5" />
      </g>
      <path d="M10 19h24v20a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5Z" />
    </g>
    <path d="M34 24h4a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-4" fill="none" stroke="currentColor" stroke-width="3.5" />
  </svg>
</template>
