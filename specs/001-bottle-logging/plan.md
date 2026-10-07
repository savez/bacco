# Implementation Plan: Bacco – Registro personale di bottiglie (MVP)

**Branch**: `001-bottle-logging` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-bottle-logging/spec.md`

## Summary

PWA installabile, mobile-first, per registrare in pochi tocchi le bottiglie di vino e birra
consumate (nome, tipo, punteggio 1–5 a "tacche di gesso", più dettagli facoltativi: foto,
note, posizione, codice a barre, link esterno). Tutti i dati vivono in IndexedDB sul
dispositivo; backup/ripristino via file JSON con unione per `updatedAt`, export CSV, card
PNG 9:16 da condividere. Unica rete usata, in sola lettura: tile OpenStreetMap nella pagina
Mappa e ricerca del codice a barre su Open Food Facts. Vue 3 + Tailwind 4 + Dexie +
vite-plugin-pwa, sviluppo e test solo via Docker. Design in [ui-design.md](./ui-design.md).

## Technical Context

**Language/Version**: JavaScript ES2022 (moduli ES), Node 24 LTS solo nei container
**Primary Dependencies** (versioni risolte in `package-lock.json` il 2026-10-07): Vue 3.5.43,
vue-router 4.6.4, Vite 7.3.7, `@vitejs/plugin-vue` 6.0.9, Tailwind CSS 4.3.3
(`@tailwindcss/vite` 4.3.3), Dexie 4.4.6, vite-plugin-pwa 2.0.0 (+ `workbox-window` 7.4.1),
Leaflet 1.9.4 (lazy), `barcode-detector` 3.2.2 (ponyfill zxing-wasm, WASM locale),
`@fontsource/big-shoulders-stencil-display` 5.3.0, `@fontsource/atkinson-hyperlegible-next`
5.3.0. Dev: Vitest 5.0.3, `fake-indexeddb` 6.2.5, ESLint 10.12.0, `eslint-plugin-vue` 10.11.1.
Nota: `vue-router` ha una major 5 più recente (richiede Vite ≥7.3 e integrazione Pinia); si
resta sulla 4, allineata a `research.md` R17 e più semplice (Principio I).
**Storage**: IndexedDB (Dexie, schema versionato) — tabelle `bottles`, `photos`, `settings`;
`localStorage` solo per la preferenza tema letta da `theme-init.js`
**Testing**: Vitest + `fake-indexeddb` (logica dati, import/merge, migrazioni, CSV, note,
mappatura OFF); verifiche manuali da `quickstart.md`; ESLint + `eslint-plugin-vue`
**Target Platform**: browser mobili moderni (Safari iOS ≥ 16.4, Chrome Android ≥ 120) e
desktop (Chrome, Firefox, Safari recenti); contesto sicuro (HTTPS o localhost)
**Project Type**: web app statica (PWA), nessun backend
**Performance Goals**: registrazione ≤ 20 s / ≤ 5 tocchi; registro e ricerca < 1 s con
1.000 bottiglie; card < 3 s; avvio offline < 2 s, misurati su un dispositivo di riferimento (iPhone 12 o Pixel 6a, o
equivalenti)
**Constraints**: offline per tutto tranne Mappa e ricerca OFF; nessun dato del registro in
rete; CSP restrittiva (due sole origini esterne); font e WASM self-hosted; WCAG 2.1 AA;
foto ≤ 1600 px
**Scale/Scope**: 1 utente per dispositivo, ~1.000 bottiglie con foto (limite del backup JSON
da 300 MB, vedi research R15c), 5 viste, ~25 componenti

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*
Costituzione v2.0.0 (emendata il 2026-10-07, task T001: principi II e III ridefiniti).

| Principio | Esito | Note |
|---|---|---|
| I. KISS & YAGNI | ✅ con giustificazioni | JS senza TS, niente store globale, niente libreria markdown, card su canvas senza librerie. Dipendenze aggiunte (Leaflet, `barcode-detector`, vue-router) giustificate in Complexity Tracking |
| II. Dati solo locali, rete in sola lettura e sicurezza | ✅ | Dati del registro mai trasmessi; uniche origini esterne quelle elencate dalla costituzione (`tile.openstreetmap.org` in `img-src`, `world.openfoodfacts.org` in `connect-src`); OFF riceve solo il codice a barre; risposte esterne non salvate dal service worker; CSP senza `unsafe-eval`/`unsafe-inline` per gli script (`'wasm-unsafe-eval'` per lo scanner); niente `v-html`; validazione di import e risposte OFF; `npm audit`; export/import/elimina in locale |
| III. Offline-First PWA | ✅ | Installabile; precache di JS, CSS, font, icone e WASM; IndexedDB con migrazioni versionate; registrazione, consultazione, backup e scansione offline; Mappa e ricerca OFF degradano con messaggio senza perdere l'inserimento |
| IV. Mobile-First e accessibilità | ✅ | Layout da 320 px, target ≥ 44 px, `radiogroup` nativo per il punteggio, focus visibile, reduced motion (ui-design.md) |
| V. Tema chiaro/scuro | ✅ | Sistema/chiaro/scuro, `theme-init.js` esterno prima del render, variante `dark` Tailwind a classe |
| Stack e ambiente Docker | ✅ | Vue 3 + Vite, Tailwind, vite-plugin-pwa, Dexie; `compose.yaml` con `dev` e `web` (nginx) |
| Quality gate | ✅ | lint/test/build nel container, verifica offline su `web`, controllo rete (solo origini ammesse) e CSP (quickstart.md) |

**Esito gate**: superato, nessuna violazione.

**Re-check post-design (Phase 1)**: superato. Il design usa esattamente le due origini
ammesse, nessuna cache di contenuti di terze parti, richiesta OFF solo dopo la scansione di
un codice nuovo e contenente solo il codice.

## Project Structure

### Documentation (this feature)

```text
specs/001-bottle-logging/
├── plan.md              # questo file
├── research.md          # Phase 0: decisioni tecniche
├── ui-design.md         # direzione visiva e UX (/frontend-design)
├── data-model.md        # Phase 1: schema IndexedDB e regole
├── quickstart.md        # Phase 1: Docker, HTTPS su telefono, verifiche
├── contracts/
│   ├── backup-format.md # JSON di backup + regole di unione
│   ├── csv-format.md    # colonne CSV
│   ├── openfoodfacts.md # richiesta e mappatura OFF
│   └── share-card.md    # layout card 1080×1920
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
Dockerfile               # multi-stage: build (node:24-alpine) → web (nginx:alpine)
compose.yaml             # servizi dev e web
docker/
├── nginx.conf           # SPA fallback, CSP e header di sicurezza, TLS 8443
└── certs/               # certificati mkcert locali (gitignored)
index.html               # carica /theme-init.js in <head>
vite.config.js           # vue, tailwind, pwa (manifest + workbox)
eslint.config.js
public/
├── theme-init.js        # applica la classe tema prima del render
└── icons/               # icone PWA (192, 512, maskable, apple-touch)
src/
├── main.js
├── App.vue              # layout, barra navigazione, banner
├── router.js
├── assets/main.css      # @import tailwind, @theme token, @custom-variant dark, font
├── db/
│   ├── db.js            # istanza Dexie, versioni e migrazioni
│   ├── bottles.js       # CRUD, ricerca, suggerimenti, lookup barcode
│   ├── photos.js
│   └── settings.js
├── backup/
│   ├── exportJson.js
│   ├── exportCsv.js
│   └── importJson.js    # validazione + unione
├── lib/
│   ├── rating.js        # livelli 1–5
│   ├── validate.js      # regole del data model
│   ├── notes.js         # parsing elenchi
│   ├── image.js         # resize + miniatura
│   ├── barcode.js       # BarcodeDetector nativo o ponyfill
│   ├── openFoodFacts.js
│   ├── geo.js
│   ├── shareCard.js     # disegno canvas + share/download
│   ├── install.js       # beforeinstallprompt / iOS
│   └── theme.js
├── composables/         # useBottles, useBanner, useOnline
├── components/          # TallyRating, BottleRow, PhotoPicker, BarcodeScanner,
│                        # NotesView, Banner, BottomNav, ...
└── views/
    ├── RegistryView.vue
    ├── BottleFormView.vue
    ├── BottleDetailView.vue
    ├── MapView.vue      # Leaflet importato dinamicamente
    └── SettingsView.vue
tests/
└── unit/                # db/migrations, import merge, export CSV, notes, OFF mapping, validate
```

**Structure Decision**: progetto singolo alla radice del repository (nessun backend). La
cartella vuota `bacco/` esistente non viene usata e può essere rimossa.

## Complexity Tracking

| Aggiunta | Perché serve | Alternativa più semplice scartata perché |
|---|---|---|
| Dipendenza Leaflet | Mappa interattiva con segnaposto | Disegnare tile a mano: più codice e più bug; caricata lazy solo in Mappa |
| Dipendenza `barcode-detector` (+ WASM) | Safari iOS non ha `BarcodeDetector` | Solo input manuale: perde il valore della scansione su iPhone |
| Dipendenza vue-router | URL, tasto indietro, schede apribili dalla mappa | Navigazione a stato manuale: reimplementa male il router |
