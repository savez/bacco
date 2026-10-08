<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import NotesView from '../components/NotesView.vue'
import { liveWish, deleteWish } from '../db/wishes.js'
import { showBanner } from '../composables/useBanner.js'
import { closeSheet } from '../composables/useSheet.js'

// Dettaglio di un desiderio (specs/005-wishlist/contracts/ui-wishlist.md): dati, link alla scheda
// tecnica e "L'ho provato", che apre il modulo della bottiglia già compilato.
const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()

const wish = ref(null)
const notFound = ref(false)
const confirmOpen = ref(false)
let subscription = null

// Segue il desiderio nel DB: dopo "Salva modifiche" il pannello torna qui già aggiornato.
watch(
  () => props.id,
  (id) => {
    subscription?.unsubscribe()
    wish.value = null
    notFound.value = false
    subscription = liveWish(id).subscribe((current) => {
      wish.value = current ?? null
      notFound.value = !current
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => subscription?.unsubscribe())

function onTried() {
  router.push({ name: 'bottle-new', query: { desiderio: props.id } })
}

const iconButton = 'flex h-12 w-11 shrink-0 items-center justify-center rounded-xl border'

async function onDeleteConfirmed() {
  confirmOpen.value = false
  // Smette di seguire il record prima di cancellarlo: niente "non trovato" mentre il pannello si chiude.
  subscription?.unsubscribe()
  await deleteWish(props.id)
  showBanner({ id: 'wish-deleted', message: 'Desiderio eliminato', priority: 30 })
  closeSheet(router, '/')
}
</script>

<template>
  <div v-if="notFound" class="p-4 pr-14">
    <p>Desiderio non trovato.</p>
    <RouterLink to="/" class="mt-2 inline-block min-h-11 font-bold text-rame">Torna alla Home</RouterLink>
  </div>

  <div v-else-if="wish">
    <div class="p-4">
      <!-- Margine a destra sull'intestazione: lascia spazio al pulsante di chiusura. -->
      <div class="pr-12">
        <p class="text-sm font-bold uppercase text-cenere">Wishlist · {{ wish.type === 'wine' ? 'Vino' : 'Birra' }}</p>
        <h1 class="font-display text-3xl">{{ wish.name }}</h1>
      </div>
      <p v-if="wish.producer || wish.vintage" class="font-display text-xl text-cenere">
        {{ [wish.producer, wish.vintage].filter(Boolean).join(' · ') }}
      </p>

      <div v-if="wish.notes" class="mt-4">
        <p class="font-display text-sm uppercase tracking-wide text-cenere">Note</p>
        <NotesView :notes="wish.notes" />
      </div>

      <p v-if="wish.externalUrl" class="mt-4 text-sm">
        <a :href="wish.externalUrl" target="_blank" rel="noopener noreferrer" class="font-bold text-rame">
          Scheda tecnica ↗
        </a>
      </p>
    </div>

    <!-- Barra d'azione fissa in fondo al pannello, come nella scheda della bottiglia: l'azione
         principale a parole, Modifica ed Elimina come icone. -->
    <div class="sticky bottom-0 z-10 mt-2 flex gap-1.5 border-t border-rame/20 bg-doga px-4 pb-4 pt-3">
      <button type="button" class="flex min-h-12 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-xl bg-feccia px-2 text-sm font-bold text-botte" @click="onTried">L'ho provato</button>
      <RouterLink :to="`/desiderio/${wish.id}/modifica`" :aria-label="`Modifica ${wish.name}`" :class="[iconButton, 'border-rame/40']">
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </RouterLink>
      <button type="button" :aria-label="`Elimina ${wish.name}`" :class="[iconButton, 'border-feccia text-feccia']" @click="confirmOpen = true">
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      title="Elimina desiderio"
      :message="`«${wish.name}» verrà tolto dalla wishlist.`"
      confirm-label="Elimina"
      danger
      @confirm="onDeleteConfirmed"
      @cancel="confirmOpen = false"
    />
  </div>
</template>
