<script setup>
import { computed } from 'vue'
import { isValidBarcode, isValidGtinChecksum } from '../lib/validate.js'

// Riquadro di stato della ricerca (FR-027a): validità del codice e fasi della ricerca.
const props = defineProps({
  code: { type: String, default: '' },
  phase: { type: String, default: 'idle' },
  filled: { type: Array, default: () => [] },
})

const FORMAT = { 8: 'EAN-8', 12: 'UPC-A', 13: 'EAN-13', 14: 'GTIN-14' }

const codeCheck = computed(() => {
  const code = props.code
  if (!code) return null
  if (code.length < 8) return null
  if (!isValidBarcode(code)) return { tone: 'bad', text: 'Il codice deve avere da 8 a 14 cifre.' }
  if (!FORMAT[code.length]) return { tone: 'warn', text: `Codice di ${code.length} cifre: formato non standard.` }
  return isValidGtinChecksum(code)
    ? { tone: 'ok', text: `${FORMAT[code.length]} · cifra di controllo corretta` }
    : { tone: 'warn', text: 'Cifra di controllo non corretta: ricontrolla il numero.' }
})

const filledText = computed(() => (props.filled.length ? `: compilati ${props.filled.join(', ')}` : ''))

const step = computed(() => {
  switch (props.phase) {
    case 'registry':
      return { tone: 'busy', text: 'Cerco nel tuo registro…' }
    case 'online':
      return { tone: 'busy', text: 'Cerco su Open Food Facts…' }
    case 'found-registry':
      return { tone: 'ok', text: `Trovato nel tuo registro${filledText.value}` }
    case 'found-off':
      return {
        tone: 'ok',
        text: props.filled.length
          ? `Trovato su Open Food Facts${filledText.value}`
          : 'Trovato su Open Food Facts: i campi erano già compilati',
      }
    case 'not-found':
      return { tone: 'warn', text: 'Codice non trovato su Open Food Facts. Compila a mano.' }
    case 'offline':
      return { tone: 'warn', text: 'Sei offline: compila a mano. Il codice è stato salvato.' }
    case 'error':
      return { tone: 'bad', text: 'Open Food Facts non risponde. Compila a mano.' }
    default:
      return null
  }
})

const BORDER = { ok: 'border-gesso', busy: 'border-rame', warn: 'border-luppolo', bad: 'border-feccia' }
const rows = computed(() => [codeCheck.value, step.value].filter(Boolean))
</script>

<template>
  <!-- Regione live sempre presente: viene annunciata anche la prima riga che compare. -->
  <div aria-live="polite" class="space-y-1" :class="rows.length ? 'mt-2' : ''">
    <p
      v-for="row in rows"
      :key="row.text"
      class="flex items-center gap-2 rounded-r-md border-l-4 bg-doga px-3 py-2 text-sm"
      :class="BORDER[row.tone]"
    >
      <span
        v-if="row.tone === 'busy'"
        class="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-rame border-t-transparent"
        aria-hidden="true"
      ></span>
      <span v-else aria-hidden="true" class="w-4 shrink-0 text-center font-bold">
        {{ row.tone === 'ok' ? '✓' : row.tone === 'warn' ? '!' : '✕' }}
      </span>
      <span>{{ row.text }}</span>
    </p>
  </div>
</template>
