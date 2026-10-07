# Contract: ricerca su Open Food Facts

## Richiesta

```http
GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json?fields=code,product_name,product_name_it,brands,categories_tags,labels_tags,nutriments
```

- `{barcode}`: solo cifre, 8–14 (validato prima della richiesta).
- Nessun header personalizzato, nessun cookie (`credentials: 'omit'`), timeout 6 s.
- Inviata solo se il codice non è già nel registro e `navigator.onLine === true`.
- Unico dato inviato: il codice a barre.

## Risposta attesa (estratto)

```json
{ "status": 1, "code": "8000000000000",
  "product": { "product_name": "…", "product_name_it": "…", "brands": "Marca A, Marca B",
               "categories_tags": ["en:beverages", "en:alcoholic-beverages", "en:wines"] } }
```

`status: 0` o HTTP 404 → "non trovato".

## Mappatura sui campi del modulo

| Campo modulo | Origine | Regola |
|---|---|---|
| `name` | `product_name_it` → `product_name` | primo non vuoto, trim, max 120 |
| `producer` | `brands` | primo valore prima della virgola, trim, max 120 |
| `type` | `categories_tags` | contiene un tag che termina in `wines`/`wine` → `wine`; `beers`/`beer` → `beer`; altrimenti non precompilato |
| `subtype` | `categories_tags` | `red-wines`→Rosso, `white-wines`→Bianco, `rose-wines`→Rosato, `sparkling-wines`/`champagnes`/`proseccos`→Bollicine, `sweet-wines`/`dessert-wines`→Passito; `lagers`→Lager, `pilsners`→Pils, `ipa`→IPA, `ales`→Ale, `stouts`→Stout, `porters`→Porter, `wheat-beers`→Wheat, `bocks`→Bock, `sour-beers`→Sour; altrimenti non precompilato |
| `appellation` | `labels_tags` | solo per il vino: tag che termina in `docg`→DOCG, `doc`→DOC, `igt`→IGT, `igp`/`pgi`→IGP; altrimenti non precompilato |
| `abv` | `nutriments.alcohol_100g` → `nutriments.alcohol` | numero tra 0 e 70, arrotondato al decimo; altrimenti non precompilato |
| `vintage` | — | mai precompilato |

Ogni valore: rimozione caratteri di controllo, usato solo come testo (interpolazione Vue).
I campi già compilati dall'utente non vengono sovrascritti.

## Esiti verso l'utente

Mostrati nel riquadro di stato sotto il codice (FR-027a), non come banner, in sequenza:

| Fase / esito | Testo |
|---|---|
| validità codice | "EAN-13 · cifra di controllo corretta" oppure "Cifra di controllo non corretta: ricontrolla il numero" |
| ricerca locale | "Cerco nel tuo registro…" |
| trovato nel registro | "Trovato nel tuo registro: compilati nome, produttore…" |
| ricerca online | "Cerco su Open Food Facts…" (indicatore di attività) |
| trovato | "Trovato su Open Food Facts: compilati nome, produttore, tipo" |
| non trovato | "Codice non trovato su Open Food Facts. Compila a mano." |
| offline | "Sei offline: compila a mano. Il codice è stato salvato." |
| errore/timeout | "Open Food Facts non risponde. Compila a mano." |
