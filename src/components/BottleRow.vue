<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BottleRatingMark from './BottleRatingMark.vue'
import KindIcon from './KindIcon.vue'
import { kindLabel } from '../lib/format.js'

const props = defineProps({
  bottle: { type: Object, required: true },
  // URL (miniatura) della foto di copertina, calcolato una sola volta per tutta
  // la lista dal componente padre: con molte bottiglie, interrogare il DB da
  // ogni riga singolarmente sarebbe lento (SC-005).
  coverUrl: { type: String, default: null },
  // Scheda Cantina (specs/003-cantina-viva-ui): numero grande al posto del punteggio. Stappa e
  // Condividi stanno nella scheda della bottiglia, non nella riga.
  cellar: { type: Boolean, default: false },
})

const isWine = computed(() => props.bottle.type === 'wine')
// Cantina: bottiglie in casa ed etichette mai stappate (senza punteggio).
const inCellar = computed(() => props.bottle.cellarCount ?? 0)
const untasted = computed(() => props.bottle.tastedAt === null)

const subtitle = computed(() =>
  [kindLabel(props.bottle, ' '), props.bottle.producer, props.bottle.vintage].filter(Boolean).join(' · '),
)
</script>

<template>
  <div class="flex items-center gap-1">
    <RouterLink :to="`/bottiglia/${bottle.id}`" class="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3">
      <span
        class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg"
        :class="isWine ? 'bg-feccia/15 text-feccia' : 'bg-luppolo/15 text-luppolo'"
      >
        <img v-if="coverUrl" :src="coverUrl" alt="" class="h-full w-full object-cover" />
        <KindIcon v-else :type="bottle.type" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate font-bold">{{ bottle.name }}</span>
        <span class="block truncate text-sm text-cenere">
          <span v-if="cellar && untasted" class="font-bold text-luppolo">Da assaggiare · </span>{{ subtitle }}
        </span>
      </span>
      <span v-if="cellar" class="flex shrink-0 flex-col items-end">
        <span class="font-display text-2xl leading-none text-luppolo" aria-hidden="true">{{ inCellar }}</span>
        <span class="sr-only">{{ inCellar }} in cantina</span>
      </span>
      <span v-else class="flex shrink-0 flex-col items-end gap-1">
        <span v-if="untasted" class="rounded-full border border-luppolo px-2 py-0.5 text-xs font-bold text-luppolo">Da assaggiare</span>
        <BottleRatingMark v-else :value="bottle.rating" :type="bottle.type" />
        <span v-if="inCellar > 0" class="text-xs font-bold text-rame">
          <span aria-hidden="true">×{{ inCellar }}</span>
          <span class="sr-only">{{ inCellar }} in cantina</span>
        </span>
      </span>
    </RouterLink>
  </div>
</template>
