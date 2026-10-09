<script setup>
import { ref, computed } from 'vue'
import { addToCellar, adjustCellar, listMoves } from '../db/cellar.js'
import { showBanner } from '../composables/useBanner.js'
import { useLiveQuery } from '../composables/useLiveQuery.js'
import { formatMove, formatDateTime } from '../lib/format.js'
import { CELLAR_MAX } from '../lib/validate.js'

// Sezione "Cantina" della scheda (specs/002-cellar-inventory/contracts/ui-cellar.md). Un solo
// selettore − N + al posto di "Aggiungi" e "Correggi quantità": ogni tocco salva subito un
// movimento, senza messaggi: il numero che cambia è la conferma (e il tasto opposto corregge un
// tocco sbagliato). Il + è un'entrata; il − una rettifica (bottiglia tolta senza berla:
// per berla c'è Stappa nella barra della scheda).
const props = defineProps({
  bottle: { type: Object, required: true },
})

const count = computed(() => props.bottle.cellarCount ?? 0)

// Un tocco alla volta: il successivo parte quando il movimento precedente è scritto.
const busy = ref(false)

async function step(delta) {
  if (busy.value) return
  busy.value = true
  try {
    if (delta > 0) await addToCellar(props.bottle.id, 1)
    else await adjustCellar(props.bottle.id, count.value - 1)
  } catch (err) {
    showBanner({ id: 'cellar-op', message: err.message, tone: 'error', priority: 100 })
  } finally {
    busy.value = false
  }
}

// --- Registro movimenti (FR-106) ---------------------------------------------------------
// Il pannello è montato con `:key="bottle.id"`: l'id non cambia durante la sua vita.
const moves = useLiveQuery(() => listMoves(props.bottle.id), [])

// "Metti in cantina" nella barra della scheda porta qui: sezione in vista e fuoco sul +.
const sectionRef = ref(null)
const plusRef = ref(null)
function focusStepper() {
  sectionRef.value?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  plusRef.value?.focus({ preventScroll: true })
}
defineExpose({ focusStepper })

const stepClass =
  'flex h-12 w-12 items-center justify-center rounded-full border border-rame/40 text-2xl font-bold disabled:opacity-40'
</script>

<template>
  <section ref="sectionRef" class="mt-6 rounded-2xl border border-rame/20 bg-doga/60 p-4" aria-labelledby="cellar-title">
    <h2 id="cellar-title" class="font-display text-lg uppercase tracking-wide">Cantina</h2>

    <div class="mt-3 flex items-center justify-between gap-3">
      <p id="cellar-count-label" class="font-bold" :class="count > 0 ? 'text-luppolo' : 'text-cenere'">
        {{ count > 0 ? 'Bottiglie in casa' : 'Non in cantina' }}
      </p>
      <div role="group" aria-labelledby="cellar-count-label" class="flex items-center gap-3">
        <button
          type="button"
          :class="stepClass"
          :disabled="count === 0 || busy"
          aria-label="Una bottiglia in meno in cantina"
          @click="step(-1)"
        >
          −
        </button>
        <span class="min-w-8 text-center font-display text-3xl leading-none" aria-live="polite">
          {{ count }}<span class="sr-only"> in cantina</span>
        </span>
        <button
          ref="plusRef"
          type="button"
          :class="stepClass"
          :disabled="count >= CELLAR_MAX || busy"
          aria-label="Una bottiglia in più in cantina"
          @click="step(1)"
        >
          +
        </button>
      </div>
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
  </section>
</template>
