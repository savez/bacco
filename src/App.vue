<script setup>
import { shallowRef, computed, watch } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import AppBanner from './components/AppBanner.vue'
import BottomNav from './components/BottomNav.vue'
import RouteSheet from './components/RouteSheet.vue'
import InstallInvite from './components/InstallInvite.vue'
import { usePwaUpdate } from './composables/usePwaUpdate.js'
import { useBackupReminder } from './composables/useBackupReminder.js'
import { useInstallInvite } from './composables/useInstallInvite.js'

// Registra il service worker e collega i banner di aggiornamento fin dal primo avvio
// (vedi usePwaUpdate.js): l'uso offline deve funzionare da subito, non solo da US7.
usePwaUpdate()
useBackupReminder()
useInstallInvite()

// Le pagine con `meta.modal` si aprono in un pannello sopra l'ultima pagina normale, che resta
// montata sotto (filtri e scorrimento del registro non si perdono). Con un link diretto al
// dettaglio, sotto c'è il registro.
const route = useRoute()
const router = useRouter()
const isModal = computed(() => !!route.meta.modal)
const pageRoute = shallowRef(null)

watch(
  () => route.fullPath,
  () => {
    if (!isModal.value) pageRoute.value = router.resolve(route.fullPath)
    else if (!pageRoute.value) pageRoute.value = router.resolve('/')
  },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto flex min-h-dvh max-w-xl flex-col bg-botte text-gesso">
    <header :inert="isModal || null" class="flex items-center justify-between border-b border-rame/20 p-4">
      <RouterLink to="/" class="inline-flex items-center gap-3" aria-label="Bacco, vai al registro">
        <!-- Stessa icona della PWA (public/icons/icon.svg), già in cache per l'uso offline. -->
        <img src="/icons/icon.svg" alt="" width="36" height="36" class="h-9 w-9 rounded-lg" />
        <span class="font-display text-xl uppercase tracking-wide">Bacco</span>
      </RouterLink>
      <RouterLink
        to="/impostazioni"
        aria-label="Impostazioni"
        class="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-cenere [&.router-link-exact-active]:text-feccia"
      >
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      </RouterLink>
    </header>
    <main :inert="isModal || null" class="flex-1">
      <RouterView v-slot="{ Component }" :route="pageRoute">
        <Transition
          name="fade"
          mode="out-in"
        >
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <RouteSheet v-if="isModal">
      <RouterView />
    </RouteSheet>
    <AppBanner />
    <InstallInvite />
    <BottomNav :inert="isModal || null" />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
