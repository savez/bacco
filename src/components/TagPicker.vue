<script setup>
import { computed, ref, useId, nextTick } from 'vue'
import { listKey } from '../lib/search.js'
import { TAG_MAX, TAGS_MAX } from '../lib/lists.js'

// Scelta multipla da un menu a tendina (specs/006-menu-personalizzabili, FR-007): ogni voce
// scelta si aggiunge sotto il menu come chip che si toglie con ✕; "Altro…" scrive una voce
// nuova, che il salvataggio della bottiglia aggiunge all'elenco. Usato per aromi e abbinamenti.
const props = defineProps({
  label: { type: String, required: true },
  // Voci dell'elenco completo (predefinite e aggiunte).
  options: { type: Array, default: () => [] },
  // Classi del chip scelto (colore del vino, della birra o degli abbinamenti).
  chipOnClass: { type: String, required: true },
  newLabel: { type: String, required: true },
  placeholder: { type: String, default: '' },
})
const model = defineModel({ type: Array, default: () => [] })

const uid = useId()
const OTHER = '__other__'
const otherOpen = ref(false)
const otherText = ref('')
const otherRef = ref(null)

const full = computed(() => model.value.length >= TAGS_MAX)
// Le voci già scelte non si riproporranno nel menu.
const available = computed(() => {
  const chosen = new Set(model.value.map(listKey))
  return props.options.filter((option) => !chosen.has(listKey(option)))
})

const add = (tag) => {
  model.value = [...model.value, tag]
}
const remove = (tag) => {
  model.value = model.value.filter((t) => t !== tag)
}

// Da tastiera, le frecce su un menu chiuso cambiano la voce e fanno scattare `change` a ogni
// pressione: si aggiungerebbe un aroma per freccia. Le frecce quindi si limitano a scorrere le
// voci; si aggiunge con Invio o lasciando il campo. Dal menu aperto (mouse, tocco, picker del
// telefono) la scelta fa scattare `change` senza frecce e si aggiunge subito.
let arrowing = false
const ARROWS = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']

function onKeydown(event) {
  if (ARROWS.includes(event.key) && !event.altKey) {
    arrowing = true
  } else if (event.key === 'Enter' && event.target.value) {
    event.preventDefault()
    choose(event.target)
  }
}

function onChange(event) {
  if (!arrowing) choose(event.target)
}

function onBlur(event) {
  if (event.target.value) choose(event.target)
}

async function choose(select) {
  const choice = select.value
  select.value = ''
  if (choice === OTHER) {
    otherOpen.value = true
    await nextTick()
    otherRef.value?.focus()
  } else if (choice) {
    add(choice)
  }
}

function addOther() {
  const text = otherText.value.replace(/\s+/g, ' ').trim()
  if (!text) return
  const key = listKey(text)
  // Uguale a una voce già scelta: niente; uguale a una dell'elenco: si sceglie quella.
  if (!model.value.some((t) => listKey(t) === key)) add(props.options.find((o) => listKey(o) === key) ?? text)
  otherText.value = ''
  otherOpen.value = false
}

const chipBase = 'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold'
const inputClass = 'mt-1 min-h-11 w-full rounded-md border border-rame/30 bg-doga px-3 text-gesso'
</script>

<template>
  <div>
    <label :for="`${uid}-select`" class="block text-sm font-bold">{{ label }}</label>
    <!-- Menu nativo senza aspetto di sistema (come Vitigno, Anno e Mese): Safari ignorerebbe forma e
         altezza. Il menu che si apre resta quello del sistema. -->
    <div class="relative mt-1">
      <select
        :id="`${uid}-select`"
        :disabled="full"
        class="min-h-11 w-full appearance-none rounded-md border border-rame/30 bg-doga px-3 pr-10 text-gesso disabled:opacity-60"
        @change="onChange"
        @keydown="onKeydown"
        @keyup="arrowing = false"
        @blur="onBlur"
      >
        <option value="">{{ full ? `Massimo ${TAGS_MAX}` : 'Aggiungi…' }}</option>
        <option v-for="option in available" :key="option" :value="option">{{ option }}</option>
        <option :value="OTHER">Altro…</option>
      </select>
      <svg
        viewBox="0 0 24 24"
        class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cenere"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>

    <template v-if="otherOpen && !full">
      <label :for="`${uid}-other`" class="mt-3 block text-sm font-bold">{{ newLabel }}</label>
      <div class="flex gap-2">
        <input
          :id="`${uid}-other`"
          ref="otherRef"
          v-model="otherText"
          type="text"
          :maxlength="TAG_MAX"
          autocomplete="off"
          :placeholder="placeholder"
          :class="inputClass"
          @keydown.enter.prevent="addOther"
        />
        <button type="button" :class="[chipBase, 'mt-1 shrink-0 border-rame bg-rame text-doga']" @click="addOther">
          Aggiungi
        </button>
      </div>
    </template>

    <ul v-if="model.length > 0" class="mt-2 flex flex-wrap gap-2" :aria-label="`${label} scelti`">
      <li v-for="tag in model" :key="tag">
        <button type="button" :class="[chipBase, chipOnClass]" :aria-label="`Togli ${tag}`" @click="remove(tag)">
          {{ tag }}
          <span aria-hidden="true">✕</span>
        </button>
      </li>
    </ul>
  </div>
</template>
