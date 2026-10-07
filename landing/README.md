# Landing di Bacco

Sito di presentazione pubblicato su GitHub Pages (<https://bacco.smzstudio.it>, dominio personalizzato configurato in Settings → Pages).

> ⚠️ Vive solo sul branch **`landing`**, che **non va mai unito a `main`**: la CI blocca
> qualsiasi PR da `landing` verso `main`.

## Sviluppo

```bash
git switch landing
docker compose up landing     # http://localhost:4321/bacco/ (in locale il percorso resta /bacco/)
```

## Pubblicazione

Ogni push su `landing` avvia `.github/workflows/pages.yml`: build Astro e pubblicazione su
GitHub Pages. Il workflow parte anche dopo ogni release su `main`, per aggiornare la
versione mostrata nel footer (letta da `main:package.json`).

Indirizzo e percorso del sito arrivano da `actions/configure-pages`: con un dominio
personalizzato (Settings → Pages → Custom domain) il sito passa da `/bacco/` a `/` da solo.
