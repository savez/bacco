<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import KindIcon from './KindIcon.vue'

// Riga della Wishlist (specs/005-wishlist): come BottleRow ma senza foto, punteggio né cantina.
const props = defineProps({
  wish: { type: Object, required: true },
})

const isWine = computed(() => props.wish.type === 'wine')
const subtitle = computed(() => [props.wish.producer, props.wish.vintage].filter(Boolean).join(' · '))
</script>

<template>
  <RouterLink :to="`/desiderio/${wish.id}`" class="flex min-h-16 items-center gap-3 py-3">
    <span
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
      :class="isWine ? 'bg-feccia/15 text-feccia' : 'bg-luppolo/15 text-luppolo'"
    >
      <KindIcon :type="wish.type" />
      <span class="sr-only">{{ isWine ? 'Vino' : 'Birra' }}</span>
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate font-bold">{{ wish.name }}</span>
      <span v-if="subtitle" class="block truncate text-sm text-cenere">{{ subtitle }}</span>
    </span>
  </RouterLink>
</template>
