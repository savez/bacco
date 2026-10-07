<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOnline } from '../composables/useOnline.js'
import { db } from '../db/db.js'
import { formatDay } from '../lib/format.js'

const route = useRoute()
const router = useRouter()
const { online } = useOnline()

const bottlesWithLocation = ref([])
const mapContainer = ref(null)
let map

async function loadBottles() {
  const all = await db.bottles.toArray()
  // Mappa delle bevute: le etichette ancora da assaggiare (in cantina) non ci sono.
  bottlesWithLocation.value = all.filter((b) => b.location && b.tastedAt !== null)
}

async function renderMap() {
  if (!online.value || bottlesWithLocation.value.length === 0) return
  await nextTick() // il contenitore della mappa esiste solo nel ramo v-else del template
  if (!mapContainer.value) return

  const [L] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
  const Leaflet = L.default ?? L

  map = Leaflet.map(mapContainer.value)
  Leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  const bounds = []
  for (const bottle of bottlesWithLocation.value) {
    const color = bottle.type === 'wine' ? '#C9607F' : '#E0AC4A'
    const marker = Leaflet.circleMarker([bottle.location.lat, bottle.location.lon], {
      radius: 9,
      color,
      fillColor: color,
      fillOpacity: 1,
      weight: 2,
    }).addTo(map)

    const popupEl = document.createElement('div')
    const nameEl = document.createElement('p')
    nameEl.className = 'font-bold'
    nameEl.textContent = bottle.name
    const typeEl = document.createElement('p')
    typeEl.className = 'text-sm'
    typeEl.textContent = bottle.type === 'wine' ? 'Vino' : 'Birra'
    const openBtn = document.createElement('button')
    openBtn.type = 'button'
    openBtn.className = 'mt-1 font-bold text-rame'
    openBtn.textContent = 'Apri scheda'
    openBtn.addEventListener('click', () => router.push(`/bottiglia/${bottle.id}`))

    popupEl.append(nameEl, typeEl, openBtn)
    marker.bindPopup(popupEl)

    bounds.push([bottle.location.lat, bottle.location.lon])

    if (route.query.bottiglia === bottle.id) {
      marker.openPopup()
    }
  }

  if (bounds.length > 0) map.fitBounds(bounds, { padding: [24, 24] })
}

function destroyMap() {
  if (map) {
    map.remove()
    map = null
  }
}

onMounted(async () => {
  await loadBottles()
  renderMap()
})

watch(online, async (isOnline) => {
  destroyMap()
  if (isOnline) renderMap()
})

onBeforeUnmount(destroyMap)
</script>

<template>
  <div class="flex h-dvh flex-col pb-16">
    <div class="flex items-center gap-4 border-b border-rame/20 p-2 text-sm">
      <span><span class="text-feccia">●</span> Vino</span>
      <span><span class="text-luppolo">●</span> Birra</span>
    </div>

    <div v-if="!online" class="overflow-y-auto p-4">
      <p class="text-cenere">La mappa ha bisogno della connessione. Ecco i tuoi luoghi:</p>
      <ul class="mt-3 divide-y divide-rame/10">
        <li v-for="bottle in bottlesWithLocation" :key="bottle.id" class="py-2">
          <RouterLink :to="`/bottiglia/${bottle.id}`" class="font-bold">{{ bottle.name }}</RouterLink>
          <span class="ml-2 text-sm text-cenere">{{ formatDay(bottle.consumedAt) }}</span>
        </li>
      </ul>
    </div>

    <p v-else-if="bottlesWithLocation.length === 0" class="p-4 text-center text-cenere">
      Nessuna bottiglia con posizione.
    </p>

    <div v-else ref="mapContainer" class="flex-1"></div>
  </div>
</template>
