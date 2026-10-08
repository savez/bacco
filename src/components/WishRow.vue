<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

// Riga della Wishlist (specs/005-wishlist): come BottleRow ma senza foto, punteggio né cantina.
const props = defineProps({
  wish: { type: Object, required: true },
})

// Sagome come in BottleRow.vue (viewBox 24×48).
const SILHOUETTE = {
  wine: 'M10.5 5H13.5V14C13.5 16 19 16.5 19 21V44A2 2 0 0 1 17 46H7A2 2 0 0 1 5 44V21C5 16.5 10.5 16 10.5 14Z',
  beer: 'M10 5.5H14V16C14 19 18 20 18 25V44A2 2 0 0 1 16 46H8A2 2 0 0 1 6 44V25C6 20 10 19 10 16Z',
}

const isWine = computed(() => props.wish.type === 'wine')
const subtitle = computed(() => [props.wish.producer, props.wish.vintage].filter(Boolean).join(' · '))
</script>

<template>
  <RouterLink :to="`/desiderio/${wish.id}`" class="flex min-h-16 items-center gap-3 py-3">
    <span
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
      :class="isWine ? 'bg-feccia/15 text-feccia' : 'bg-luppolo/15 text-luppolo'"
    >
      <svg viewBox="0 0 24 48" class="h-9 w-5" aria-hidden="true">
        <path :d="isWine ? SILHOUETTE.wine : SILHOUETTE.beer" fill="currentColor" />
      </svg>
      <span class="sr-only">{{ isWine ? 'Vino' : 'Birra' }}</span>
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate font-bold">{{ wish.name }}</span>
      <span v-if="subtitle" class="block truncate text-sm text-cenere">{{ subtitle }}</span>
    </span>
  </RouterLink>
</template>
