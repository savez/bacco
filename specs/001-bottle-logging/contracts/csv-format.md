# Contract: esportazione CSV

File: `bacco-registro-YYYY-MM-DD.csv`, UTF-8 **con BOM** (per Excel), separatore `;`
(compatibile con Excel in locale italiano), fine riga `\r\n`, quoting RFC 4180 (campi tra
`"` se contengono `;`, `"`, a capo; `"` raddoppiate).

Colonne, in ordine:

| Colonna | Valore |
|---|---|
| `id` | UUID |
| `data_consumo` | `YYYY-MM-DD HH:mm` nell'ora locale del dispositivo |
| `nome` | |
| `produttore` | vuoto se assente |
| `tipo` | `vino` \| `birra` |
| `sottocategoria` | es. `Rosso`, `Stout`; vuoto se assente |
| `denominazione` | `DOCG` \| `DOC` \| `IGT` \| `IGP`; vuoto se assente o birra |
| `annata` | vuoto se assente |
| `gradazione` | % vol, punto decimale; vuoto se assente |
| `punteggio` | 1–5 |
| `punteggio_etichetta` | es. `Ottimo / Molto tipico` |
| `analisi_organolettica` | |
| `abbinamento` | |
| `note` | testo integrale |
| `codice_a_barre` | |
| `link_scheda` | |
| `latitudine` | punto decimale |
| `longitudine` | punto decimale |
| `numero_foto` | intero |

Righe ordinate per `data_consumo` discendente. Foto escluse.

**Protezione da formula injection**: se un campo di testo inizia con `=`, `+`, `-`, `@`,
tab o CR, viene prefissato con `'` (le note che iniziano con "- " restano leggibili).
Il CSV è solo esportazione: non viene importato.
