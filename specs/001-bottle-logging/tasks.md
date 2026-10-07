---

description: "Task list for Bacco – Registro personale di bottiglie (MVP)"
---

# Tasks: Bacco – Registro personale di bottiglie (MVP)

**Input**: Design documents from `specs/001-bottle-logging/`
**Prerequisites**: plan.md, spec.md, research.md, ui-design.md, data-model.md, contracts/, quickstart.md

**Tests**: inclusi solo per la logica non banale, come richiesto dal quality gate della
costituzione ("logica di dominio e accesso al DB coperti da test quando non banali") e da
research R16: validazione, DB/migrazioni, ricerca, note, Open Food Facts, backup, CSV,
promemoria, testi della card. La UI si verifica a mano con `quickstart.md`.

**Organization**: attività raggruppate per user story (ordine di priorità della spec:
US1 P1 → US2 P2 → US3 P3 → US8 P3 → US4 P4 → US5 P5 → US6 P6 → US7 P7).

**Regole per chi implementa**:

- Ogni comando `npm`/`npx` va eseguito **nel container**: `docker compose run --rm dev <comando>`.
  Mai `npm` sull'host.
- Mai `v-html`, mai `innerHTML` con dati dell'utente o di Open Food Facts; testi solo con
  interpolazione Vue o `textContent`.
- Colori, font, layout e testi dell'interfaccia seguono `ui-design.md`; regole dei dati
  seguono `data-model.md`; formati seguono `contracts/`.
- Decisioni ancora aperte, con il default usato qui: backup **JSON con limite 300 MB**
  (research R15c, non ZIP); app alla **radice del repository** (la cartella vuota `bacco/`
  non si usa).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: può procedere in parallelo (file diversi, nessuna dipendenza da attività incomplete)
- **[Story]**: user story di riferimento (US1…US8)

## Path Conventions

Progetto singolo alla radice del repository: `src/`, `tests/`, `public/`, `docker/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: governance, Docker, toolchain e configurazione del progetto

- [x] T001 Emendare la costituzione alla v2.0.0 in `.specify/memory/constitution.md` con il testo proposto in `specs/001-bottle-logging/plan.md` (sezione Constitution Check: principi II e III), eseguendo `/speckit-constitution`; aggiornare il Sync Impact Report. Bloccante: le richieste verso OSM e Open Food Facts restano violazioni finché non è fatto
- [x] T002 [P] Creare `.gitignore` (node_modules, dist, coverage, docker/certs/*.pem, .DS_Store, *.log) e `.dockerignore` (node_modules, dist, .git, docker/certs, specs, .specify, .claude) alla radice del repository
- [x] T003 Creare `package.json` (`"type": "module"`, `"private": true`, nome `bacco`) con script `dev` (`vite`), `build` (`vite build`), `preview` (`vite preview`), `lint` (`eslint .`), `test` (`vitest run`); dipendenze: `vue@^3.5`, `vue-router@^4`, `dexie@^4`, `leaflet@^1.9`, `barcode-detector@^3`, `@fontsource/big-shoulders-stencil-display@^5`, `@fontsource/atkinson-hyperlegible-next@^5`; devDependencies: `vite@^7`, `@vitejs/plugin-vue`, `tailwindcss@^4`, `@tailwindcss/vite@^4`, `vite-plugin-pwa@^1`, `@vite-pwa/assets-generator`, `vitest`, `fake-indexeddb`, `eslint@^9`, `eslint-plugin-vue`, `@eslint/js`, `globals`
- [x] T004 Creare `compose.yaml` con il servizio `dev` (`image: node:24-alpine`, `working_dir: /app`, volumi `.:/app` e volume nominato `node_modules:/app/node_modules`, porta `5173:5173`, `command: sh -c "npm install && npm run dev -- --host 0.0.0.0"`) e il servizio `web` (`build: .`, porte `8080:80` e `8443:443`, volume `./docker/certs:/etc/nginx/certs-local:ro`)
- [x] T005 Creare `Dockerfile` multi-stage: stage `build` da `node:24-alpine` (`COPY package*.json`, `npm ci`, `COPY . .`, `npm run build`); stage finale da `nginx:alpine` che installa `openssl`, genera un certificato autofirmato di riserva in `/etc/nginx/certs/bacco.pem` e `bacco-key.pem`, copia `docker/nginx.conf` in `/etc/nginx/conf.d/default.conf`, `docker/40-certs.sh` in `/docker-entrypoint.d/` (eseguibile) e `dist/` in `/usr/share/nginx/html`
- [x] T006 Generare `package-lock.json` eseguendo `docker compose run --rm dev npm install` e verificare che `docker compose up dev` serva una pagina su http://localhost:5173
- [x] T007 [P] Creare `docker/40-certs.sh`: se esistono `/etc/nginx/certs-local/bacco.pem` e `bacco-key.pem` (certificati mkcert, quickstart.md) li copia su `/etc/nginx/certs/`, altrimenti lascia quelli autofirmati
- [x] T008 [P] Creare `docker/nginx.conf`: server su 80 e `443 ssl` (certificati in `/etc/nginx/certs/`), `root /usr/share/nginx/html`, `try_files $uri /index.html`; `types { application/wasm wasm; }` oltre a `mime.types`; header su tutte le risposte (`always`) esattamente come research R14 (CSP con le sole origini `https://tile.openstreetmap.org` in `img-src` e `https://world.openfoodfacts.org` in `connect-src`, `script-src 'self' 'wasm-unsafe-eval'`, Referrer-Policy, X-Content-Type-Options, Permissions-Policy); `Cache-Control: no-cache` per `/index.html`, `/sw.js`, `/manifest.webmanifest`, `/theme-init.js`; `public, max-age=31536000, immutable` per `/assets/`
- [x] T009 [P] Creare `vite.config.js` con plugin `vue()`, `tailwindcss()` e `VitePWA({ registerType: 'prompt', injectRegister: null, manifest: { name: 'Bacco', short_name: 'Bacco', lang: 'it', description: 'Il tuo registro di vini e birre', display: 'standalone', start_url: '/', scope: '/', background_color: '#1C1613', theme_color: '#1C1613', icons: [192, 512, maskable 512] }, workbox: { globPatterns: ['**/*.{js,css,html,woff2,wasm,png,svg,ico,webmanifest}'], maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, navigateFallback: '/index.html' }, devOptions: { enabled: false } })` (la registrazione avviene dal modulo virtuale `virtual:pwa-register/vue`, quindi nessuno script inline); blocco `test: { environment: 'node', setupFiles: ['tests/setup.js'] }`
- [x] T010 [P] Creare `eslint.config.js` (flat config) con `@eslint/js` recommended, `eslint-plugin-vue` `flat/recommended`, globals browser + node, e regola `'vue/no-v-html': 'error'`
- [x] T011 [P] Creare `tests/setup.js` che importa `fake-indexeddb/auto`
- [x] T012 [P] Creare `index.html`: `<html lang="it">`, meta `viewport` (`width=device-width, initial-scale=1, viewport-fit=cover`), meta `theme-color` per chiaro (`#E6E8E2`) e scuro (`#1C1613`) con `media`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png">`, `<script src="/theme-init.js"></script>` sincrono in `<head>` (nessuno script inline), `<div id="app"></div>`, `<script type="module" src="/src/main.js"></script>`, `<title>Bacco</title>`
- [x] T013 [P] Creare `public/theme-init.js`: in `try/catch` legge `localStorage.getItem('bacco-theme')` (`'light' | 'dark' | 'system'`, default `'system'`) e aggiunge la classe `dark` a `document.documentElement` se `'dark'` oppure se `'system'` e `matchMedia('(prefers-color-scheme: dark)').matches`
- [x] T014 [P] Creare `public/icons/icon.svg` (stencil "B" in `--c-gesso` su `--c-botte` con una tacca diagonale `--c-feccia`, area sicura per maskable) e generare con `docker compose run --rm dev npx pwa-assets-generator --preset minimal-2023 public/icons/icon.svg` le PNG 64/192/512, maskable 512 e apple-touch 180 in `public/icons/`
- [x] T015 Creare `src/assets/main.css`: `@import "tailwindcss";`, `@custom-variant dark (&:where(.dark, .dark *));`, variabili `--c-botte`, `--c-doga`, `--c-gesso`, `--c-cenere`, `--c-feccia`, `--c-luppolo`, `--c-rame` in `:root` (valori "calce") e in `.dark` (valori "cantina") da `ui-design.md`; `@theme` che espone `--color-botte: var(--c-botte)` ecc., `--font-display: "Big Shoulders Stencil Display"`, `--font-sans: "Atkinson Hyperlegible Next"`; base: `body` con sfondo/testo dai token, `:focus-visible { outline: 2px solid var(--c-rame); outline-offset: 2px }`, `@media (prefers-reduced-motion: reduce)` che azzera animazioni e transizioni

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: dati, validazione, router, layout e componenti condivisi da tutte le storie

**⚠️ CRITICAL**: nessuna user story può iniziare prima della fine di questa fase

- [x] T016 [P] Creare `src/lib/rating.js` che esporta `RATING_LEVELS` (array di 5 `{ value, label, description }` con i testi esatti della tabella in `data-model.md`) e `getRatingLevel(value)`
- [x] T017 [P] Creare `tests/unit/validate.test.js`: casi validi/non validi per ogni campo di `data-model.md` (nome vuoto o > 120, tipo fuori enum, annata < 1900 o futura, punteggio 0/6/non intero, `consumedAt` nel futuro oltre 5 min, note > 5000, barcode non numerico o fuori 8–14, `externalUrl` `http:`/`javascript:`/non valido, location fuori intervallo, trim dei testi, stringhe vuote facoltative → `null`)
- [x] T018 Creare `src/lib/validate.js` con `validateBottle(input, { now = new Date() } = {})` → `{ ok: true, value }` oppure `{ ok: false, errors: { campo: 'messaggio in italiano' } }`, normalizzando testi (trim, rimozione caratteri di controllo tranne `\n`), annata a intero, coordinate arrotondate a 5 decimali; esportare anche `isValidBarcode(code)` e `isHttpsUrl(url)`. I test di T017 devono passare
- [x] T019 Creare `src/db/db.js`: istanza `new Dexie('bacco')` con `db.version(1).stores({ bottles: 'id, consumedAt, updatedAt, type, barcode', photos: 'id, bottleId, [bottleId+order]', settings: 'key' })`, commento che spiega la regola delle migrazioni (mai rimuovere versioni, ogni nuova versione con `.upgrade()` e test); esportare `db` e `requestPersistentStorage()` (chiama `navigator.storage?.persist?.()` in try/catch)
- [x] T020 [P] Creare `src/db/settings.js` con `getSetting(key, fallback)` e `setSetting(key, value)` sulla tabella `settings`
- [x] T021 [P] Creare `tests/unit/bottles.test.js`: `createBottle` genera UUID, `createdAt` = `updatedAt`; `updateBottle` aggiorna `updatedAt` e rifiuta input non validi; `deleteBottle` rimuove anche le righe di `photos` con quel `bottleId`; `getBottle` restituisce `undefined` per id inesistente (usare `db.delete()`/`db.open()` tra i test)
- [x] T022 Creare `src/db/bottles.js` con `createBottle(input)`, `updateBottle(id, input)`, `deleteBottle(id)` (transazione `rw` su `bottles` + `photos`), `getBottle(id)`, `liveBottles()` (`liveQuery` ordinato per `consumedAt` discendente); tutte le scritture passano da `validateBottle`, gli errori di validazione sono lanciati come `ValidationError` con `errors`. I test di T021 devono passare
- [x] T023 [P] Creare `src/lib/theme.js` con `getThemePreference()`, `setThemePreference(pref)` (salva in `localStorage` `bacco-theme` in try/catch e nel setting `theme`), `applyTheme(pref)` (classe `dark` su `<html>`) e ascolto di `matchMedia('(prefers-color-scheme: dark)')` quando la preferenza è `system`
- [x] T024 [P] Creare `src/lib/format.js` con `formatDay(iso)`, `formatDateTime(iso)`, `formatMonthHeading(iso)` (es. "OTTOBRE 2026") usando `Intl.DateTimeFormat('it-IT')`, e `toDateTimeLocalValue(iso)` / `fromDateTimeLocalValue(str)` per gli input `datetime-local`
- [x] T025 [P] Creare `src/composables/useOnline.js` (ref `online` da `navigator.onLine` più eventi `online`/`offline`, listener rimossi allo smontaggio)
- [x] T026 [P] Creare `src/composables/useBanner.js`: stato condiviso a livello di modulo con **un solo banner visibile alla volta**, `showBanner({ id, message, actions: [{ label, onClick }], tone: 'info' | 'error', timeout, priority })`, `dismissBanner(id)`; banner informativi con timeout di default 4 s, quelli con azioni senza timeout; `priority` numerica (più alta = più importante): se ne arriva uno di priorità maggiore, quello visibile torna in coda. Valori: errori 100, promemoria backup 50, aggiornamento app 40, conferme ("Bottiglia salvata") 30, installazione 10
- [x] T027 [P] Creare `src/components/AppBanner.vue`: legge `useBanner`, si posiziona sopra la barra di navigazione, `role="status"` (`role="alert"` per `tone: 'error'`), pulsanti azione con altezza ≥ 44 px, pulsante "Chiudi" con etichetta accessibile
- [x] T028 [P] Creare `src/components/ConfirmDialog.vue` basato su `<dialog>` nativo (`showModal()`), props `title`, `message`, `confirmLabel`, `danger`; emette `confirm`/`cancel`; focus iniziale su "Annulla"; chiusura con Esc = annulla
- [x] T029 [P] Creare `src/components/BottomNav.vue`: `<nav aria-label="Principale">` con `RouterLink` a Registro (`/`), Mappa (`/mappa`), Impostazioni (`/impostazioni`), `aria-current="page"` sulla voce attiva, target ≥ 44 px, padding `env(safe-area-inset-bottom)`
- [x] T030 [P] Creare viste segnaposto, ciascuna con il solo titolo in stencil: `src/views/RegistryView.vue`, `src/views/BottleFormView.vue`, `src/views/BottleDetailView.vue`, `src/views/MapView.vue`, `src/views/SettingsView.vue`
- [x] T031 Creare `src/router.js` (`createWebHistory`) con le route `/` (RegistryView), `/nuova` (BottleFormView), `/bottiglia/:id` (BottleDetailView), `/bottiglia/:id/modifica` (BottleFormView), `/mappa` (MapView, import dinamico), `/impostazioni` (SettingsView), `/:pathMatch(.*)*` → redirect a `/`; `scrollBehavior` che torna in cima
- [x] T032 Creare `src/App.vue`: header con "BACCO" in stencil, `<main>` con `<RouterView>` (transizione in dissolvenza 150 ms), `AppBanner`, `BottomNav`; layout a colonna singola, larghezza max 40 rem centrata sugli schermi grandi
- [x] T033 Creare `src/main.js`: import di `@fontsource/big-shoulders-stencil-display/latin-700`, `@fontsource/atkinson-hyperlegible-next/latin-400`, `@fontsource/atkinson-hyperlegible-next/latin-700` (senza estensione `.css`: l'export map del pacchetto la aggiunge da sé, e con l'estensione esplicita Rollup non risolve l'import) e `./assets/main.css`; `applyTheme(getThemePreference())`; `requestPersistentStorage()`; imposta il setting `firstUseAt` se assente; monta `App` con il router

**Checkpoint**: `docker compose up dev` mostra il guscio dell'app con navigazione, temi chiaro/scuro funzionanti e lint/test verdi

---

## Phase 3: User Story 1 - Registrare una bottiglia in pochi tap (Priority: P1) 🎯 MVP

**Goal**: registrare una bottiglia con nome, tipo e punteggio in ≤ 5 interazioni, anche offline

**Independent Test**: offline, registrare una bottiglia con i soli campi obbligatori, chiudere e
riaprire l'app: la bottiglia è in cima al registro

- [x] T034 [P] [US1] Creare `src/components/TallyRating.vue` (firma di `ui-design.md`): `role="radiogroup"` con 5 `<input type="radio">` nativi visivamente nascosti (nome accessibile "N – Etichetta"), SVG con 4 tratti verticali e il 5° in diagonale che li attraversa, tratti accesi fino al valore scelto (colore `--c-gesso`, spenti `--c-cenere` al 30%), animazione `stroke-dashoffset` 180 ms solo senza reduced motion; sotto mostra "N · Etichetta" e la descrizione da `RATING_LEVELS`; `v-model` numerico; prop `invalid` + `aria-describedby` per l'errore
- [x] T035 [P] [US1] Creare `src/components/TallyMark.vue`: versione piccola di sola lettura (prop `value`, `size`), `role="img"` con `aria-label="Punteggio N su 5: Etichetta"`
- [x] T036 [P] [US1] Creare `src/components/TypeToggle.vue`: segmented control "Vino | Birra" con radio nativi, `v-model` `'wine' | 'beer'`, colore del segmento selezionato `--c-feccia` (vino) / `--c-luppolo` (birra)
- [x] T037 [P] [US1] Creare `src/components/BottleRow.vue`: `RouterLink` a `/bottiglia/:id`, barretta verticale colorata per tipo **più l'etichetta testuale "VINO"/"BIRRA"** (maiuscoletto `--c-cenere`; il colore accompagna il testo, non lo sostituisce), nome (Atkinson bold), "VINO · produttore · annata" (parti assenti omesse), `TallyMark` piccolo, giorno con `formatDay`; altezza ≥ 44 px
- [x] T038 [US1] Implementare `src/views/BottleFormView.vue` in modalità creazione (`/nuova`): titolo "NUOVA BOTTIGLIA", pulsante ✕ (torna indietro), campi obbligatori Nome (`autocomplete="off"`, `enterkeyhint="next"`), `TypeToggle`, `TallyRating`; sezione `<details>` "Aggiungi dettagli" chiusa con Produttore, Annata (`inputmode="numeric"`), Data e ora (`datetime-local`, default adesso); pulsante "Salva bottiglia" fisso in basso; al salvataggio `createBottle`, errori di validazione mostrati sotto ogni campo con `aria-invalid` e focus sul primo errore; dopo il salvataggio naviga a `/` e mostra il banner "Bottiglia salvata"
- [x] T039 [US1] Implementare `src/views/RegistryView.vue` (prima versione): lista da `liveBottles()` con `BottleRow`, stato vuoto "Nessuna bottiglia ancora. Registra la prima: bastano nome, tipo e punteggio." con pulsante, e pulsante ampio "+ Nuova bottiglia" fisso sopra la barra di navigazione che porta a `/nuova`

**Checkpoint**: US1 completa e verificabile da sola (quickstart: scenario US1)

---

## Phase 4: User Story 2 - Consultare, modificare ed eliminare il registro (Priority: P2)

**Goal**: lista per mese con ricerca e filtro, scheda, modifica ed eliminazione

**Independent Test**: con alcune bottiglie, cercarne una per nome, cambiarle il punteggio,
eliminarne un'altra; lista e scheda riflettono le modifiche

- [x] T040 [P] [US2] Creare `tests/unit/search.test.js`: `normalizeText` (minuscolo, senza accenti: "Nebbiolo d'Alba" ↔ "nebbiolo d alba", "Peró" ↔ "pero"), `filterBottles` per testo su nome/produttore e per tipo, `groupByMonth` in ordine discendente, e 1.000 bottiglie filtrate in < 50 ms
- [x] T041 [US2] Creare `src/lib/search.js` con `normalizeText`, `filterBottles(list, { query, type })` e `groupByMonth(list)` (`[{ key, heading, items }]`). I test di T040 devono passare
- [x] T042 [US2] Aggiungere a `src/db/bottles.js` la funzione `getSuggestions()` → `{ names: string[], producers: string[] }` (valori distinti, ordinati per frequenza)
- [x] T043 [US2] Estendere `src/views/RegistryView.vue`: campo di ricerca (`type="search"`, label "Cerca nome o produttore"), chip "Tutti / Vino / Birra" (radio), raggruppamento per mese con intestazioni `formatMonthHeading` in stencil, messaggio "Nessuna bottiglia corrisponde alla ricerca." con azione "Azzera filtri"
- [x] T044 [US2] Implementare `src/views/BottleDetailView.vue` (prima versione): nome, produttore, annata grande in stencil, tipo, `TallyMark` + etichetta e descrizione del livello, data di consumo, note come testo semplice (`white-space: pre-line`); azioni "Modifica" (→ `/bottiglia/:id/modifica`) ed "Elimina" (`ConfirmDialog` "Eliminare questa bottiglia? Anche le foto verranno eliminate." → `deleteBottle` → `/` + banner "Bottiglia eliminata"); id inesistente → messaggio "Bottiglia non trovata" con link al registro
- [x] T045 [US2] Estendere `src/views/BottleFormView.vue` con la modalità modifica (`/bottiglia/:id/modifica`): titolo "MODIFICA BOTTIGLIA", carica il record, apre "Aggiungi dettagli" se ci sono campi facoltativi compilati, salva con `updateBottle`, poi torna alla scheda con il banner "Modifiche salvate"
- [x] T046 [US2] Aggiungere a `src/views/BottleFormView.vue` i suggerimenti (FR-007) con `<datalist>` per Nome e Produttore alimentati da `getSuggestions()`

**Checkpoint**: US1 + US2 funzionanti in modo indipendente

---

## Phase 5: User Story 3 - Arricchire con foto e note (Priority: P3)

**Goal**: più foto per bottiglia (fotocamera o galleria) e note con elenchi puntati

**Independent Test**: offline, aggiungere due foto e una nota con elenco puntato; dopo il riavvio
la scheda mostra foto ed elenco

- [x] T047 [P] [US3] Creare `tests/unit/notes.test.js`: righe con "- " consecutive → un elenco; testo libero → paragrafi separati da righe vuote; `<script>` e `**x**` restano testo letterale; nota vuota → `[]`
- [x] T048 [US3] Creare `src/lib/notes.js` con `parseNotes(text)` → `[{ type: 'p', text } | { type: 'ul', items: string[] }]`. I test di T047 devono passare
- [x] T049 [P] [US3] Creare `src/components/NotesView.vue` che renderizza i blocchi di `parseNotes` con `<p>` e `<ul><li>` solo tramite interpolazione `{{ }}`
- [x] T050 [P] [US3] Creare `src/lib/image.js` con `resizeImage(file, { maxSide = 1600, quality = 0.8 })` e `makeThumbnail(blob, { maxSide = 320 })`: `createImageBitmap(file, { imageOrientation: 'from-image' })`, canvas, `toBlob('image/jpeg', quality)` (la ricodifica elimina l'EXIF); errore chiaro se il file non è un'immagine
- [x] T051 [US3] Creare `src/db/photos.js` con `listPhotos(bottleId)` (ordinate per `order`), `photoUrl(blob)` / `revokePhotoUrl(url)`; estendere `createBottle(input, { addPhotos })` e `updateBottle(id, input, { addPhotos, removePhotoIds })` in `src/db/bottles.js` per scrivere bottiglia e foto (`{ id, bottleId, order, blob, thumb, createdAt }`) in un'unica transazione `rw` su `bottles` + `photos`, aggiornando `updatedAt`; aggiungere i casi di test in `tests/unit/bottles.test.js` (foto aggiunte e rimosse, transazione annullata se la validazione fallisce)
- [x] T052 [US3] Creare `src/components/PhotoPicker.vue`: pulsanti "Scatta foto" (`<input type="file" accept="image/*" capture="environment">`) e "Scegli dalla galleria" (`accept="image/*" multiple`), elaborazione con `resizeImage` + `makeThumbnail` e indicatore "Preparazione foto…", anteprime con pulsante "Rimuovi foto" (etichetta accessibile), `v-model` della lista `{ id?, blob, thumb, url, isNew }`, URL revocati allo smontaggio
- [x] T053 [US3] Integrare in `src/views/BottleFormView.vue` (sezione "Aggiungi dettagli") `PhotoPicker` e la textarea Note (`maxlength="5000"`, contatore, aiuto "Inizia una riga con «- » per un elenco"); passare foto aggiunte/rimosse a `createBottle`/`updateBottle`; `QuotaExceededError` → banner di errore "Spazio esaurito sul dispositivo: la bottiglia non è stata salvata. Elimina qualche foto o fai un backup." senza perdere i dati del modulo
- [x] T054 [US3] Estendere `src/views/BottleDetailView.vue`: galleria in alto con scroll-snap orizzontale (immagini piene da `photos.blob`, `alt` "Foto N di M di <nome>"), `NotesView` al posto del testo semplice, URL revocati allo smontaggio; aggiungere la miniatura della copertina in `src/components/BottleRow.vue` se presente (caricata dalla tabella `photos`, `order` 0)

**Checkpoint**: US3 funzionante; foto senza EXIF, note sicure

---

## Phase 6: User Story 8 - Compilazione rapida da codice a barre (Priority: P3)

**Goal**: scansione del codice, precompilazione dal registro (offline) o da Open Food Facts (online)

**Independent Test**: online, scansionare un codice presente su Open Food Facts → campi
precompilati; offline, scansionare il codice di una bottiglia già registrata → campi
precompilati dal registro

- [x] T055 [P] [US8] Creare `tests/unit/openFoodFacts.test.js` con `fetch` simulato: mappatura di `contracts/openfoodfacts.md` (`product_name_it` prioritario, primo brand prima della virgola, tag `en:wines`/`en:red-wines` → `wine`, `en:beers` → `beer`, altrimenti nessun tipo, troncamento a 120, rimozione caratteri di controllo), esiti `found`, `not_found` (status 0 e HTTP 404), `error` (HTTP 500, JSON non valido, timeout), `offline` senza chiamare `fetch`; codice non valido → nessuna richiesta
- [x] T056 [US8] Creare `src/lib/openFoodFacts.js` con `lookupBarcode(code, { fetchImpl = fetch, timeoutMs = 6000, online = navigator.onLine })` → `{ status: 'found' | 'not_found' | 'offline' | 'error', fields? }` (URL e campi esatti del contratto, `credentials: 'omit'`, `AbortController`) e `mapProduct(product)`. I test di T055 devono passare
- [x] T057 [US8] Aggiungere a `src/db/bottles.js` la funzione `findLatestByBarcode(code)` (indice `barcode`, record con `consumedAt` più recente) con un caso in `tests/unit/bottles.test.js`
- [x] T058 [P] [US8] Prima verificare in `node_modules/barcode-detector/package.json` e nei suoi `.d.ts` il nome della funzione che configura il modulo e il percorso esportato del `.wasm` di `zxing-wasm`, adeguando gli import se diversi da `prepareZXingModule` / `zxing-wasm/reader/zxing_reader.wasm`. Poi creare `src/lib/barcode.js` con `createBarcodeDetector()`: se `'BarcodeDetector' in window` e `getSupportedFormats()` include `ean_13`, usa quello nativo; altrimenti `import('barcode-detector/ponyfill')`, chiama `prepareZXingModule` con `overrides.locateFile` che restituisce l'URL locale ottenuto da `import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'` (mai la CDN predefinita); formati `['ean_13', 'ean_8', 'upc_a', 'upc_e']`. Verificare in `dist/` che il `.wasm` sia emesso e presente nel manifest di precache
- [x] T059 [US8] Creare `src/components/BarcodeScanner.vue` in un `<dialog>`: `getUserMedia({ video: { facingMode: 'environment' }, audio: false })`, `<video playsinline muted>`, ciclo di rilevamento ogni 200 ms con `setTimeout`, alla prima lettura valida (`isValidBarcode`) emette `detected` e ferma tutte le tracce; ferma le tracce anche su chiusura/smontaggio; campo "Inserisci il codice a mano" (`inputmode="numeric"`) sempre disponibile; permesso negato o fotocamera assente → messaggio "Fotocamera non disponibile: inserisci il codice a mano."
- [x] T060 [US8] Integrare in `src/views/BottleFormView.vue`: pulsante "Scansiona codice" in alto; al rilevamento salva il codice nel modulo, poi `findLatestByBarcode` → precompila nome, produttore, tipo e annata con etichetta "dal tuo registro"; altrimenti `lookupBarcode` → precompila **solo i campi vuoti** con etichetta "da Open Food Facts"; le etichette spariscono quando l'utente modifica il campo; banner per `not_found`/`offline`/`error` con i testi di `contracts/openfoodfacts.md`; campo "Codice a barre" modificabile nella sezione "Aggiungi dettagli"
- [x] T061 [US8] Mostrare il codice a barre in `src/views/BottleDetailView.vue` (se presente)

**Checkpoint**: US8 funzionante su Android (nativo) e iPhone (ponyfill), anche offline per i codici già registrati

---

## Phase 7: User Story 4 - Posizione opzionale del consumo (Priority: P4)

**Goal**: salvare il luogo solo su richiesta esplicita e rivederlo nella pagina Mappa

**Independent Test**: una bottiglia con posizione e una senza; permesso negato → salvataggio
senza posizione; Mappa online con segnaposto, offline con messaggio ed elenco

- [x] T062 [P] [US4] Creare `src/lib/geo.js` con `getCurrentLocation()` → `{ lat, lon, accuracy }` (arrotondati a 5 decimali, accuracy intera) usando `navigator.geolocation.getCurrentPosition` con `{ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }`; errori mappati a `'denied' | 'unavailable' | 'timeout' | 'unsupported'`
- [x] T063 [US4] Integrare in `src/views/BottleFormView.vue` (sezione "Aggiungi dettagli"): pulsante "Aggiungi posizione" (nessuna richiesta di posizione prima del tocco), stato "Ricerca posizione…", esito "Posizione aggiunta (± N m)" con pulsante "Rimuovi posizione"; errori → messaggio non bloccante "Posizione non disponibile: la bottiglia verrà salvata senza." ; il valore viaggia in `location` verso `createBottle`/`updateBottle`
- [x] T064 [US4] Estendere `src/views/BottleDetailView.vue`: se c'è `location`, riga "Luogo" con coordinate e link "Vedi sulla mappa" → `/mappa?bottiglia=<id>`
- [x] T065 [US4] Implementare `src/views/MapView.vue`: con `useOnline` false → "La mappa ha bisogno della connessione. Ecco i tuoi luoghi:" + elenco (nome, data, `RouterLink` alla scheda) delle bottiglie con posizione; online → `await import('leaflet')` e `import('leaflet/dist/leaflet.css')`, mappa a tutta altezza, tile `https://tile.openstreetmap.org/{z}/{x}/{y}.png` con attribuzione "© OpenStreetMap contributors" e `maxZoom: 19`, un `L.circleMarker` per bottiglia (colore `--c-feccia` vino / `--c-luppolo` birra, nessuna immagine marker), popup costruito con elementi DOM e `textContent` (nome, tipo in testo "Vino"/"Birra" e pulsante "Apri scheda" che usa `router.push`), legenda fissa "● Vino ● Birra" sopra la mappa, `fitBounds` su tutti i punti, `?bottiglia=<id>` centra e apre quel popup; stato vuoto "Nessuna bottiglia con posizione."; `map.remove()` allo smontaggio; passaggio online/offline gestito in modo reattivo

**Checkpoint**: US4 funzionante; nessuna richiesta di posizione senza un tocco esplicito

---

## Phase 8: User Story 5 - Backup, ripristino e controllo dei dati (Priority: P5)

**Goal**: export JSON/CSV, importazione con unione, promemoria a 30 giorni, eliminazione totale

**Independent Test**: esportare JSON, eliminare tutti i dati, importare: registro, foto, note e
posizioni identici; reimportare un backup con un record più recente → conteggi corretti

- [x] T066 [P] [US5] Creare `tests/unit/exportCsv.test.js`: BOM iniziale, separatore `;`, fine riga `\r\n`, colonne e ordine di `contracts/csv-format.md`, quoting di `;`, `"` e a capo, prefisso `'` per testi che iniziano con `=`, `+`, `-`, `@`, tab o CR, celle vuote per campi `null`, `numero_foto` corretto
- [x] T067 [P] [US5] Creare `tests/unit/backup.test.js` (con `fake-indexeddb` e `makeThumbnail` simulato): export→svuota→import ripristina tutto (round trip, SC-004); file non JSON, `app` diverso, `formatVersion` 2 → errori con i messaggi del contratto e nessuna scrittura; un record non valido a metà file → nessuna scrittura (transazione annullata); unione: nuovo → aggiunto, `updatedAt` del backup più recente → bottiglia e foto sostituite, più vecchio o uguale → invariato; riepilogo `{ added, updated, unchanged }`; `lastExportAt` invariato dopo l'import
- [x] T068 [P] [US5] Creare `src/lib/download.js` con `downloadBlob(blob, filename)` (link temporaneo con `URL.createObjectURL`, poi `revokeObjectURL`) e `todayStamp()` (`YYYY-MM-DD` locale)
- [x] T069 [US5] Creare `src/backup/exportCsv.js` con `buildCsv(bottles, photoCounts)` (funzione pura) e `exportCsv()` (legge DB → `downloadBlob` `bacco-registro-YYYY-MM-DD.csv`). I test di T066 devono passare
- [x] T070 [US5] Creare `src/backup/exportJson.js` con `buildBackupBlob()`: costruisce `new Blob([...parti], { type: 'application/json' })` con intestazione `{"app":"bacco","formatVersion":1,"exportedAt":…,"bottles":[`, una parte per bottiglia (`JSON.stringify` della bottiglia con `photos` contenenti `data` in base64 dalla foto piena, senza miniatura; base64 con `new Uint8Array(await blob.arrayBuffer())` e `btoa` su blocchi da 32 KB, mai `FileReader` che in Node non esiste) e chiusura `]}`; `exportJson()` scarica `bacco-backup-YYYY-MM-DD.json` e imposta il setting `lastExportAt`
- [x] T071 [US5] Creare `src/backup/importJson.js` con `importBackup(file, { makeThumbnail })`: dimensione > 300 MB → errore "Backup troppo grande per questo dispositivo"; `JSON.parse` in try/catch; controlli `app`/`formatVersion`; validazione completa di ogni bottiglia (`validateBottle` + `id` UUID + `createdAt`/`updatedAt` ISO) e di ogni foto (`mime` `image/jpeg`, base64 decodificabile con `Uint8Array.from(atob(data), c => c.charCodeAt(0))`) **prima** di scrivere, con messaggio che indica posizione e campo; generazione miniature; unione in un'unica transazione `rw` su `bottles` + `photos` secondo `contracts/backup-format.md`; restituisce `{ added, updated, unchanged }`. I test di T067 devono passare
- [x] T072 [P] [US5] Creare `tests/unit/backupReminder.test.js` e `src/lib/backupReminder.js` con la funzione pura `shouldShowBackupReminder({ bottleCount, lastExportAt, firstUseAt, snoozedAt, now })` secondo `data-model.md` (casi: registro vuoto, mai esportato e primo uso > 30 giorni, esportato 29 vs 31 giorni fa, rinviato di recente)
- [x] T073 [US5] Implementare in `src/views/SettingsView.vue` la sezione "Backup": data dell'ultimo backup ("Mai" se assente), pulsanti "Esporta JSON" ("Backup esportato") ed "Esporta CSV" ("Registro esportato"), "Importa backup" (`<input type="file" accept="application/json,.json">`) con indicatore di avanzamento e banner "Importate: N nuove, M aggiornate, K invariate." o l'errore; zona separata "Elimina tutti i dati" con doppia conferma (`ConfirmDialog` poi seconda conferma "Questa azione non si può annullare. Elimina tutto?") → svuota le tabelle `bottles`, `photos`, `settings` e `localStorage`, poi ricarica l'app
- [x] T074 [US5] Creare `src/composables/useBackupReminder.js` e usarlo in `src/App.vue`: all'avvio valuta `shouldShowBackupReminder` e mostra il banner "Ultimo backup N giorni fa." (oppure "Non hai ancora fatto un backup.") con azioni "Esporta ora" (`exportJson`) e "Più tardi" (imposta `backupReminderSnoozedAt`); `priority: 50`

**Checkpoint**: US5 funzionante; round trip completo verificato

---

## Phase 9: User Story 6 - Condividere una bottiglia con una card (Priority: P6)

**Goal**: card PNG 1080×1920 in stile "storie", condivisa dal menu del dispositivo o scaricata

**Independent Test**: card per una bottiglia con foto e una senza; condivisione o download;
link esterno nel testo solo se presente

- [x] T075 [P] [US6] Creare `tests/unit/shareText.test.js` e `src/lib/shareText.js` con `notesExcerpt(notes, max = 140)` (elenchi trasformati in testo continuo separato da virgole, taglio a parola con "…"), `starsFor(rating)` ("★★★★☆"), `shareText(bottle)` (`"<nome> — <externalUrl>"` oppure solo il nome) e `cardFileName(name)` (`bacco-<nome-normalizzato>.png`)
- [x] T076 [US6] Aggiungere il campo "Link alla scheda tecnica" (`type="url"`, `inputmode="url"`, placeholder `https://…`, errore se non `https:`) nella sezione "Aggiungi dettagli" di `src/views/BottleFormView.vue`; in `src/views/BottleDetailView.vue` mostrarlo come link con `target="_blank" rel="noopener noreferrer"` (Bacco non lo apre da solo)
- [x] T077 [US6] Creare `src/lib/shareCard.js` con `renderShareCard(bottle, coverBlob)` → `Blob` PNG 1080×1920 secondo `contracts/share-card.md`: attende `document.fonts.load` per i due font, sempre palette "cantina", foto di copertina in modalità cover con sfumatura scura verso il basso oppure sfondo tematico (vino/birra) con filigrana a tacche, "HO BEVUTO", nome in stencil con riduzione automatica 120→72 px su massimo 3 righe, "produttore · annata", stelle + "N/5", etichetta del livello, estratto note, "BACCO" in basso a destra, margini 80 px; nessun link, QR o posizione nell'immagine. Aggiungere `shareOrDownload(blob, bottle)`: `navigator.canShare({ files })` → `navigator.share({ files, text: shareText(bottle) })`, `AbortError` ignorato, altrimenti `downloadBlob`
- [x] T078 [US6] Creare `src/components/ShareCardDialog.vue` (`<dialog>`): genera la card all'apertura con indicatore "Preparazione della card…", anteprima `<img alt="Anteprima della card da condividere">`, pulsanti "Condividi" e "Chiudi", URL revocati alla chiusura; aggiungere l'azione "Condividi" in `src/views/BottleDetailView.vue` che lo apre

**Checkpoint**: US6 funzionante; card generata in < 3 s

---

## Phase 10: User Story 7 - Installazione e tema (Priority: P7)

**Goal**: invito all'installazione non invasivo, selettore tema, avviso di aggiornamento dell'app

**Independent Test**: da browser non installato compare l'invito (istruzioni su iOS); il tema
scelto persiste al riavvio senza sfarfallio; installata, l'app non mostra l'invito

- [x] T079 [P] [US7] Creare `src/lib/install.js`: `captureInstallPrompt()` (ascolta `beforeinstallprompt`, `preventDefault()`, conserva l'evento) da chiamare in `src/main.js` prima del mount; `isStandalone()` (`matchMedia('(display-mode: standalone)')` o `navigator.standalone`); `isIOS()`; `canPromptInstall()`; `promptInstall()`; `shouldShowInstallInvite({ dismissedAt, now })` (non installata e nessun rifiuto negli ultimi 30 giorni)
- [x] T080 [US7] Mostrare l'invito in `src/App.vue` tramite `useBanner` con `priority: 10`: con `canPromptInstall()` → "Aggiungi Bacco alla schermata Home per aprirlo con un tocco." con [Installa] [Non ora]; su iOS → "Per installare Bacco tocca Condividi, poi «Aggiungi alla schermata Home». Installata, Bacco protegge meglio i tuoi dati: Safari può cancellare i dati dei siti non usati da 7 giorni." con [Ho capito]; "Non ora"/"Ho capito" impostano `installPromptDismissedAt`
- [x] T081 [US7] Implementare in `src/views/SettingsView.vue` la sezione "Tema" con un gruppo di radio "Sistema / Chiaro / Scuro" collegato a `getThemePreference`/`setThemePreference`/`applyTheme`, applicato subito
- [x] T082 [US7] Creare `src/composables/usePwaUpdate.js` con `useRegisterSW` da `virtual:pwa-register/vue` e usarlo in `src/App.vue`: quando `needRefresh` è vero mostra il banner "Nuova versione disponibile." con [Aggiorna] (`updateServiceWorker(true)`, `priority: 40`); quando `offlineReady` diventa vero mostra "Bacco è pronto per funzionare offline."

**Checkpoint**: tutte le user story funzionanti

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: quality gate della costituzione e criteri di successo

- [ ] T083 [P] Verifica accessibilità (WCAG 2.1 AA, SC-007): misurare con uno strumento di contrasto tutte le coppie testo/sfondo dei token di `src/assets/main.css` in entrambi i temi e correggere i valori sotto 4,5:1 (3:1 per elementi grafici), aggiornando anche la tabella in `specs/001-bottle-logging/ui-design.md`; controllare navigazione da tastiera, focus visibile, target ≥ 44 px, `aria-live` dei banner e reduced motion in tutte le viste in `src/views/`
- [ ] T084 [P] Verifica sicurezza: `grep -rn "v-html\|innerHTML" src/` senza risultati (tranne commenti), tutti i link esterni con `rel="noopener noreferrer"`, `docker compose run --rm dev npm audit --audit-level=high` senza vulnerabilità alte/critiche, nessun errore CSP in console sul servizio `web` (`docker/nginx.conf`)
- [ ] T085 [P] Creare `src/dev/seed.js` (importato solo quando `import.meta.env.DEV`, esposto come `window.__baccoSeed(n)`) che crea `n` bottiglie fittizie senza foto; con 1.000 bottiglie verificare che registro e ricerca rispondano in < 1 s sul dispositivo di riferimento (SC-005); verificare che il file non finisca nella build di produzione
- [x] T086 Eseguire nel container `npm run lint`, `npm test` e `npm run build` senza errori; controllare che `dist/sw.js` precachei font `.woff2`, `.wasm` e icone
- [ ] T087 Validazione completa da `specs/001-bottle-logging/quickstart.md` sul servizio `web`: verifica offline (incluso l'iPhone in modalità aereo con scansione e font corretti), controllo rete (solo `tile.openstreetmap.org` in Mappa e `world.openfoodfacts.org` dopo la scansione di un codice nuovo, nessun dato del registro inviato), mobile 320/390 px in entrambi i temi, round trip del backup e tutti gli scenari US1–US8 della tabella; misurare sul dispositivo di riferimento (iPhone 12 o Pixel 6a, o equivalenti) la generazione della card < 3 s (SC-006) e le interazioni con la scansione ≤ 3 oltre al punteggio (SC-003a); verificare che tutti i testi dell'interfaccia siano in italiano (FR-023)

---

## Phase 12: Revisione UI/UX (feedback utente 2026-10-07)

**Purpose**: applicare la revisione dopo la prima prova (spec, sessione "revisione UI/UX";
`ui-design.md` aggiornato con `/frontend-design`)

- [x] T088 [P] Aggiornare `src/lib/validate.js` e `tests/unit/validate.test.js` con i campi `subtype` (≤ 40), `aromas`, `taste`, `pairing` (≤ 500, default `''`) e aggiungere `isValidGtinChecksum(code)` (cifra di controllo GTIN-8/12/13/14) con i suoi test
- [x] T089 [P] Creare `src/lib/subtypes.js` con `WINE_SUBTYPES` (Rosso, Bianco, Rosato, Bollicine, Passito) e `BEER_SUBTYPES` (Lager, Pils, IPA, Ale, Dubbel, Tripel, Bock, Stout, Porter, Wheat, Sour) e `subtypesFor(type)`
- [x] T090 [P] Estendere `src/lib/openFoodFacts.js` e `tests/unit/openFoodFacts.test.js` con la mappatura della sottocategoria (contracts/openfoodfacts.md)
- [x] T091 [P] Estendere `src/backup/exportCsv.js` e `tests/unit/exportCsv.test.js` con le colonne `sottocategoria`, `profumi`, `sapore`, `abbinamento`; verificare in `tests/unit/backup.test.js` che i nuovi campi sopravvivano al round trip e che un backup senza di essi sia accettato
- [x] T092 Sostituire `TallyRating.vue`/`TallyMark.vue` con `src/components/BottleRating.vue` (5 bottiglie a tema, radio nativi, bersagli ≥ 44 px, liquido che sale con reduced-motion rispettato) e `src/components/BottleRatingMark.vue` (sola lettura, `role="img"`), con le icone in `src/components/BottleIcon.vue`; aggiornare `BottleRow.vue` e `BottleDetailView.vue`
- [x] T093 Creare `src/composables/useCamera.js` (avvio/stop fotocamera posteriore) e `src/components/CameraCapture.vue` (fotocamera a tutto schermo con pulsante di scatto, ripiego su scelta file); far aprire la fotocamera a "Scatta foto" in `PhotoPicker.vue`
- [x] T094 Rifare `src/components/BarcodeScanner.vue` a tutto schermo con cornice di mira (apertura diretta della fotocamera, nessun campo manuale interno) e creare `src/components/BarcodeField.vue` (input + icona fotocamera) e `src/components/LookupStatus.vue` (riquadro di stato FR-027a)
- [x] T095 Riorganizzare `src/views/BottleFormView.vue` senza fisarmonica (gruppi: Foto, Codice, Bottiglia, Punteggio, Degustazione, Quando e dove, Link; Foto spostata in cima su richiesta del 2026-10-07), con sottocategoria a chip + "Altro", campi profumi/sapore/abbinamento, ricerca automatica su codice digitato valido e stato visibile
- [x] T096 Mostrare sottocategoria, profumi, sapore e abbinamento in `src/views/BottleDetailView.vue` e la sottocategoria in `src/components/BottleRow.vue`
- [x] T097 [P] Aggiornare `src/lib/shareText.js` (+ test) e `src/lib/shareCard.js` con sottocategoria e piè di pagina "BACCO · bacco.smzstudio.it"; il testo condiviso termina con "Registrato con Bacco · https://bacco.smzstudio.it"
- [x] T098 [P] Ridisegnare `public/icons/icon.svg` ("cin cin": calice di vino e boccale di birra) e rigenerare le PNG con `pwa-assets-generator`
- [x] T099 Eseguire nel container lint, test e build

---

## Phase 13: Permessi di fotocamera e posizione (feedback 2026-10-07)

- [x] T100 [P] Creare `src/lib/permissions.js` (piattaforma/browser, stato dei permessi via Permissions API, spiegazione degli errori di fotocamera e posizione con passi per macOS, iOS, Android) e `tests/unit/permissions.test.js`
- [x] T101 Creare `src/components/PermissionHelp.vue` (motivo, passi, "Riprova") e usarlo in `useCamera.js`, `CameraCapture.vue`, `BarcodeScanner.vue` e per la posizione in `BottleFormView.vue` (al posto del banner)
- [x] T102 Aggiungere la sezione "Permessi" in `src/views/SettingsView.vue` (stato e richiesta di fotocamera e posizione)
- [x] T103 Verificare con screenshot (permessi concessi e negati) e lint/test/build nel container

---

## Phase 14: Analisi organolettica e gradazione (feedback 2026-10-07)

- [x] T104 Sostituire `aromas`/`taste` con `tasting` (≤ 1000) e aggiungere `abv` (0–70, al decimo) in `src/lib/validate.js` (unione dei vecchi campi anche in validazione, per i backup) + test
- [x] T105 Aggiungere la migrazione `db.version(2)` in `src/db/db.js` che unisce `aromas`/`taste` in `tasting`, con test in `tests/unit/migrations.test.js`
- [x] T106 [P] Gradazione da Open Food Facts (`src/lib/openFoodFacts.js`, campo `nutriments`) e dal registro (`src/lib/lookupFill.js`) + test
- [x] T107 [P] CSV (`gradazione`, `analisi_organolettica`), card (gradazione nel sottotitolo) e test
- [x] T108 Aggiornare `BottleFormView.vue` (campo "Analisi organolettica personale" e "Gradazione") e `BottleDetailView.vue`; lint, test, build e screenshot

---

## Phase 15: Denominazione del vino (feedback 2026-10-07)

- [x] T109 Aggiungere `appellation` (DOCG, DOC, IGT, IGP, solo vino) in `src/lib/subtypes.js`, `src/lib/validate.js`, `src/lib/lookupFill.js`, `src/lib/openFoodFacts.js` (`labels_tags`) con i test
- [x] T110 CSV (`denominazione`), card, lista, scheda e modulo (chip "Denominazione" visibili solo per il vino); lint, test, build e screenshot

---

## Phase 16: Filtri per anno e mese (feedback 2026-10-07)

- [x] T111 Estendere `src/lib/search.js` (`filterBottles` con `year`/`month`, `availableYears`, `availableMonths`) e `tests/unit/search.test.js`
- [x] T112 Aggiungere i filtri Anno e Mese in `src/views/RegistryView.vue` (inclusi in "Azzera filtri"); togliere il titolo "Registro" a video (resta per i lettori di schermo) e dare icone alla barra di navigazione (Home, Mappa, Impostazioni); lint, test, build e screenshot

---

## Phase 17: Revisione UX della home (feedback 2026-10-07, `/frontend-design`)

- [x] T113 Rifare `src/views/RegistryView.vue`: ricerca con icona e cancella, filtri (tipo, anno, mese) in un'unica riga di chip scorrevole, riepilogo dei conteggi con "Azzera filtri", intestazioni dei mesi fisse con conteggio, pulsante "Nuova bottiglia" flottante, stato vuoto con l'icona; tolto il giorno dalle righe
- [x] T114 Rifare `src/components/BottleRow.vue` con tessera (foto o sagoma della bottiglia nel colore del tipo); lint, test, build e screenshot

---

## Phase 18: Barra di navigazione con + centrale (feedback 2026-10-07)

- [x] T115 `src/components/BottomNav.vue`: Home e Mappa ai lati, pulsante quadrato arrotondato "+" al centro rialzato sul bordo (Nuova bottiglia, nascosto nel modulo); Impostazioni come ingranaggio nell'intestazione (`src/App.vue`); rimosso il pulsante flottante dal registro; screenshot WebKit e Chromium
- [X] T116 Dettaglio e modifica in un pannello modale sopra la pagina corrente (`meta.modal` in src/router.js, src/components/RouteSheet.vue, src/composables/useSheet.js, src/App.vue con pagina sotto `inert`); dialoghi nativi Condividi ed Elimina centrati (`dialog:modal { margin: auto }` in src/assets/main.css)
- [X] T117 Pulsante Condividi su ogni riga del registro (`src/components/BottleRow.vue`, evento `share`; un solo `ShareCardDialog` in `src/views/RegistryView.vue`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: nessuna dipendenza. T001 completato: costituzione v2.0.0
- **Foundational (Phase 2)**: dipende dalla Phase 1; blocca tutte le user story
- **User Stories (Phase 3–10)**: dipendono dalla Phase 2, poi come da tabella sotto
- **Polish (Phase 11)**: dopo le storie che si vogliono rilasciare
- **Revisione UI/UX (Phase 12)**: dopo la Phase 10; T088–T091, T097, T098 in parallelo, poi T092–T096 in sequenza (toccano `BottleFormView.vue`/`BottleDetailView.vue`), infine T099

### User Story Dependencies

| Storia | Dipende da | Motivo |
|---|---|---|
| US1 (P1) | Foundational | — |
| US2 (P2) | US1 | estende `RegistryView` e `BottleFormView`, crea `BottleDetailView` |
| US3 (P3) | US2 | estende modulo e scheda |
| US8 (P3) | US1 | estende il modulo (la riga in scheda T061 richiede US2) |
| US4 (P4) | US2 | modulo e scheda; la Mappa è autonoma |
| US5 (P5) | Foundational | lavora su DB e `SettingsView`; le foto nel backup sono esercitate davvero con US3 |
| US6 (P6) | US2 | scheda; la copertina richiede US3 (senza foto usa lo sfondo tematico) |
| US7 (P7) | Foundational | `App.vue`, `SettingsView`, `main.js` |

### Within Each User Story

- I test elencati vanno scritti per primi e devono fallire prima dell'implementazione
- Librerie in `src/lib/` e `src/db/` prima dei componenti, componenti prima delle viste
- Le attività che toccano lo stesso file (`BottleFormView.vue`, `BottleDetailView.vue`,
  `App.vue`, `bottles.js`) vanno in sequenza

### Parallel Opportunities

- Setup: T002, T007–T014 in parallelo dopo T003–T006
- Foundational: T016, T017, T020, T021, T023–T030 in parallelo; T018, T019, T022, T031–T033 in sequenza
- Dopo US2: US3, US4, US6 possono procedere in parallelo se i file condivisi (`BottleFormView.vue`, `BottleDetailView.vue`) vengono toccati uno alla volta; US5 e US7 dipendono solo dalla Foundational ma vanno fatte **in sequenza** tra loro, perché modificano entrambe `SettingsView.vue` e `App.vue`

---

## Parallel Example: User Story 1

```text
# Componenti indipendenti, in parallelo:
T034 TallyRating.vue
T035 TallyMark.vue
T036 TypeToggle.vue
T037 BottleRow.vue
# Poi, in sequenza:
T038 BottleFormView.vue (creazione)
T039 RegistryView.vue
```

## Parallel Example: User Story 5

```text
# Test e utilità in parallelo:
T066 exportCsv.test.js
T067 backup.test.js
T068 download.js
T072 backupReminder.test.js + backupReminder.js
# Poi: T069 → T070 → T071 → T073 → T074
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup
2. Phase 2 Foundational
3. Phase 3 US1
4. **STOP e verifica**: registrazione offline sul servizio `web` e sul telefono (HTTPS mkcert)

### Incremental Delivery

1. US1 → MVP: registrare
2. US2 → consultare e correggere
3. US3 + US8 → arricchire e velocizzare l'inserimento
4. US5 → backup (consigliato presto: i dati vivono solo sul dispositivo)
5. US4 → luoghi e mappa
6. US6 → condivisione
7. US7 → installazione, tema, aggiornamenti
8. Phase 11 → quality gate e rilascio ai primi utenti

---

## Notes

- [P] = file diversi, nessuna dipendenza da attività incomplete
- [Story] collega l'attività alla user story per la tracciabilità
- Commit dopo ogni attività o gruppo logico; fermarsi a ogni checkpoint per verificare la storia
- Per scelte visive non dettagliate qui, `ui-design.md` è la fonte di verità

## Phase 19: Rilascio open source 1.0.0

- [X] T118 Card "Ti piace Bacco? Offrimi una birra o un vino" con link a Buy Me a Coffee in Impostazioni (`src/components/SupportCard.vue`); è un semplice link, nessuna richiesta di rete dall'app
- [X] T119 Sezione Versione in Impostazioni: versione da `package.json` (`__APP_VERSION__` in vite.config.js), "Cerca aggiornamenti" che scarica e applica subito la nuova versione (`checkForUpdate` in `src/composables/usePwaUpdate.js`), controllo anche al ritorno in primo piano; test in `tests/unit/updateCheck.test.js`
- [X] T120 File del progetto open source: README.md con banner (`docs/banner.png`) e schermate, LICENSE (MIT), SECURITY.md, CONTRIBUTING.md, CHANGELOG.md, template di issue e PR, Dependabot
- [X] T121 Pipeline GitHub Actions (`ci.yml`, `commitlint.yml`, `release-please.yml`), configurazione release-please alla versione 1.0.0, blueprint Render (`render.yaml`) con le stesse intestazioni di sicurezza di nginx
- [X] T122 Pulsante ✕ per chiudere le Impostazioni (`src/views/SettingsView.vue`, torna alla pagina precedente o al registro); deploy su Render senza dominio personalizzato (README su `bacco.onrender.com`)
