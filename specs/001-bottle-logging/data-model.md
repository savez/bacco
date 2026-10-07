# Data Model: Bacco – Registro personale di bottiglie (MVP)

**Feature**: `001-bottle-logging` | **Date**: 2026-10-07

Database locale IndexedDB `bacco` (Dexie). Tutte le date sono stringhe ISO 8601 in UTC.

## Tabelle (schema v1)

```js
db.version(1).stores({
  bottles:  'id, consumedAt, updatedAt, type, barcode',
  photos:   'id, bottleId, [bottleId+order]',
  settings: 'key',
})
```

Solo i campi indicizzati compaiono nello schema; gli altri sono salvati comunque. I campi
`subtype`, `tasting`, `abv`, `pairing` (revisione UI 2026-10-07) non sono indicizzati: non
serve una nuova versione dello schema; i record precedenti senza questi campi valgono come
`null`/`''`.

### Bottle (`bottles`)

| Campo | Tipo | Obblig. | Validazione |
|---|---|---|---|
| `id` | string (UUID v4) | sì | generato con `crypto.randomUUID()`, immutabile |
| `name` | string | sì | trim, 1–120 caratteri |
| `producer` | string \| null | no | trim, ≤ 120 |
| `type` | `'wine'` \| `'beer'` | sì | enum |
| `subtype` | string \| null | no | trim, ≤ 40; uno dei valori predefiniti per il tipo (`src/lib/subtypes.js`) o testo libero ("Altro") |
| `appellation` | `'DOCG'` \| `'DOC'` \| `'IGT'` \| `'IGP'` \| null | no | solo se `type = 'wine'`, altrimenti `null` |
| `vintage` | integer \| null | no | 1900 ≤ v ≤ anno corrente |
| `rating` | integer | sì | 1–5 |
| `consumedAt` | string ISO | sì | default: adesso; non nel futuro (+5 min tolleranza) |
| `notes` | string | no (default `''`) | ≤ 5000 caratteri; trattato solo come testo |
| `abv` | number \| null | no | gradazione in % vol, 0–70, arrotondata al decimo |
| `tasting` | string | no (default `''`) | analisi organolettica personale (profumi, sapori…), testo libero ≤ 1000 |
| `pairing` | string | no (default `''`) | abbinamento ("con cosa l'ho mangiato"), testo libero ≤ 500 |
| `barcode` | string \| null | no | solo cifre, 8–14 caratteri |
| `externalUrl` | string \| null | no | URL valido con protocollo `https:`, ≤ 2048 |
| `location` | `{ lat, lon, accuracy }` \| null | no | lat −90..90, lon −180..180 (5 decimali), accuracy ≥ 0 (metri) |
| `createdAt` | string ISO | sì | impostato alla creazione |
| `updatedAt` | string ISO | sì | aggiornato a **ogni** modifica, anche delle foto |

Ricerca testuale (FR-005): filtro in memoria su `name` e `producer`, normalizzati (minuscolo,
senza accenti). Con 1.000 record resta ampiamente sotto 1 s (SC-005).

Suggerimenti (FR-007): valori distinti di `name` e `producer` già presenti.

Lookup barcode (FR-025): `bottles.where('barcode').equals(code)` ordinato per `consumedAt`
discendente, primo risultato.

### Photo (`photos`)

| Campo | Tipo | Note |
|---|---|---|
| `id` | string (UUID) | |
| `bottleId` | string | riferimento a `bottles.id` |
| `order` | integer | ordine di visualizzazione (0 = copertina) |
| `blob` | Blob (image/jpeg) | lato lungo ≤ 1600 px, senza EXIF |
| `thumb` | Blob (image/jpeg) | lato lungo 320 px |
| `createdAt` | string ISO | |

Eliminare una bottiglia elimina le sue foto nella stessa transazione.

### Setting (`settings`) — chiave/valore

| `key` | `value` |
|---|---|
| `theme` | `'system'` \| `'light'` \| `'dark'` (copiato anche in `localStorage` per `theme-init.js`) |
| `lastExportAt` | string ISO \| null |
| `backupReminderSnoozedAt` | string ISO \| null |
| `installPromptDismissedAt` | string ISO \| null |
| `firstUseAt` | string ISO |

### Livelli di punteggio (costante nel codice, non nel DB)

| Valore | Etichetta | Descrizione |
|---|---|---|
| 1 | Difettoso | Presenza di difetti evidenti (es. sentore di tappo, ossidazione eccessiva). |
| 2 | Non armonico / Bassa qualità | Bevanda squilibrata o di qualità percepita inferiore. |
| 3 | Piacevole / Corretto | Esperienza gradevole senza particolari lodi o critiche. |
| 4 | Ottimo / Molto tipico | Rappresentativa dello stile o dell'annata, equilibrata e più piacevole della media. |
| 5 | Eccellente / Memorabile | Esperienza straordinaria, da ricordare per complessità, eleganza o significato personale. |

## Regole e transizioni

- **Creazione**: `id`, `createdAt`, `updatedAt` = adesso; validazione completa prima della
  scrittura; bottiglia e foto scritte in un'unica transazione.
- **Modifica**: validazione completa, `updatedAt` = adesso.
- **Eliminazione**: rimozione definitiva di bottiglia + foto (nessun cestino).
- **Elimina tutti i dati**: svuota le tre tabelle e `localStorage`.
- **Importazione (unione)**: vedi `contracts/backup-format.md`. Transazione unica su
  `bottles` + `photos`; se un record non è valido, l'intera importazione viene annullata.
- **Promemoria backup**: visibile se `bottles.count() > 0` e
  `adesso − max(lastExportAt ?? firstUseAt, backupReminderSnoozedAt ?? 0) > 30 giorni`.
  "Più tardi" imposta `backupReminderSnoozedAt` (nuovo promemoria dopo altri 30 giorni,
  coerente con "ricordamelo più tardi").

## Migrazioni

- **v2** (2026-10-07): `aromas` e `taste` vengono uniti in `tasting`
  (`"Profumi: …\nSapore: …"`, solo le parti presenti) e rimossi. Schema degli indici invariato.
  Anche l'importazione accetta backup con `aromas`/`taste` e li unisce allo stesso modo.

Ogni cambiamento di schema aggiunge `db.version(n+1)` con `.upgrade(tx => …)` e un test
Vitest che crea un DB alla versione precedente con `fake-indexeddb`, lo apre alla nuova e
verifica i dati. Le versioni precedenti non vengono mai rimosse dal codice.
