<script setup>
import { computed } from 'vue'
import { useBanner, dismissBanner } from '../composables/useBanner.js'

// Messaggi dell'app in una striscia in alto, nella fascia dell'intestazione: non coprono mai i
// pulsanti in basso né la barra delle azioni della scheda. Le conferme spariscono da sole (si
// chiudono anche toccandole), gli errori e i messaggi con azioni restano finché non si sceglie.
const { current } = useBanner()

const ICONS = {
  // Spunta in un cerchio, "i" e "!": stesse icone a tratto del resto dell'app.
  success: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'm8 12.5 2.7 2.7L16.2 9.6'],
  info: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 11v5', 'M12 8h.01'],
  error: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 7.5v5.5', 'M12 16.5h.01'],
}
const TONE_CLASS = {
  success: { icon: 'text-luppolo', border: 'border-rame/30' },
  info: { icon: 'text-rame', border: 'border-rame/30' },
  error: { icon: 'text-feccia', border: 'border-feccia' },
}

const tone = computed(() => (current.value && ICONS[current.value.tone] ? current.value.tone : 'success'))
// Una conferma semplice si chiude toccandola; la ✕ serve solo a errori e messaggi con azioni.
const tapToClose = computed(() => current.value && current.value.actions.length === 0 && tone.value !== 'error')
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-0 z-30 mx-auto max-w-xl px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
    <Transition
      enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="-translate-y-3 opacity-0"
      leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
      leave-to-class="-translate-y-3 opacity-0"
      mode="out-in"
    >
      <div
        v-if="current"
        :key="current.id + current.message"
        :role="tone === 'error' ? 'alert' : 'status'"
        class="pointer-events-auto flex min-h-12 items-center gap-3 rounded-xl border bg-doga py-1.5 pl-3 pr-1.5 shadow-lg"
        :class="TONE_CLASS[tone].border"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-5 w-5 shrink-0"
          :class="TONE_CLASS[tone].icon"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path v-for="d in ICONS[tone]" :key="d" :d="d" />
        </svg>

        <button
          v-if="tapToClose"
          type="button"
          class="min-h-9 flex-1 text-left text-sm font-bold text-gesso"
          @click="dismissBanner(current.id)"
        >
          {{ current.message }}<span class="sr-only">, chiudi</span>
        </button>
        <p v-else class="flex-1 py-1.5 text-sm font-bold text-gesso">{{ current.message }}</p>

        <div v-if="!tapToClose" class="flex shrink-0 items-center">
          <button
            v-for="action in current.actions"
            :key="action.label"
            type="button"
            class="min-h-11 px-2 text-sm font-bold text-rame"
            @click="action.onClick()"
          >
            {{ action.label }}
          </button>
          <button
            v-if="tone === 'error' || !current.timeout"
            type="button"
            aria-label="Chiudi"
            class="flex h-11 w-11 items-center justify-center rounded-lg text-cenere"
            @click="dismissBanner(current.id)"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
