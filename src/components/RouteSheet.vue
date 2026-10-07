<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { closeSheet } from '../composables/useSheet.js'

// Pannello modale per le pagine con `meta.modal` (dettaglio e modifica): sale dal basso su
// telefono, è centrato su schermi larghi. Non è un <dialog> nativo perché i banner
// ("Modifiche salvate") devono restare visibili sopra; la pagina sotto è resa `inert` da App.
const route = useRoute()
const router = useRouter()
const panelRef = ref(null)

function close() {
  closeSheet(router)
}

function onKeydown(event) {
  // Esc chiude il pannello, salvo quando è aperto un dialogo nativo sopra (Condividi, Elimina,
  // fotocamera): quello gestisce Esc da sé.
  if (event.key === 'Escape' && !document.querySelector('dialog[open]')) close()
}

// Passando da dettaglio a modifica (o ritorno) si riparte dall'inizio del contenuto.
watch(
  () => route.fullPath,
  () => panelRef.value?.scrollTo({ top: 0 }),
)

onMounted(() => {
  document.documentElement.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
  panelRef.value?.focus()
})

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="fixed inset-0 z-20 flex items-end justify-center bg-black/60 sm:items-center sm:p-6" @click.self="close">
    <div
      ref="panelRef"
      role="dialog"
      aria-modal="true"
      :aria-label="route.name === 'bottle-edit' ? 'Modifica bottiglia' : 'Dettaglio bottiglia'"
      tabindex="-1"
      class="sheet relative max-h-[92dvh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-3xl bg-botte text-gesso shadow-2xl outline-none sm:max-h-[90dvh] sm:rounded-3xl"
    >
      <div class="sticky top-0 z-10 flex h-0 justify-end">
        <button
          type="button"
          aria-label="Chiudi"
          class="m-2 flex h-11 w-11 items-center justify-center rounded-full bg-botte/80 text-gesso shadow backdrop-blur"
          @click="close"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.sheet {
  animation: sheet-in 220ms ease-out;
}
@keyframes sheet-in {
  from {
    transform: translateY(2rem);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sheet {
    animation: none;
  }
}
</style>
