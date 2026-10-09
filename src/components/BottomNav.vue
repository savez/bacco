<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { currentHomeTab } from '../lib/homeFilter.js'

const route = useRoute()

// Nel modulo della bottiglia l'azione principale è già "Salva": il + non serve.
const showAdd = computed(() => route.name !== 'bottle-new' && route.name !== 'bottle-edit')
// Il + fa l'azione principale della schermata: con la scheda Wishlist aperta in Home aggiunge un
// desiderio (ed è color luppolo, come la Wishlist), altrove registra una bottiglia.
const homeTab = computed(() => (route.name === 'registry' ? currentHomeTab.value : null))
const addsWish = computed(() => homeTab.value === 'wishlist')
// Con la Cantina aperta il modulo parte da 1 bottiglia in cantina invece di "bevo subito".
const addTarget = computed(() => {
  if (addsWish.value) return { to: '/desiderio/nuovo', label: 'Aggiungi alla wishlist' }
  if (homeTab.value === 'cantina') return { to: '/nuova?cantina=1', label: 'Nuova bottiglia in cantina' }
  return { to: '/nuova', label: 'Nuova bottiglia' }
})

// Icone a tratto (24×24), stesso spessore per tutte le voci.
const HOME = 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10'
const MAP = 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z M12 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'
const itemClass =
  'flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-xs text-cenere [&.router-link-exact-active]:font-bold [&.router-link-exact-active]:text-feccia'
</script>

<template>
  <nav
    aria-label="Principale"
    class="fixed inset-x-0 bottom-0 z-10 border-t border-rame/20 bg-doga pb-[env(safe-area-inset-bottom)]"
  >
    <ul class="mx-auto grid max-w-md grid-cols-3 items-end">
      <li>
        <RouterLink to="/" :class="itemClass">
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="HOME" />
          </svg>
          Home
        </RouterLink>
      </li>
      <li class="flex justify-center">
        <!-- Azione principale al centro, rialzata sul bordo della barra: a portata di pollice. -->
        <RouterLink
          v-if="showAdd"
          :to="addTarget.to"
          :aria-label="addTarget.label"
          class="-mt-7 mb-2 flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl ring-4 ring-botte transition-colors"
          :class="addsWish ? 'bg-luppolo text-doga' : 'bg-feccia text-botte'"
        >
          <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/mappa" :class="itemClass">
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="MAP" />
          </svg>
          Mappa
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
