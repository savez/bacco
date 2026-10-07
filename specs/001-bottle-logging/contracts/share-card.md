# Contract: card di condivisione

Immagine PNG 1080×1920 (9:16, formato storie), file `bacco-<nome-normalizzato>.png`.
Sempre nel tema "cantina" (scuro), indipendentemente dal tema dell'app.

```text
┌────────────────────────┐
│ foto copertina a tutto │  ← senza foto: sfondo tematico (vino: feccia,
│ schermo, scurita con   │    birra: luppolo, su botte) + filigrana a tacche
│ sfumatura verso il     │
│ basso                  │
│                        │
│ HO BEVUTO · VINO ROSSO DOCG │  stencil, 48 px, cenere (sottocategoria e denominazione se presenti)
│ BAROLO CANNUBI         │  stencil, ≤ 3 righe, 120→72 px adattivo
│ Borgogno · 2019 · 14% vol │  Atkinson 44 px (gradazione se presente)
│ ★★★★☆  4/5             │  stelle + numero, 56 px
│ Ottimo / Molto tipico  │  Atkinson 36 px
│ "Rosa, catrame,        │  estratto note: ≤ 140 caratteri, ≤ 3 righe,
│  ciliegia…"            │  troncato a parola con "…"
│ ────────────────────── │  filetto rame
│ BACCO   bacco.smzstudio.it │  marchio stencil 56 px gesso + sito Atkinson 32 px cenere
└────────────────────────┘
```

- Margini 80 px; testo sempre sopra una sfumatura che garantisce contrasto ≥ 4,5:1.
- Gli elenchi delle note diventano testo continuo separato da virgole.
- Il marchio "Bacco" e il sito `bacco.smzstudio.it` sono sempre presenti (promozione,
  revisione UI 2026-10-07). Nessun QR, nessun dato di posizione, nessun link ai dati dell'utente.

## Condivisione

```js
const file = new File([png], name, { type: 'image/png' })
const head = bottle.externalUrl ? `${bottle.name} — ${bottle.externalUrl}` : bottle.name
const text = `${head}\n\nRegistrato con Bacco · https://bacco.smzstudio.it`
if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text })
else download(file)
```

`AbortError` (utente annulla) → nessun messaggio.
