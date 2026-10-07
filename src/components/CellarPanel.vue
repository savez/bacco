<script setup>
import { ref, computed } from 'vue'
import QuantityDialog from './QuantityDialog.vue'
import { addToCellar, adjustCellar, listMoves } from '../db/cellar.js'
import { confirmWithUndo } from '../composables/useUncork.js'
import { useLiveQuery } from '../composables/useLiveQuery.js'
import { formatMove, formatDateTime } from '../lib/format.js'

// Sezione "Cantina" della scheda (specs/002-cellar-inventory/contracts/ui-cellar.md).
const props = defineProps({
  bottle: { type: Object, required: true },
})

const count = computed(() => props.bottle.cellarCount ?? 0)
const bottlesLabel = (n) => `${n} ${n === 1 ? 'bottiglia' : 'bottiglie'}`

// --- Aggiungi -----------------------------------------------------------------------
const addOpen = ref(false)
const addError = ref('')

async function onAdd(n) {
  try {
    const operation = await addToCellar(props.bottle.id, n)
    addOpen.value = false
    confirmWithUndo(n === 1 ? 'Aggiunta 1 bottiglia in cantina' : `Aggiunte ${n} bottiglie in cantina`, operation)
  } catch (err) {
    addError.value = err.message
  }
}

// --- Correggi quantità ----------------------------------------------------------------
const adjustOpen = ref(false)
const adjustError = ref('')

async function onAdjust(to) {
  try {
    const operation = await adjustCellar(props.bottle.id, to)
    adjustOpen.value = false
    confirmWithUndo(`Quantità corretta: ${bottlesLabel(to)}`, operation)
  } catch (err) {
    adjustError.value = err.message
  }
}

// --- Registro movimenti (FR-106) ---------------------------------------------------------
// Il pannello è montato con `:key="bottle.id"`: l'id non cambia durante la sua vita.
const moves = useLiveQuery(() => listMoves(props.bottle.id), [])

// La barra fissa della scheda apre "Aggiungi" (specs/003-cantina-viva-ui): il dialogo resta qui.
function openAdd() {
  addError.value = ''
  addOpen.value = true
}
defineExpose({ openAdd })

const buttonClass = 'min-h-11 rounded-md border border-rame/30 px-4 py-2 font-bold'
</script>

<template>
  <section class="mt-6 rounded-2xl border border-rame/20 bg-doga/60 p-4" aria-labelledby="cellar-title">
    <div class="flex items-baseline justify-between gap-3">
      <h2 id="cellar-title" class="font-display text-lg uppercase tracking-wide">Cantina</h2>
      <p class="font-bold" :class="count > 0 ? 'text-luppolo' : 'text-cenere'">
        {{ count > 0 ? `In cantina: ${bottlesLabel(count)}` : 'Non in cantina' }}
      </p>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <button type="button" :class="buttonClass" @click="adjustError = ''; adjustOpen = true">Correggi quantità</button>
    </div>

    <!-- Accordion chiuso di default: con molti movimenti la scheda resterebbe illeggibile. -->
    <details class="group mt-4 border-t border-rame/20 pt-1">
      <summary
        class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold uppercase tracking-wide text-cenere [&::-webkit-details-marker]:hidden"
      >
        <span>Registro movimenti ({{ moves.length }})</span>
        <svg viewBox="0 0 24 24" class="h-5 w-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <ol class="mt-1 divide-y divide-rame/10 text-sm">
        <li v-for="m in moves" :key="m.id" class="py-2">
          <span class="block font-bold">{{ formatMove(m) }}</span>
          <span class="block text-xs text-cenere">{{ formatDateTime(m.at) }}</span>
        </li>
      </ol>
    </details>

    <QuantityDialog
      :open="addOpen"
      title="Aggiungi in cantina"
      label="Quante bottiglie metti in cantina?"
      confirm-label="Aggiungi"
      :initial="1"
      :min="1"
      :max="999"
      :error="addError"
      @confirm="onAdd"
      @cancel="addOpen = false"
    />
    <QuantityDialog
      :open="adjustOpen"
      title="Correggi quantità"
      label="Quante bottiglie hai davvero in cantina?"
      confirm-label="Correggi"
      :initial="count"
      :min="0"
      :max="999"
      :error="adjustError"
      @confirm="onAdjust"
      @cancel="adjustOpen = false"
    />
  </section>
</template>
