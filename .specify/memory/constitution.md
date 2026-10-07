<!--
Sync Impact Report
- Version change: 2.0.0 → 2.0.1 (PATCH: chiarimento)
- Principi modificati:
  - II. "Dati solo locali, rete in sola lettura e sicurezza": `img-src` ammette esplicitamente
    gli schemi locali `blob:` e `data:` (immagini generate sul dispositivo, es. foto salvate);
    nessuna nuova origine esterna
- Sezioni aggiunte/rimosse: nessuna
- Motivazione: /speckit-analyze 2026-10-07, problema C2 (CSP del plan con `blob:`/`data:`)
- Template e documenti:
  - ✅ .specify/templates/* — generici, nessuna modifica
  - ✅ specs/001-bottle-logging/research.md (R14) e tasks.md (T008) — già coerenti
- Storico: 2.0.0 (2026-10-07) ridefinisce i principi II e III (rete in sola lettura verso
  tile OpenStreetMap e Open Food Facts; nucleo offline)
- TODO differiti: nessuno
-->

# Bacco Constitution

## Core Principles

### I. Semplicità prima di tutto (KISS & YAGNI)

- Ogni soluzione DEVE essere la più semplice che soddisfa il requisito attuale.
- NON si implementano funzionalità, astrazioni, configurazioni o punti di estensione
  "per il futuro": si costruisce solo ciò che una specifica richiede oggi.
- Una nuova dipendenza DEVE essere giustificata: se la piattaforma web, Vue o Tailwind
  coprono già l'esigenza in poche righe, la dipendenza non si aggiunge.
- Niente livelli architetturali superflui (repository generici, service locator,
  state manager globale) finché un problema concreto non lo rende necessario.
- Ogni deviazione DEVE essere documentata nella tabella "Complexity Tracking" del plan.

**Razionale**: un'app personale, locale e offline resta manutenibile solo se il codice
è piccolo, leggibile e privo di complessità speculativa.

### II. Dati solo locali, rete in sola lettura e sicurezza (NON NEGOZIABILE)

- Tutti i dati dell'utente (registro, note, foto, punteggi, posizioni, impostazioni)
  DEVONO restare sul dispositivo e NON DEVONO mai essere inviati a server, API, servizi
  cloud o terze parti.
- Sono ammesse solo richieste di rete **in sola lettura** verso servizi pubblici elencati
  qui e nella CSP, che ricevono solo il minimo indispensabile, mai dati del registro:
  - tile di OpenStreetMap (`https://tile.openstreetmap.org`), solo nella pagina Mappa;
  - Open Food Facts (`https://world.openfoodfacts.org`), che riceve solo il codice a barre
    scansionato o digitato.
  Aggiungere un servizio a questo elenco richiede un emendamento della costituzione.
- Vietati analytics, telemetria, tracker, crash reporting remoto e font/script/CSS da CDN;
  le risposte dei servizi esterni non vengono salvate dal service worker.
- Content Security Policy restrittiva: `default-src 'self'`, nessun `unsafe-eval` né
  `unsafe-inline` per gli script (`'wasm-unsafe-eval'` ammesso per WASM locale),
  `connect-src` limitato a `'self'` più le origini dell'elenco sopra; `img-src` limitato a
  `'self'`, agli schemi locali `blob:` e `data:` (immagini generate sul dispositivo) e alle
  origini dell'elenco sopra.
- L'input utente e i dati ricevuti dai servizi esterni NON DEVONO mai essere renderizzati
  come HTML (`v-html`, `innerHTML`) né valutati come codice; ogni dato importato o ricevuto
  DEVE essere validato prima dell'uso.
- Nessun segreto o credenziale nel codice o nel repository.
- Dipendenze minime, versioni bloccate dal lockfile e verificate (`npm audit`) prima di
  ogni rilascio; vulnerabilità alte/critiche bloccano il rilascio.
- L'utente DEVE poter esportare, importare ed eliminare i propri dati in locale
  (file scaricato/caricato dal dispositivo), senza passaggi da server.

**Razionale**: la privacy è la promessa centrale di Bacco: i dati non escono mai. Le
letture di contenuti pubblici arricchiscono l'app senza esporre il registro.

### III. Offline-First PWA

- Bacco DEVE essere una PWA installabile (web app manifest + service worker).
- Archiviazione, registrazione, consultazione, modifica, backup e scansione dei codici a
  barre DEVONO funzionare offline dopo il primo caricamento.
- Tutti gli asset dell'app (JS, CSS, icone, font, WASM) DEVONO essere pre-cacheati e
  serviti in locale.
- La persistenza usa un database locale nel browser (IndexedDB).
- Le funzioni che usano la rete (mappa, ricerca su Open Food Facts) DEVONO degradare con
  un messaggio chiaro, senza bloccare il resto dell'app né perdere quanto inserito.
- Gli aggiornamenti dell'app NON DEVONO causare perdita di dati; le modifiche allo schema
  del DB DEVONO avere una migrazione versionata.

**Razionale**: il cuore dell'app (registrare e ritrovare le proprie bottiglie) deve
funzionare sempre, ovunque, senza rete.

### IV. Mobile-First e accessibilità

- Il design parte dallo schermo più piccolo (≥ 320px) e si estende con i breakpoint
  Tailwind verso schermi più grandi.
- Target touch di almeno 44×44px, nessuno scroll orizzontale, interazioni utilizzabili
  con una mano.
- L'interfaccia DEVE rispettare WCAG 2.1 AA: HTML semantico, label sui campi,
  navigazione da tastiera, focus visibile, contrasto sufficiente in entrambi i temi,
  rispetto di `prefers-reduced-motion`.

**Razionale**: l'uso primario è da smartphone; l'accessibilità è parte della qualità,
non un extra.

### V. Tema chiaro/scuro con selettore

- L'app DEVE offrire tema chiaro e scuro tramite un selettore visibile
  (chiaro / scuro / sistema), con default "sistema" (`prefers-color-scheme`).
- La scelta DEVE essere salvata in locale e applicata prima del primo render, senza
  flash del tema sbagliato.
- Il tema è implementato con la variante `dark` di Tailwind (strategia classe); ogni
  componente DEVE essere verificato in entrambi i temi.

**Razionale**: comfort visivo e rispetto delle preferenze dell'utente.

## Stack tecnologico e vincoli

- **Frontend**: Vue 3 (Composition API, `<script setup>`), build con Vite.
- **Stile**: Tailwind CSS; niente librerie di componenti UI salvo necessità giustificata.
- **PWA**: manifest + service worker (es. `vite-plugin-pwa` / Workbox) con precache
  completo.
- **Database locale**: IndexedDB, direttamente o tramite un unico wrapper leggero
  (es. Dexie) se semplifica il codice.
- **Backend**: nessuno. L'app è un insieme di file statici.
- **Stato**: reattività di Vue e composables; uno store globale si introduce solo se
  giustificato (Principio I).
- **Ambiente locale**: lo sviluppo e il test in locale DEVONO avvenire tramite Docker
  (`docker compose`), senza dipendere da Node o da altri tool installati sull'host.
  - Un servizio di sviluppo (Vite con hot reload) per l'iterazione quotidiana.
  - Un servizio che serve la build di produzione da un web server statico (es. nginx)
    su `localhost`, per testare la PWA reale: service worker, installazione, precache,
    funzionamento offline e header di sicurezza (CSP).
  - La configurazione Docker resta minima (Principio I): un `Dockerfile` e un
    `compose.yaml`, nessuna orchestrazione aggiuntiva.

## Flusso di sviluppo e quality gate

- Ogni feature segue il flusso Spec Kit: spec → plan → tasks → implementazione.
- Il "Constitution Check" del plan DEVE verificare tutti e cinque i principi prima
  della ricerca e dopo il design.
- Prima del merge di ogni modifica:
  - build e lint senza errori, eseguiti nel container Docker;
  - verifica in modalità offline (rete disattivata) dei flussi toccati, sulla build di
    produzione servita dal container Docker (non sul dev server);
  - verifica su viewport mobile e in entrambi i temi;
  - nessuna richiesta di rete verso origini diverse da quelle ammesse dal Principio II e
    nessun dato dell'utente in uscita (controllo da DevTools / CSP);
  - logica di dominio e accesso al DB coperti da test quando non banali.

## Governance

- Questa costituzione prevale su qualunque altra pratica o convenzione del progetto.
- Le modifiche richiedono: proposta motivata, aggiornamento di questo file con Sync
  Impact Report, allineamento dei template dipendenti e un piano di migrazione se
  il cambiamento impatta codice o dati esistenti.
- Versionamento semantico: MAJOR per rimozione o ridefinizione incompatibile di un
  principio; MINOR per nuovi principi/sezioni o estensioni sostanziali; PATCH per
  chiarimenti e correzioni formali.
- Ogni plan e ogni review DEVE verificare la conformità; ogni violazione va giustificata
  esplicitamente o corretta.

**Version**: 2.0.1 | **Ratified**: 2026-10-07 | **Last Amended**: 2026-10-07
