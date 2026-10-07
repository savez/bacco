# Research: Bacco – Registro personale di bottiglie (MVP)

**Feature**: `001-bottle-logging` | **Date**: 2026-10-07

Ogni voce: Decisione / Motivazione / Alternative considerate.

## R1. Linguaggio e build

- **Decisione**: JavaScript (ES2022, moduli ES) con JSDoc dove utile; Vue 3.5 (`<script setup>`),
  Vite 7, Node 24 LTS **solo dentro i container**.
- **Motivazione**: KISS (Principio I): nessuna toolchain di tipi da mantenere per un'app piccola
  e personale; Vite è lo standard per Vue.
- **Alternative**: TypeScript (più sicurezza a compile time, ma più configurazione e build);
  rimandato finché la dimensione del codice non lo giustifica.

## R2. Stile e temi

- **Font verificati** (npm, 2026-10-07): `@fontsource/big-shoulders-stencil-display` 5.3
  (subset `latin` include À È Ì Ò Ù), `@fontsource/atkinson-hyperlegible-next` 5.3.
- **Decisione**: Tailwind CSS **v4** con `@tailwindcss/vite`; dark mode a classe tramite
  `@custom-variant dark (&:where(.dark, .dark *));`; token di colore come variabili CSS in
  `@theme` (vedi `ui-design.md`). Il tema viene applicato prima del primo render da un piccolo
  script **esterno** sincrono `public/theme-init.js` caricato in `<head>` (uno script inline
  violerebbe la CSP).
- **Motivazione**: Principio V (nessun flash del tema sbagliato) + CSP senza `unsafe-inline`.
- **Alternative**: Tailwind v3 (`darkMode: 'class'` in config JS): superato; script inline
  con hash CSP: più fragile da mantenere.

## R3. Database locale

- **Decisione**: IndexedDB tramite **Dexie 4** (unico wrapper ammesso dalla costituzione).
  Schema versionato con `db.version(n).stores(...).upgrade(...)`. Foto salvate come `Blob`
  in una tabella separata. All'avvio si chiama `navigator.storage.persist()`.
- **Motivazione**: Dexie offre migrazioni versionate (Principio III), transazioni e query
  semplici con meno codice dell'API IndexedDB nativa; i Blob in IndexedDB sono supportati da
  tutti i browser target (incluso Safari iOS ≥ 15).
- **Alternative**: `idb` (più sottile ma migrazioni a mano); IndexedDB nativo (troppo verboso);
  OPFS per le foto (secondo meccanismo di storage da gestire nel backup: YAGNI).

## R4. Identificativi e unione all'importazione

- **Decisione**: `id` = `crypto.randomUUID()` generato sul dispositivo; `updatedAt` (ISO 8601,
  UTC) aggiornato a ogni modifica. Unione all'importazione: per ogni bottiglia del backup,
  se l'`id` non esiste → aggiunta; se esiste → vince il record con `updatedAt` maggiore
  (le foto seguono la bottiglia vincente); a parità → invariata. Tutto in un'unica
  transazione: o tutto o niente.
- **Motivazione**: chiarimento Q3 della spec; UUID stabili tra dispositivi senza server.
- **Alternative**: id autoincrementali (collidono tra dispositivi); hash del contenuto
  (cambia a ogni modifica).

## R5. PWA e service worker

- **Decisione**: `vite-plugin-pwa` (Workbox, `generateSW`), `registerType: 'prompt'`
  (l'utente sceglie quando aggiornare → nessun aggiornamento a metà registrazione),
  precache di tutti gli asset con `workbox.globPatterns:
  ['**/*.{js,css,html,woff2,wasm,png,svg,ico,webmanifest}']` (il default include solo
  js/css/html) e `maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` (il WASM di zxing supera
  il limite predefinito di 2 MiB? da verificare in build). `injectRegister: null`: la
  registrazione avviene dal modulo virtuale `virtual:pwa-register/vue` (bundlato, serve anche
  per l'avviso "Nuova versione disponibile"); la modalità `inline` sarebbe bloccata dalla CSP.
  Le tile della mappa e
  Open Food Facts **non** sono gestite dal service worker (solo rete).
- **Motivazione**: Principio III; il precache copre tutto l'uso offline; nessuna cache
  di contenuti di terze parti.
- **Alternative**: service worker scritto a mano (più codice, più errori);
  `autoUpdate` (rischio di ricarica durante l'inserimento).

## R6. Invito all'installazione

- **Decisione**: evento `beforeinstallprompt` (Chromium/Android) memorizzato e usato da un
  banner non bloccante; su iOS/Safari (nessun evento) si mostrano istruzioni "Condividi →
  Aggiungi alla schermata Home". App installata riconosciuta con
  `matchMedia('(display-mode: standalone)')` e `navigator.standalone`. Rifiuto salvato in
  impostazioni, nuovo invito dopo 30 giorni.
- **Alternative**: nessuna libreria necessaria.

## R7. Lettura codice a barre

- **Decisione**: API `BarcodeDetector` nativa quando disponibile (Chrome Android); altrimenti
  il ponyfill npm **`barcode-detector`** (basato su `zxing-wasm`) con il file `.wasm`
  **importato come asset locale** (`?url`) e passato a `prepareZXingModule`/`locateFile`,
  quindi precacheato. Formati: EAN-13, EAN-8, UPC-A, UPC-E. Fotocamera con
  `getUserMedia({ video: { facingMode: 'environment' } })`; scansione a ~5 fps su un
  `<video>`; stop dello stream appena letto. Input manuale sempre disponibile.
- **Motivazione**: `BarcodeDetector` non è disponibile in Safari iOS; il ponyfill per default
  scarica il WASM da CDN, quindi va forzato il caricamento locale (Principio II). CSP richiede
  `'wasm-unsafe-eval'` in `script-src` (non abilita `eval` JS).
- **Alternative**: `@zxing/browser` (JS puro, in manutenzione, più lento); `html5-qrcode`
  (UI propria, più pesante, meno controllo).

## R8. Open Food Facts

- **Decisione**: `GET https://world.openfoodfacts.org/api/v2/product/{codice}.json?fields=code,product_name,brands,categories_tags`
  via `fetch` con timeout 6 s (`AbortController`), solo se `navigator.onLine` e solo dopo
  una lettura riuscita di un codice **non presente nel registro**. L'API risponde con
  `Access-Control-Allow-Origin: *` (lettura senza autenticazione). Mappatura in
  `contracts/openfoodfacts.md`. I valori ricevuti vengono troncati, ripuliti da caratteri di
  controllo e usati solo come testo.
- **Motivazione**: chiarimento Q4; invio del solo codice a barre (FR-026).
- **Alternative**: Wikidata/UPCitemdb: fuori ambito.

## R9. Mappa

- **Decisione**: **Leaflet 1.9** (CSS e icone marker importati localmente dal pacchetto npm)
  con tile **OpenStreetMap** `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, attribuzione
  "© OpenStreetMap contributors", `referrerpolicy` predefinito del browser (richiesto dalla
  tile usage policy). Nessuna cache delle tile. Offline: messaggio + elenco testuale dei
  luoghi con link alla scheda. La libreria è caricata in modo lazy solo nella pagina Mappa.
- **Motivazione**: chiarimento Q1; Leaflet è piccolo (~40 KB gz), maturo, nessuna chiave API.
  Uso personale e a basso volume compatibile con la policy OSM.
- **Alternative**: MapLibre GL (vettoriale, molto più pesante, serve un provider di stili);
  provider commerciali con chiave API (segreto nel client: vietato).

## R10. Foto

- **Decisione**: `<input type="file" accept="image/*">` (con `capture="environment"` per il
  pulsante "Scatta"); ridimensionamento con `createImageBitmap` + canvas a lato lungo max
  1600 px, JPEG qualità 0,8 (≈ 200–400 KB); miniatura 320 px salvata a parte per lista e
  scheda. EXIF scartato automaticamente dalla ri-codifica (nessuna posizione nascosta nelle
  foto).
- **Alternative**: salvare l'originale (troppo spazio, EXIF con GPS); WebP (supporto
  `toBlob('image/webp')` incompleto in Safari).

## R11. Note con elenchi

- **Decisione**: nessuna libreria markdown. La nota viene divisa in blocchi: righe che
  iniziano con `- ` → `<ul><li>`, il resto → paragrafi; il rendering usa interpolazione
  testuale Vue (mai `v-html`).
- **Motivazione**: FR-010 + Principio II; ~20 righe di codice.

## R12. Card di condivisione

- **Decisione**: disegno diretto su `<canvas>` 1080×1920 (formato storie), font locali
  attesi con `document.fonts.load()`, esportazione PNG; condivisione con
  `navigator.share({ files, text })` se `navigator.canShare({ files })`, altrimenti download.
  Il testo contiene il link alla scheda esterna se presente. Layout in
  `contracts/share-card.md`.
- **Alternative**: `html2canvas`/`html-to-image` (dipendenza pesante, problemi con font e
  CSP).

## R13. Geolocalizzazione

- **Decisione**: `navigator.geolocation.getCurrentPosition` solo al tocco di "Aggiungi
  posizione", `enableHighAccuracy: false`, timeout 10 s, `maximumAge` 60 s; si salvano
  lat/lon arrotondati a 5 decimali (~1 m) e precisione.

## R14. Sicurezza (CSP e header)

- **Decisione**: header impostati da nginx (prod container):
  ```text
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval';
    style-src 'self'; img-src 'self' blob: data: https://tile.openstreetmap.org;
    connect-src 'self' https://world.openfoodfacts.org; font-src 'self';
    worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self';
    form-action 'self'; frame-ancestors 'none'
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  Permissions-Policy: camera=(self), geolocation=(self), microphone=()
  ```
  Cache HTTP: `index.html`, `sw.js`, `registerSW.js`, `manifest.webmanifest` →
  `Cache-Control: no-cache` (altrimenti l'aggiornamento dell'app non viene rilevato);
  `/assets/*` (nomi con hash) → `public, max-age=31536000, immutable`; `.wasm` servito come
  `application/wasm` (verificare `mime.types` di nginx).
  Font self-hosted da pacchetti `@fontsource/*` (nessun Google Fonts). `npm audit
  --audit-level=high` nel container prima di ogni rilascio.
- **Nota**: Vue e Leaflet impostano stili via CSSOM (`el.style.x`), consentito senza
  `'unsafe-inline'`; da verificare in `quickstart` (nessuna violazione CSP in console).

## R15. Docker e HTTPS sul telefono

- **Decisione**: `compose.yaml` con due servizi:
  - `dev`: `node:24-alpine`, `npm ci` + `vite --host 0.0.0.0` su porta 5173, sorgenti montati.
  - `web`: build multi-stage (`node:24-alpine` → `nginx:alpine`), serve `dist/` su
    `http://localhost:8080` e `https://<IP-LAN>:8443` con certificato **mkcert**
    (montato da `docker/certs/`, ignorato da git).
  Comandi di utilità (`lint`, `test`, `audit`) eseguiti con `docker compose run --rm dev …`.
- **Motivazione**: fotocamera, geolocalizzazione, service worker e installazione richiedono
  un contesto sicuro: `localhost` va bene sul Mac, ma sul telefono serve HTTPS con un
  certificato fidato (la CA mkcert va installata sul telefono una volta).
- **Alternative**: tunnel pubblico (es. cloudflared/ngrok: espone l'app su un servizio
  esterno); port forwarding USB di Chrome (solo Android).

## R15b. Persistenza dei dati su Safari

- **Fatto**: Safari (ITP) può cancellare lo storage dei siti **non installati** dopo 7 giorni
  senza utilizzo; le web app aggiunte alla schermata Home sono escluse.
  `navigator.storage.persist()` è richiesto comunque (Chrome/Firefox lo rispettano).
- **Decisione**: su iOS l'invito all'installazione spiega che installare protegge i dati;
  il promemoria di backup resta la rete di sicurezza.

## R15c. Dimensione del backup (rischio aperto)

- **Problema**: con foto in base64 un backup JSON cresce di ~400 KB per foto (≈ 400 MB per
  1.000 bottiglie con una foto). `JSON.parse` di un file da centinaia di MB in Safari iOS
  rischia l'esaurimento della memoria.
- **Mitigazioni adottate**: miniature escluse dal backup (rigenerate all'importazione);
  export costruito come `new Blob([...parti])` bottiglia per bottiglia (nessuna stringa
  unica); limite di importazione 300 MB con messaggio chiaro; `formatVersion: 1` resta
  modificabile fino al rilascio.
- **Alternativa da decidere con l'utente**: backup `.zip` (manifest JSON + file JPEG,
  scritto/letto in streaming), che scala molto meglio ma cambia la formulazione di FR-014
  ("in JSON") e aggiunge una dipendenza (es. `fflate`).

## R16. Test

- **Decisione**: **Vitest** + `fake-indexeddb` per la logica non banale: migrazioni DB,
  unione all'importazione, validazione backup, export CSV, parsing note, mappatura Open Food
  Facts. Verifiche manuali (offline, mobile, temi, CSP) secondo i quality gate della
  costituzione, documentate in `quickstart.md`. Lint con ESLint + `eslint-plugin-vue`.
- **Alternative**: Playwright E2E (utile ma YAGNI per l'MVP).

## R17. Routing

- **Decisione**: `vue-router` 4 in history mode (nginx con fallback su `index.html`, il
  service worker serve `index.html` per le navigazioni). Viste: Registro, Nuova/Modifica,
  Scheda, Mappa, Impostazioni.
- **Alternative**: navigazione a stato manuale: niente URL condivisibili/back del browser.
  Nessuno store globale (Pinia): composables + Dexie `liveQuery` bastano.
