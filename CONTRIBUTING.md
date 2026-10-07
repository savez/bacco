# Contributing

Grazie per l'interesse a contribuire a **Bacco**! È una piccola PWA personale, ma issue e
pull request sono benvenute.

## Principi del progetto

Sono le regole non negoziabili: una PR che le viola non viene accettata.

1. **Semplicità (KISS e YAGNI).** Si costruisce solo ciò che serve oggi, nel modo più
   semplice. Ogni nuova dipendenza va motivata.
2. **Dati solo locali.** Bottiglie, foto, note e posizioni restano nell'IndexedDB del
   dispositivo: niente backend, account, analytics o telemetria. Le sole richieste di rete
   ammesse sono in sola lettura verso servizi pubblici elencati nella CSP (oggi solo le
   tessere di OpenStreetMap) e ricevono solo il minimo indispensabile. Niente
   `v-html`, niente script inline, input sempre validati.
3. **Offline-first.** Registrare, modificare e consultare il registro funziona senza rete;
   le funzioni di rete degradano senza bloccare nulla.
4. **Mobile-first e accessibile.** Progettato prima per il telefono (da 360 px), con WCAG
   2.1 AA: contrasto, tastiera, lettori di schermo, area di tocco di almeno 44 px.
5. **Tema chiaro e scuro** con selettore, entrambi curati allo stesso modo.
6. **Sviluppo con Docker.** Ogni comando (sviluppo, test, build) passa da `docker compose`.

## Ambiente di sviluppo

Sull'host serve **solo Docker** (Docker Desktop o equivalente con `docker compose`).
Node e npm girano nei container, così tutti usano la stessa versione (Node 24).

1. Forka il repo e clona il tuo fork:
   ```bash
   git clone https://github.com/<tuo-username>/bacco.git
   cd bacco
   ```
2. Avvia il server di sviluppo:
   ```bash
   docker compose up dev
   ```
   → <http://localhost:5173/> con ricaricamento automatico. Nessuna configurazione o
   variabile d'ambiente richiesta.
3. Comandi utili (in un altro terminale, con `dev` avviato):
   ```bash
   docker compose exec dev npm run lint
   docker compose exec dev npm test
   docker compose exec dev npm run build
   docker compose exec dev npm install <pacchetto>   # aggiorna anche package-lock.json
   ```
4. Per provare la PWA come in produzione (service worker, installazione, intestazioni CSP):
   ```bash
   docker compose up --build web
   ```
   → <http://localhost:8080> e <https://localhost:8443>. Per provarla da telefono vedi
   [sotto](#provare-dal-telefono).

In sviluppo la console del browser espone `window.__baccoSeed(n)` per riempire il registro
con `n` bottiglie di prova.

## Provare dal telefono

Fotocamera, posizione, service worker e installazione funzionano solo in un contesto
sicuro: sul Mac va bene `http://localhost`, dal telefono serve HTTPS.

1. Installa [`mkcert`](https://github.com/FiloSottile/mkcert) (`brew install mkcert`) ed esegui `mkcert -install`.
2. Genera il certificato per l'IP del computer in rete locale:
   ```bash
   mkcert -cert-file docker/certs/bacco.pem -key-file docker/certs/bacco-key.pem localhost <IP-LAN>
   ```
   (`docker/certs/` è in `.gitignore`).
3. Installa sul telefono la CA di mkcert (`mkcert -CAROOT` → `rootCA.pem`):
   - iPhone: inviala con AirDrop, installa il profilo, poi Impostazioni → Generali → Info →
     Impostazioni certificati → abilita la fiducia completa;
   - Android: Impostazioni → Sicurezza → Installa certificato CA.
4. `docker compose up --build web` e apri `https://<IP-LAN>:8443` dal telefono, sulla stessa rete Wi-Fi.

## Flusso di lavoro

1. **Apri prima una issue** per modifiche grandi (nuove funzioni, refactor, breaking change).
   Per correzioni piccole e ovvie puoi passare direttamente al punto 2.
2. Crea un branch da `main` aggiornato:
   ```bash
   git checkout main && git pull
   git checkout -b feat/<descrizione-breve>
   ```
   Prefissi: `feat/`, `fix/`, `chore/`, `docs/`.
3. Scrivi codice e test. Prima di aprire la PR devono passare lint, test e build (vedi sopra).
4. Messaggi di commit in formato
   **[Conventional Commits](https://www.conventionalcommits.org/it/) — obbligatorio**
   (validato in CI dal workflow `commitlint.yml`):
   - `feat(scope): descrizione` — nuova funzione (versione minor)
   - `fix(scope): descrizione` — correzione (versione patch)
   - `perf(scope): …`, `refactor(scope): …` — versione patch
   - `docs: …` — documentazione
   - `chore: …`, `test: …`, `ci: …`, `build: …`, `style: …` — manutenzione, fuori dal CHANGELOG
   - `feat!: …` o footer `BREAKING CHANGE: …` — versione major

   > 🤖 CHANGELOG e release sono generati da
   > [release-please](https://github.com/googleapis/release-please) a partire dai commit:
   > non modificare `CHANGELOG.md` a mano.

5. Pubblica il branch sul tuo fork e apri una PR verso `main`, compilando il template.

> Il repo non usa hook Git (Husky): girerebbero con Node sull'host, contro la regola
> "tutto passa da Docker". Gli stessi controlli girano in CI su ogni PR.

## Cosa aspettarti nella review

- `main` è protetto: si modifica solo con una PR, che deve avere la CI verde (lint, test,
  build, commitlint) e l'approvazione del maintainer (vedi `.github/CODEOWNERS`).
- Il maintainer rivede la PR e può chiedere modifiche.
- Dopo il merge su `main`, Render pubblica la nuova versione e release-please aggiorna la
  PR di rilascio.

## Stile

- **JavaScript puro**, niente TypeScript.
- **Vue 3** con Composition API e `<script setup>`; **Tailwind CSS 4** con i token colore
  definiti in `src/assets/main.css` (`botte`, `doga`, `gesso`, `cenere`, `feccia`,
  `luppolo`, `rame`). Le classi Tailwind vanno scritte per intero: niente `fill-${tono}`.
- Testi dell'interfaccia in italiano, con un linguaggio semplice e orientato all'azione.
- Ogni schermata deve funzionare a 360 px di larghezza, in tema chiaro e scuro, con la
  tastiera e con un lettore di schermo; area di tocco di almeno 44 px.
- Nessuna nuova richiesta di rete senza modificare la costituzione e la CSP.
- File piccoli, una responsabilità per file. Test con Vitest per la logica pura e il
  database (con `fake-indexeddb`).

## Struttura

```text
src/
├── views/        # schermate (registro, modulo, dettaglio, mappa, impostazioni)
├── components/   # componenti riusabili
├── composables/  # stato condiviso (banner, fotocamera, aggiornamenti PWA…)
├── db/           # Dexie / IndexedDB
├── backup/       # export JSON e CSV, import JSON
└── lib/          # logica pura testata (validazione, formati, cantina…)
tests/            # Vitest
docker/           # nginx per il servizio "web"
```

## Domande

Apri una issue o una [discussione](https://github.com/savez/bacco/discussions).
