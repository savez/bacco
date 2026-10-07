# Quickstart: Bacco in locale (Docker)

Requisiti sull'host: **solo Docker** (Docker Desktop o equivalente con `docker compose`).
Nessun Node/npm sull'host: ogni comando passa dai container.

## Sviluppo (hot reload)

```bash
docker compose up dev
# → http://localhost:5173
```

Il servizio `dev` monta i sorgenti, esegue `npm ci` al primo avvio (volume
`node_modules` dedicato) e avvia Vite con `--host 0.0.0.0`. Il service worker in dev è
disattivato: per provare la PWA usare il servizio `web`.

## Comandi di utilità

```bash
docker compose run --rm dev npm run lint      # ESLint
docker compose run --rm dev npm test          # Vitest (una esecuzione)
docker compose run --rm dev npm run build     # build di produzione in dist/
docker compose run --rm dev npm audit --audit-level=high
docker compose run --rm dev npm install <pacchetto>   # aggiorna package-lock.json
```

## Build di produzione + PWA reale

```bash
docker compose up --build web
# → http://localhost:8080   (Mac: contesto sicuro, PWA completa)
# → https://<IP-LAN>:8443   (telefono, serve il certificato, vedi sotto)
```

`web` è una build multi-stage: Node compila, nginx serve `dist/` con fallback SPA su
`index.html` e con gli header di sicurezza (CSP) definiti in `docker/nginx.conf`.

## HTTPS per provare dal telefono (una volta)

Fotocamera, posizione, service worker e installazione funzionano solo in un contesto sicuro.

1. Installare `mkcert` sul Mac (`brew install mkcert`) ed eseguire `mkcert -install`.
2. Generare il certificato per l'IP del Mac:
   `mkcert -cert-file docker/certs/bacco.pem -key-file docker/certs/bacco-key.pem localhost <IP-LAN>`
   (`docker/certs/` è in `.gitignore`).
3. Installare sul telefono la CA (`mkcert -CAROOT` → `rootCA.pem`):
   - iOS: inviarla via AirDrop, installare il profilo, poi Impostazioni → Generali →
     Info → Impostazioni certificati → abilitare la fiducia completa.
   - Android: Impostazioni → Sicurezza → Installa certificato CA.
4. `docker compose up --build web` e aprire `https://<IP-LAN>:8443` sul telefono
   (stessa rete Wi-Fi).

> **Fotocamera (scansione e foto)**: funziona solo in un contesto sicuro. Sul Mac va bene
> `http://localhost`; **dal telefono serve `https://<IP-LAN>:8443`** (servizio `web` +
> certificato mkcert, vedi sopra): su `http://<IP>` il browser blocca la fotocamera.

## Verifiche prima del merge (quality gate della costituzione)

1. `lint`, `test`, `build` senza errori (nel container).
2. **Offline**: su `web`, caricare l'app una volta, poi DevTools → Network → Offline (o
   modalità aereo sul telefono): registrare, modificare, cercare, esportare, importare,
   condividere. La Mappa mostra il messaggio offline; la scansione legge il codice e chiede
   la compilazione manuale. **Su iPhone in modalità aereo** la scansione deve funzionare
   (verifica che il WASM sia nel precache) e i font devono restare quelli di Bacco.
3. **Rete**: DevTools → Network, filtro "domain": le uniche richieste esterne sono
   `tile.openstreetmap.org` (solo in Mappa) e `world.openfoodfacts.org` (solo dopo una
   scansione di un codice nuovo). Nessuna richiesta contiene dati del registro.
4. **CSP**: nessun errore "Refused to …" in console.
5. **Mobile e temi**: viewport 320 px e 390 px, tema chiaro e scuro, navigazione da
   tastiera e focus visibile, `prefers-reduced-motion` attivo.
6. **Backup**: esporta JSON → "Elimina tutti i dati" → importa → dati identici.

## Scenari di convalida (dalle user story)

| Scenario | Passi | Esito atteso |
|---|---|---|
| US1 registrazione | Nuova bottiglia → nome, tipo, 4ª bottiglia del punteggio → Salva | in cima al registro, ≤ 5 tocchi |
| US2 registro | cerca "baro", filtro Vino, modifica punteggio, elimina | lista aggiornata |
| US3 foto/note | 2 foto + nota con "- " | foto e elenco puntato in scheda |
| US4 posizione | Aggiungi posizione (consenso) → Mappa online/offline | segnaposto / messaggio |
| US5 backup | esporta, elimina tutto, importa; cambia `updatedAt` e reimporta | riepilogo nuove/aggiornate/invariate |
| US6 card | Condividi con e senza foto e link | PNG 1080×1920, link nel testo |
| US7 install/tema | banner installazione, cambio tema, riavvio | nessun flash, scelta ricordata |
| US8 barcode | icona fotocamera accanto al codice: codice noto online, codice nel registro offline; codice digitato a mano | riquadro di stato con le fasi, campi precompilati |
