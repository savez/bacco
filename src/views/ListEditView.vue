<script setup>
import { computed, ref, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useLists } from '../composables/useLists.js'
import { addEntry, updateEntry, removeEntry, countUsage, ListError } from '../db/lists.js'
import { GRAPE_GROUPS, listById, cleanEntry, canonicalIn } from '../lib/lists.js'
import { listKey } from '../lib/search.js'
import { showBanner } from '../composables/useBanner.js'

// Voci di un elenco (specs/006-menu-personalizzabili/contracts/ui-elenchi.md): le predefinite
// restano fisse, quelle aggiunte dall'utente si aggiungono, rinominano ed eliminano. Modifica ed
// Elimina sono icone, le altre azioni a parole.
const props = defineProps({ list: { type: String, required: true } })
const router = useRouter()
const list = computed(() => listById(props.list))
const { customLists, full, texts } = useLists()

onMounted(() => {
  // Un elenco che non esiste (link vecchio o scritto a mano): si torna alle Impostazioni.
  if (!list.value) router.replace('/impostazioni')
})

const isGrape = computed(() => props.list === 'grape')
const isPredefined = (text) => canonicalIn(list.value.predefined, text) !== null

// Sezioni da mostrare: i gruppi per il Vitigno, una sola altrimenti.
const sections = computed(() => {
  if (!list.value) return []
  const mark = (text) => ({ text, predefined: isPredefined(text) })
  if (!isGrape.value) return [{ id: 'all', title: null, items: full(props.list).map(mark) }]
  const groups = full('grape')
  return GRAPE_GROUPS.filter((g) => groups[g.id].length > 0).map((g) => ({
    id: g.id,
    title: g.label,
    items: groups[g.id].map(mark),
  }))
})
const count = computed(() => (list.value ? texts(props.list).length : 0))
const groupOf = (text) => (customLists.value.grape ?? []).find((e) => listKey(e.text) === listKey(text))?.group ?? 'other'

// --- Aggiungere ----------------------------------------------------------------------
const newText = ref('')
const newGroup = ref('red')
const addError = ref('')
const addInput = ref(null)

/** Messaggio se `text` non si può usare come voce di questo elenco (vuota, lunga, già presente). */
function problemWith(text, current = null) {
  const clean = cleanEntry(props.list, text)
  if (!clean) return typeof text !== 'string' || text.trim().length === 0 ? 'Scrivi la voce.' : `Al massimo ${list.value.max} caratteri.`
  const existing = canonicalIn(texts(props.list), clean)
  if (existing && (current === null || listKey(existing) !== listKey(current))) return `C’è già «${existing}».`
  return ''
}

async function onAdd() {
  addError.value = problemWith(newText.value)
  if (addError.value) return
  try {
    const entry = await addEntry(props.list, newText.value, newGroup.value)
    showBanner({ id: 'list-edit', message: `Aggiunto «${entry.text}»`, priority: 30 })
    newText.value = ''
  } catch (err) {
    addError.value = err instanceof ListError ? err.message : 'Non sono riuscito ad aggiungere la voce.'
  }
  await nextTick()
  addInput.value?.focus()
}

// --- Modificare ----------------------------------------------------------------------
const editing = ref(null) // testo della voce che si sta modificando
const editText = ref('')
const editGroup = ref('red')
const editError = ref('')
const renameAsk = ref(null) // { from, to, group, bottles }

function startEdit(item) {
  editing.value = item.text
  editText.value = item.text
  editGroup.value = groupOf(item.text)
  editError.value = ''
}

function cancelEdit() {
  editing.value = null
  editError.value = ''
}

async function applyEdit(from, to, group) {
  try {
    const { updatedBottles } = await updateEntry(props.list, from, { text: to, ...(isGrape.value ? { group } : {}) })
    const bottles = updatedBottles === 1 ? ' · 1 bottiglia aggiornata' : updatedBottles > 1 ? ` · ${updatedBottles} bottiglie aggiornate` : ''
    showBanner({ id: 'list-edit', message: `Salvato «${to.trim()}»${bottles}`, priority: 30 })
    cancelEdit()
  } catch (err) {
    editError.value = err instanceof ListError ? err.message : 'Non sono riuscito a salvare la voce.'
  }
}

async function onSaveEdit() {
  const from = editing.value
  const to = editText.value
  editError.value = problemWith(to, from)
  if (editError.value) return
  const clean = cleanEntry(props.list, to)
  // Solo il gruppo, o nessuna bottiglia da aggiornare: si salva senza chiedere.
  const bottles = clean === from ? 0 : await countUsage(props.list, from)
  if (bottles > 0) renameAsk.value = { from, to: clean, group: editGroup.value, bottles }
  else await applyEdit(from, to, editGroup.value)
}

const renameMessage = computed(() => {
  const ask = renameAsk.value
  if (!ask) return ''
  const n = ask.bottles === 1 ? 'Anche 1 bottiglia passerà' : `Anche ${ask.bottles} bottiglie passeranno`
  return `${n} da «${ask.from}» a «${ask.to}».`
})

async function onRenameConfirmed() {
  const { from, to, group } = renameAsk.value
  renameAsk.value = null
  await applyEdit(from, to, group)
}

// --- Eliminare -----------------------------------------------------------------------
const deleteAsk = ref(null) // testo della voce

async function onDeleteConfirmed() {
  const text = deleteAsk.value
  deleteAsk.value = null
  try {
    await removeEntry(props.list, text)
    showBanner({ id: 'list-edit', message: `Eliminato «${text}»`, priority: 30 })
  } catch (err) {
    showBanner({ id: 'list-edit', message: err instanceof ListError ? err.message : 'Non sono riuscito a eliminare la voce.', tone: 'error', priority: 100 })
  }
}

const inputClass = 'min-h-11 w-full rounded-md border border-rame/30 bg-doga px-3 text-gesso'
const selectClass = 'min-h-11 w-full appearance-none rounded-md border border-rame/30 bg-doga px-3 pr-9 text-gesso'
const iconButton = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border'
</script>

<template>
  <div v-if="list" class="p-4">
    <!-- Margine a destra sull'intestazione: lascia spazio al pulsante di chiusura. -->
    <div class="pr-12">
      <p class="text-sm font-bold uppercase text-cenere">Elenchi</p>
      <h1 class="font-display text-3xl">{{ list.label }}</h1>
      <p class="mt-1 text-sm text-cenere">
        {{ count }} {{ count === 1 ? 'voce' : 'voci' }}. Le voci predefinite restano fisse: puoi aggiungerne, rinominarne ed eliminarne di tue.
      </p>
    </div>

    <form class="mt-5" novalidate @submit.prevent="onAdd">
      <label for="list-new" class="block text-sm font-bold">Nuova voce</label>
      <div class="mt-1 flex gap-2">
        <input
          id="list-new"
          ref="addInput"
          v-model="newText"
          type="text"
          :maxlength="list.max"
          autocomplete="off"
          :class="inputClass"
          :aria-invalid="!!addError"
          :aria-describedby="addError ? 'list-new-error' : undefined"
        />
        <button type="submit" class="min-h-11 shrink-0 rounded-md bg-feccia px-4 font-bold text-botte">Aggiungi</button>
      </div>
      <template v-if="isGrape">
        <label for="list-new-group" class="mt-3 block text-sm font-bold">Gruppo</label>
        <div class="relative mt-1">
          <select id="list-new-group" v-model="newGroup" :class="selectClass">
            <option v-for="g in GRAPE_GROUPS.slice(0, 2)" :key="g.id" :value="g.id">{{ g.label }}</option>
          </select>
          <svg viewBox="0 0 24 24" class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cenere" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </template>
      <p v-if="addError" id="list-new-error" class="mt-1 text-sm text-feccia" role="alert">{{ addError }}</p>
    </form>

    <section v-for="section in sections" :key="section.id" class="mt-6">
      <h2 v-if="section.title" class="font-display text-lg uppercase tracking-wide">{{ section.title }}</h2>
      <ul class="mt-1 divide-y divide-rame/10">
        <li v-for="item in section.items" :key="item.text" class="py-1">
          <!-- Modifica: la riga diventa un campo. -->
          <form v-if="editing === item.text" class="space-y-2 py-1" novalidate @submit.prevent="onSaveEdit">
            <label :for="`edit-${item.text}`" class="block text-sm font-bold">Nuovo testo di «{{ item.text }}»</label>
            <input
              :id="`edit-${item.text}`"
              v-model="editText"
              type="text"
              :maxlength="list.max"
              autocomplete="off"
              :class="inputClass"
              :aria-invalid="!!editError"
            />
            <div v-if="isGrape" class="relative">
              <label :for="`edit-group-${item.text}`" class="block text-sm font-bold">Gruppo</label>
              <select :id="`edit-group-${item.text}`" v-model="editGroup" :class="[selectClass, 'mt-1']">
                <option v-for="g in GRAPE_GROUPS" :key="g.id" :value="g.id">{{ g.label }}</option>
              </select>
            </div>
            <p v-if="editError" class="text-sm text-feccia" role="alert">{{ editError }}</p>
            <div class="flex gap-2">
              <button type="submit" class="min-h-11 rounded-md bg-feccia px-4 font-bold text-botte">Salva</button>
              <button type="button" class="min-h-11 rounded-md border border-rame/40 px-4 font-bold" @click="cancelEdit">Annulla</button>
            </div>
          </form>
          <div v-else class="flex min-h-11 items-center justify-between gap-2">
            <span class="min-w-0 break-words">{{ item.text }}</span>
            <span v-if="item.predefined" class="shrink-0 text-sm text-cenere">predefinita</span>
            <span v-else class="flex shrink-0 gap-1.5">
              <button type="button" :aria-label="`Modifica ${item.text}`" :class="[iconButton, 'border-rame/40']" @click="startEdit(item)">
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button type="button" :aria-label="`Elimina ${item.text}`" :class="[iconButton, 'border-feccia text-feccia']" @click="deleteAsk = item.text">
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                </svg>
              </button>
            </span>
          </div>
        </li>
      </ul>
    </section>

    <ConfirmDialog
      :open="!!renameAsk"
      :title="`Rinominare «${renameAsk?.from ?? ''}»?`"
      :message="renameMessage"
      confirm-label="Rinomina"
      @confirm="onRenameConfirmed"
      @cancel="renameAsk = null"
    />
    <ConfirmDialog
      :open="!!deleteAsk"
      :title="`Eliminare «${deleteAsk ?? ''}»?`"
      message="Le bottiglie che lo hanno lo conservano."
      confirm-label="Elimina"
      danger
      @confirm="onDeleteConfirmed"
      @cancel="deleteAsk = null"
    />
  </div>
</template>
