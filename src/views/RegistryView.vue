<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BottleRow from '../components/BottleRow.vue'
import ShareCardDialog from '../components/ShareCardDialog.vue'
import { liveBottles } from '../db/bottles.js'
import { useLiveQuery } from '../composables/useLiveQuery.js'
import { filterBottles, groupByMonth, availableYears, availableMonths, cellarSummary, tastedDate } from '../lib/search.js'
import { db } from '../db/db.js'
import { photoUrl, revokePhotoUrl } from '../db/photos.js'

const bottles = useLiveQuery(() => liveBottles(), [])

// Bottiglia di cui si sta preparando la card di condivisione (un solo dialogo per tutta la lista).
const sharing = ref(null)

// --- Filtri ---------------------------------------------------------------------------
const route = useRoute()
const router = useRouter()
const query = ref('')
const type = ref(null)
// Filtro "In cantina" (specs/002-cellar-inventory): ci si arriva anche dal modulo, dopo aver
// messo bottiglie in cantina (`/?cantina=1`). Il parametro si legge una volta e si toglie
// dall'indirizzo, altrimenti riaccenderebbe il filtro a ogni ritorno da una scheda.
const cellar = ref(false)
watch(
  () => route.query.cantina,
  (value) => {
    if (value !== '1') return
    cellar.value = true
    router.replace({ path: route.path, query: {} })
  },
  { immediate: true },
)
const year = ref(null)
const month = ref(null)

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => {
  const name = new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(new Date(2026, i, 1))
  return name.charAt(0).toUpperCase() + name.slice(1)
})
const years = computed(() => availableYears(bottles.value))
const months = computed(() => availableMonths(bottles.value, year.value))

// Se il mese scelto non esiste nell'anno appena selezionato, lo azzera.
watch(year, () => {
  if (month.value && !months.value.includes(month.value)) month.value = null
})

const filtersActive = computed(() => !!(query.value || type.value || year.value || month.value || cellar.value))
const filtered = computed(() =>
  filterBottles(bottles.value, {
    query: query.value,
    type: type.value,
    year: year.value,
    month: month.value,
    cellar: cellar.value,
  }),
)
const groups = computed(() => groupByMonth(filtered.value))
// Etichette assaggiate (il diario); quelle da assaggiare si vedono solo con "In cantina".
const tasted = computed(() => bottles.value.filter((b) => tastedDate(b) !== null))
const anyInCellar = computed(() => bottles.value.some((b) => (b.cellarCount ?? 0) > 0 || tastedDate(b) === null))

function resetFilters() {
  query.value = ''
  type.value = null
  year.value = null
  month.value = null
  cellar.value = false
}

// --- Riepilogo ------------------------------------------------------------------------
function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

const summary = computed(() => {
  if (cellar.value) {
    const { labels, bottles: total } = cellarSummary(filtered.value)
    return `${plural(labels, 'etichetta', 'etichette')} · ${plural(total, 'bottiglia', 'bottiglie')}`
  }
  const all = tasted.value
  if (filtersActive.value) return `${filtered.value.length} di ${plural(all.length, 'bottiglia', 'bottiglie')}`
  const wines = all.filter((b) => b.type === 'wine').length
  return [
    plural(all.length, 'bottiglia', 'bottiglie'),
    plural(wines, 'vino', 'vini'),
    plural(all.length - wines, 'birra', 'birre'),
  ].join(' · ')
})

// --- Copertine ------------------------------------------------------------------------
// Una sola interrogazione in blocco per tutta la lista (non una per riga), altrimenti con
// molte bottiglie il registro sarebbe lento (SC-005). Si usa la miniatura (`thumb`).
const coverUrls = ref(new Map())

function revokeCoverUrls() {
  for (const url of coverUrls.value.values()) revokePhotoUrl(url)
}

watch(
  bottles,
  async (list) => {
    if (list.length === 0) {
      revokeCoverUrls()
      coverUrls.value = new Map()
      return
    }
    const coverKeys = list.map((b) => [b.id, 0])
    const covers = await db.photos.where('[bottleId+order]').anyOf(coverKeys).toArray()
    const next = new Map(covers.map((photo) => [photo.bottleId, photoUrl(photo.thumb)]))
    revokeCoverUrls()
    coverUrls.value = next
  },
  { immediate: true },
)

onBeforeUnmount(revokeCoverUrls)

const periodFilters = [
  { key: 'year', label: 'Anno', model: year, options: computed(() => years.value.map((y) => ({ value: y, text: y }))) },
  {
    key: 'month',
    label: 'Mese',
    model: month,
    options: computed(() => months.value.map((m) => ({ value: m, text: MONTH_NAMES[m - 1] }))),
  },
]

const chipBase = 'inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border px-4 text-sm font-bold'
const chipOff = 'border-rame/30 text-cenere'
</script>

<template>
  <div class="px-4 pb-40 pt-3">
    <!-- Titolo solo per i lettori di schermo: a video bastano intestazione e menu. -->
    <h1 class="sr-only">Registro</h1>

    <template v-if="bottles.length > 0">
      <div class="relative">
        <svg
          viewBox="0 0 24 24"
          class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cenere"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          v-model="query"
          type="search"
          aria-label="Cerca nome o produttore"
          placeholder="Cerca nome o produttore"
          class="min-h-11 w-full rounded-full border border-rame/30 bg-doga pl-10 pr-11 text-gesso"
        />
        <button
          v-if="query"
          type="button"
          aria-label="Cancella la ricerca"
          class="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-cenere"
          @click="query = ''"
        >
          ✕
        </button>
      </div>

      <!-- Tutti i filtri in una riga sola, scorrevole: lascia lo schermo all'elenco. -->
      <div class="-mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <!-- Interruttori: tocca Vino per filtrare, ritoccalo per tornare a tutte le bottiglie. -->
        <div role="group" aria-label="Filtra per tipo e cantina" class="flex shrink-0 gap-2">
          <button
            type="button"
            :aria-pressed="type === 'wine'"
            :class="[chipBase, type === 'wine' ? 'border-feccia bg-feccia text-botte' : chipOff]"
            @click="type = type === 'wine' ? null : 'wine'"
          >
            Vino
          </button>
          <button
            type="button"
            :aria-pressed="type === 'beer'"
            :class="[chipBase, type === 'beer' ? 'border-luppolo bg-luppolo text-doga' : chipOff]"
            @click="type = type === 'beer' ? null : 'beer'"
          >
            Birra
          </button>
          <button
            type="button"
            :aria-pressed="cellar"
            :class="[chipBase, cellar ? 'border-rame bg-rame text-doga' : chipOff]"
            @click="cellar = !cellar"
          >
            In cantina
          </button>
        </div>
        <span v-if="!cellar" class="h-6 w-px shrink-0 bg-rame/30" aria-hidden="true"></span>
        <!-- Menu nativi senza aspetto di sistema (Safari ignorerebbe forma e altezza): stessi
             chip di Vino/Birra, con una freccia nostra. Il menu che si apre resta quello del sistema. -->
        <label v-for="f in periodFilters" v-show="!cellar" :key="f.key" class="relative shrink-0">
          <span class="sr-only">{{ f.label }}</span>
          <select
            :value="f.model.value"
            :class="[chipBase, 'appearance-none pr-9', f.model.value ? 'border-rame bg-rame text-doga' : `${chipOff} bg-transparent`]"
            @change="f.model.value = $event.target.value === '' ? null : Number($event.target.value)"
          >
            <option value="">{{ f.label }}</option>
            <option v-for="o in f.options.value" :key="o.value" :value="o.value">{{ o.text }}</option>
          </select>
          <svg
            viewBox="0 0 24 24"
            class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
            :class="f.model.value ? 'text-doga' : 'text-cenere'"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </label>
      </div>

      <p class="mt-1 flex min-h-11 items-center gap-3 text-sm text-cenere" aria-live="polite">
        <span>{{ summary }}</span>
        <button v-if="filtersActive" type="button" class="min-h-11 font-bold text-rame" @click="resetFilters">
          Azzera filtri
        </button>
      </p>
    </template>

    <!-- Stato vuoto: un invito, non un messaggio d'assenza. -->
    <div v-if="bottles.length === 0" class="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <img src="/icons/icon.svg" alt="" width="96" height="96" class="h-24 w-24 rounded-3xl shadow-lg" />
      <h2 class="mt-6 font-display text-2xl uppercase tracking-wide">Il registro è vuoto</h2>
      <p class="mt-2 max-w-xs text-cenere">Registra la prima bottiglia: bastano nome, tipo e punteggio.</p>
      <RouterLink
        to="/nuova"
        class="mt-6 inline-flex min-h-12 items-center rounded-full bg-feccia px-6 font-bold text-botte shadow-lg"
      >
        + Nuova bottiglia
      </RouterLink>
    </div>

    <div v-else-if="filtered.length === 0 && cellar && !query && !type" class="mt-10 text-center">
      <p class="text-cenere">Nessuna bottiglia in cantina.</p>
      <p class="mx-auto mt-1 max-w-xs text-sm text-cenere">Registra una bottiglia indicando 2 o più bottiglie per metterla qui.</p>
    </div>

    <div v-else-if="filtered.length === 0 && !filtersActive && anyInCellar" class="mt-10 text-center">
      <p class="text-cenere">Non hai ancora assaggiato le bottiglie in cantina.</p>
      <button type="button" class="mt-2 min-h-11 font-bold text-rame" @click="cellar = true">Vedi la cantina</button>
    </div>

    <div v-else-if="filtered.length === 0" class="mt-10 text-center">
      <p class="text-cenere">Nessuna bottiglia con questi filtri.</p>
      <button type="button" class="mt-2 min-h-11 font-bold text-rame" @click="resetFilters">Azzera filtri</button>
    </div>

    <!-- Cantina: un elenco unico dall'ultima entrata, senza mesi. -->
    <ul v-else-if="cellar" class="divide-y divide-rame/10">
      <li v-for="bottle in filtered" :key="bottle.id">
        <BottleRow :bottle="bottle" :cover-url="coverUrls.get(bottle.id) ?? null" @share="sharing = $event" />
      </li>
    </ul>

    <template v-else>
      <section v-for="group in groups" :key="group.key">
        <!-- Intestazione del mese fissa durante lo scorrimento: ti orienta nel diario. -->
        <h2 class="sticky top-0 z-[5] -mx-4 flex items-baseline justify-between bg-botte/95 px-4 py-2 backdrop-blur">
          <span class="font-display text-lg uppercase tracking-wide">{{ group.heading }}</span>
          <span class="text-sm text-cenere">{{ plural(group.items.length, 'bottiglia', 'bottiglie') }}</span>
        </h2>
        <ul class="divide-y divide-rame/10">
          <li v-for="bottle in group.items" :key="bottle.id">
            <BottleRow :bottle="bottle" :cover-url="coverUrls.get(bottle.id) ?? null" @share="sharing = $event" />
          </li>
        </ul>
      </section>
    </template>

    <ShareCardDialog v-if="sharing" :key="sharing.id" :bottle="sharing" @close="sharing = null" />
  </div>
</template>
