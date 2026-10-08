<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { takeHomeTabRequest } from '../lib/homeFilter.js'
import BottleRow from '../components/BottleRow.vue'
import WishRow from '../components/WishRow.vue'
import { liveWishes } from '../db/wishes.js'
import { liveBottles } from '../db/bottles.js'
import { useLiveQuery } from '../composables/useLiveQuery.js'
import { filterBottles, filterWishes, availableSubtypes, groupByMonth, availableYears, availableMonths, cellarSummary, tastedDate } from '../lib/search.js'
import { db } from '../db/db.js'
import { photoUrl, revokePhotoUrl } from '../db/photos.js'

const bottles = useLiveQuery(() => liveBottles(), [])
const wishes = useLiveQuery(() => liveWishes(), [])

// --- Filtri ---------------------------------------------------------------------------
const query = ref('')
const type = ref(null)
// Tipologia (sottocategoria: Rosso, IPA…) in Diario e Cantina; la Wishlist non ce l'ha.
const subtype = ref(null)
// Schede Diario | Cantina | Wishlist (specs/003-cantina-viva-ui, specs/005-wishlist). Si riapre
// l'ultima scheda usata su questo dispositivo; dopo un salvataggio si apre la scheda chiesta dal
// modulo (homeFilter.js), che diventa anche l'ultima usata.
const TAB_KEY = 'bacco.homeTab'
const TABS = ['diario', 'cantina', 'wishlist']
function readTab() {
  try {
    const saved = localStorage.getItem(TAB_KEY)
    return TABS.includes(saved) ? saved : 'diario'
  } catch {
    return 'diario'
  }
}
const tab = ref(takeHomeTabRequest() ?? readTab())
watch(
  tab,
  (value) => {
    try {
      localStorage.setItem(TAB_KEY, value)
    } catch {
      // Archiviazione non disponibile (es. navigazione privata): resta per questa sessione.
    }
  },
  { immediate: true },
)
const cellar = computed(() => tab.value === 'cantina')
const wishlist = computed(() => tab.value === 'wishlist')
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

// Anno e Mese valgono solo nel Diario, la Tipologia in Diario e Cantina: dove non si vedono non
// contano come filtri attivi.
const diary = computed(() => tab.value === 'diario')
const filtersActive = computed(
  () => !!(query.value || type.value || (!wishlist.value && subtype.value) || (diary.value && (year.value || month.value))),
)
const subtypeGroups = computed(() => availableSubtypes(bottles.value, { type: type.value, cellar: cellar.value }))
// Una tipologia che non c'è più nella scheda o nel tipo scelto (es. "IPA" passando a Vino) si azzera.
watch(subtypeGroups, (groups) => {
  if (!wishlist.value && subtype.value && !groups.some((g) => g.subtypes.includes(subtype.value))) subtype.value = null
})
const filteredWishes = computed(() => filterWishes(wishes.value, { query: query.value, type: type.value }))
// Le schede si vedono sempre (anche senza bottiglie si arriva alla Wishlist); ricerca e filtri
// solo se la scheda ha qualcosa da filtrare.
const showFilters = computed(
  () => filtersActive.value || (wishlist.value ? wishes.value.length > 0 : bottles.value.length > 0),
)
const filtered = computed(() =>
  filterBottles(bottles.value, {
    query: query.value,
    type: type.value,
    subtype: subtype.value,
    year: year.value,
    month: month.value,
    cellar: cellar.value,
  }),
)
const groups = computed(() => groupByMonth(filtered.value))
// Etichette assaggiate (il diario); quelle da assaggiare si vedono solo con "In cantina".
const tasted = computed(() => bottles.value.filter((b) => tastedDate(b) !== null))
const anyInCellar = computed(() => bottles.value.some((b) => (b.cellarCount ?? 0) > 0 || tastedDate(b) === null))
const totalInCellar = computed(() => bottles.value.reduce((n, b) => n + (b.cellarCount ?? 0), 0))

function resetFilters() {
  query.value = ''
  type.value = null
  subtype.value = null
  year.value = null
  month.value = null
}

// --- Riepilogo ------------------------------------------------------------------------
function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

const summary = computed(() => {
  if (wishlist.value) {
    const all = wishes.value
    if (filtersActive.value) return `${filteredWishes.value.length} di ${plural(all.length, 'desiderio', 'desideri')}`
    const wines = all.filter((w) => w.type === 'wine').length
    return [
      plural(all.length, 'desiderio', 'desideri'),
      plural(wines, 'vino', 'vini'),
      plural(all.length - wines, 'birra', 'birre'),
    ].join(' · ')
  }
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

const tabClass = (on) =>
  // Tre schede con il numero: su una riga sola anche a 320 px, testo pieno sugli schermi più larghi.
  `min-h-11 whitespace-nowrap rounded-full px-1 text-sm font-bold min-[400px]:text-base ${on ? 'bg-rame text-doga' : 'text-cenere'}`

const chipBase = 'inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border px-4 text-sm font-bold'
const chipOff = 'border-rame/30 text-cenere'
const typeChipClass = computed(() =>
  type.value === 'wine'
    ? 'border-feccia bg-feccia text-botte'
    : type.value === 'beer'
      ? 'border-luppolo bg-luppolo text-doga'
      : `${chipOff} bg-transparent`,
)
</script>

<template>
  <div class="px-4 pb-40 pt-3">
    <!-- Titolo solo per i lettori di schermo: a video bastano intestazione e menu. -->
    <h1 class="sr-only">Registro</h1>

    <div role="tablist" aria-label="Sezioni" class="mb-3 grid grid-cols-3 gap-1 rounded-full bg-doga p-1">
      <button type="button" role="tab" :aria-selected="diary" :class="tabClass(diary)" @click="tab = 'diario'">
        Diario · {{ tasted.length }}
      </button>
      <button type="button" role="tab" :aria-selected="cellar" :class="tabClass(cellar)" @click="tab = 'cantina'">
        Cantina · {{ totalInCellar }}
      </button>
      <button type="button" role="tab" :aria-selected="wishlist" :class="tabClass(wishlist)" @click="tab = 'wishlist'">
        Wishlist · {{ wishes.length }}
      </button>
    </div>

    <template v-if="showFilters">
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
          :aria-label="wishlist ? 'Cerca nome, produttore o note' : 'Cerca nome, produttore, aroma o abbinamento'"
          :placeholder="wishlist ? 'Cerca nome, produttore, note…' : 'Cerca nome, produttore, aroma…'"
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

      <!-- Tutti i filtri in una riga sola, scorrevole: lascia lo schermo all'elenco. Sono menu nativi
           senza aspetto di sistema (Safari ignorerebbe forma e altezza), a forma di chip e con una
           freccia nostra; il menu che si apre resta quello del sistema. -->
      <div class="-mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <!-- Tipo: menu come Tipologia, Anno e Mese; acceso del colore del vino o della birra. -->
        <label class="relative shrink-0">
          <span class="sr-only">Tipo</span>
          <select
            :value="type ?? ''"
            :class="[chipBase, 'appearance-none pr-9', typeChipClass]"
            @change="type = $event.target.value || null"
          >
            <option value="">Tipo</option>
            <option value="wine">Vino</option>
            <option value="beer">Birra</option>
          </select>
          <svg
            viewBox="0 0 24 24"
            class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
            :class="type === 'wine' ? 'text-botte' : type === 'beer' ? 'text-doga' : 'text-cenere'"
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
        <span v-if="!wishlist" class="h-6 w-px shrink-0 bg-rame/30" aria-hidden="true"></span>
        <label v-if="!wishlist" class="relative shrink-0">
          <span class="sr-only">Tipologia</span>
          <select
            :value="subtype ?? ''"
            :class="[chipBase, 'appearance-none pr-9', subtype ? 'border-rame bg-rame text-doga' : `${chipOff} bg-transparent`]"
            @change="subtype = $event.target.value || null"
          >
            <option value="">Tipologia</option>
            <optgroup v-for="g in subtypeGroups" :key="g.type" :label="g.label">
              <option v-for="s in g.subtypes" :key="s" :value="s">{{ s }}</option>
            </optgroup>
          </select>
          <svg
            viewBox="0 0 24 24"
            class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
            :class="subtype ? 'text-doga' : 'text-cenere'"
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
        <span v-if="diary" class="h-6 w-px shrink-0 bg-rame/30" aria-hidden="true"></span>
        <label v-for="f in periodFilters" v-show="diary" :key="f.key" class="relative shrink-0">
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
        <RouterLink v-if="wishlist" to="/desiderio/nuovo" class="ml-auto inline-flex min-h-11 items-center font-bold text-rame">
          + Aggiungi
        </RouterLink>
      </p>
    </template>

    <!-- Wishlist (specs/005-wishlist): vini e birre da provare, senza mesi. -->
    <template v-if="wishlist">
      <div v-if="wishes.length === 0" class="flex min-h-[50dvh] flex-col items-center justify-center text-center">
        <h2 class="font-display text-2xl uppercase tracking-wide">Nessun vino da provare</h2>
        <p class="mt-2 max-w-xs text-cenere">Annota qui i vini e le birre che ti consigliano o che vuoi cercare.</p>
        <RouterLink
          to="/desiderio/nuovo"
          class="mt-6 inline-flex min-h-12 items-center rounded-full bg-feccia px-6 font-bold text-botte shadow-lg"
        >
          + Aggiungi alla wishlist
        </RouterLink>
      </div>

      <div v-else-if="filteredWishes.length === 0" class="mt-10 text-center">
        <p class="text-cenere">Nessun desiderio con questi filtri.</p>
        <button type="button" class="mt-2 min-h-11 font-bold text-rame" @click="resetFilters">Azzera filtri</button>
      </div>

      <ul v-else class="divide-y divide-rame/10">
        <li v-for="wish in filteredWishes" :key="wish.id">
          <WishRow :wish="wish" />
        </li>
      </ul>
    </template>

    <!-- Stato vuoto: un invito, non un messaggio d'assenza. -->
    <div v-else-if="bottles.length === 0" class="flex min-h-[60dvh] flex-col items-center justify-center text-center">
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
      <p class="text-cenere">La cantina è vuota.</p>
      <p class="mx-auto mt-1 max-w-xs text-sm text-cenere">Registra una bottiglia e indica quante ne metti in cantina.</p>
      <RouterLink to="/nuova" class="mt-4 inline-flex min-h-11 items-center rounded-full bg-feccia px-5 font-bold text-botte">
        + Metti in cantina
      </RouterLink>
    </div>

    <div v-else-if="filtered.length === 0 && !filtersActive && anyInCellar" class="mt-10 text-center">
      <p class="text-cenere">Non hai ancora assaggiato le bottiglie in cantina.</p>
      <button type="button" class="mt-2 min-h-11 font-bold text-rame" @click="tab = 'cantina'">Vedi la cantina</button>
    </div>

    <div v-else-if="filtered.length === 0" class="mt-10 text-center">
      <p class="text-cenere">Nessuna bottiglia con questi filtri.</p>
      <button type="button" class="mt-2 min-h-11 font-bold text-rame" @click="resetFilters">Azzera filtri</button>
    </div>

    <!-- Cantina: un elenco unico dall'ultima entrata, senza mesi. -->
    <ul v-else-if="cellar" class="divide-y divide-rame/10">
      <li v-for="bottle in filtered" :key="bottle.id">
        <BottleRow cellar :bottle="bottle" :cover-url="coverUrls.get(bottle.id) ?? null" />
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
            <BottleRow :bottle="bottle" :cover-url="coverUrls.get(bottle.id) ?? null" />
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
