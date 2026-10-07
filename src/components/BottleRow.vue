<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BottleRatingMark from './BottleRatingMark.vue'
import { kindLabel } from '../lib/format.js'

const props = defineProps({
  bottle: { type: Object, required: true },
  // URL (miniatura) della foto di copertina, calcolato una sola volta per tutta
  // la lista dal componente padre: con molte bottiglie, interrogare il DB da
  // ogni riga singolarmente sarebbe lento (SC-005).
  coverUrl: { type: String, default: null },
})
const emit = defineEmits(['share'])

// Sagome come in BottleIcon.vue (viewBox 24×48).
const SILHOUETTE = {
  wine: 'M10.5 5H13.5V14C13.5 16 19 16.5 19 21V44A2 2 0 0 1 17 46H7A2 2 0 0 1 5 44V21C5 16.5 10.5 16 10.5 14Z',
  beer: 'M10 5.5H14V16C14 19 18 20 18 25V44A2 2 0 0 1 16 46H8A2 2 0 0 1 6 44V25C6 20 10 19 10 16Z',
}

const isWine = computed(() => props.bottle.type === 'wine')

const subtitle = computed(() =>
  [kindLabel(props.bottle, ' '), props.bottle.producer, props.bottle.vintage].filter(Boolean).join(' · '),
)
</script>

<template>
  <!-- Il pulsante Condividi sta fuori dal link: un controllo dentro un link non è valido. -->
  <div class="flex items-center gap-1">
    <RouterLink :to="`/bottiglia/${bottle.id}`" class="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3">
      <span
        class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg"
        :class="isWine ? 'bg-feccia/15 text-feccia' : 'bg-luppolo/15 text-luppolo'"
      >
        <img v-if="coverUrl" :src="coverUrl" alt="" class="h-full w-full object-cover" />
        <svg v-else viewBox="0 0 24 48" class="h-9 w-5" aria-hidden="true">
          <path :d="isWine ? SILHOUETTE.wine : SILHOUETTE.beer" fill="currentColor" />
        </svg>
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate font-bold">{{ bottle.name }}</span>
        <span class="block truncate text-sm text-cenere">{{ subtitle }}</span>
      </span>
      <BottleRatingMark :value="bottle.rating" :type="bottle.type" />
    </RouterLink>
    <button
      type="button"
      :aria-label="`Condividi ${bottle.name}`"
      class="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-cenere hover:text-gesso"
      @click="emit('share', bottle)"
    >
      <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
    </button>
  </div>
</template>
