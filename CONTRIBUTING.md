# Contributing

Grazie per l'interesse a contribuire a **Bacco**! È una piccola PWA personale, ma issue e
pull request sono benvenute.

Prima di iniziare leggi la [costituzione del progetto](.specify/memory/constitution.md): sono
le regole non negoziabili (KISS/YAGNI, dati solo locali, offline-first, mobile-first,
accessibilità WCAG AA, sviluppo con Docker).

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
   [quickstart.md](specs/001-bottle-logging/quickstart.md).

In sviluppo la console del browser espone `window.__baccoSeed(n)` per riempire il registro
con `n` bottiglie di prova.

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

- La CI deve essere verde (lint, test, build, commitlint).
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
└── lib/          # logica pura testata (validazione, formati, Open Food Facts…)
specs/            # specifiche spec-kit: requisiti, piano, contratti, task
tests/            # Vitest
docker/           # nginx per il servizio "web"
```

## Domande

Apri una issue o una [discussione](https://github.com/savez/bacco/discussions).
