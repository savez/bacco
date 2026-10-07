# Contract: formato di backup JSON

File scaricato: `bacco-backup-YYYY-MM-DD.json` (UTF-8).

```json
{
  "app": "bacco",
  "formatVersion": 1,
  "exportedAt": "2026-10-07T18:30:00.000Z",
  "bottles": [
    {
      "id": "6f1c…",
      "name": "Barolo Cannubi",
      "producer": "Borgogno",
      "type": "wine",
      "vintage": 2019,
      "subtype": "Rosso",
      "appellation": "DOCG",
      "abv": 14,
      "tasting": "Profumi di ciliegia e viola; tannico, lungo",
      "pairing": "brasato",
      "rating": 4,
      "consumedAt": "2026-10-07T18:00:00.000Z",
      "notes": "Rosa, catrame\n- ciliegia\n- liquirizia",
      "barcode": "8000000000000",
      "externalUrl": "https://example.com/scheda.pdf",
      "location": { "lat": 44.61234, "lon": 7.93456, "accuracy": 25 },
      "createdAt": "2026-10-07T18:01:00.000Z",
      "updatedAt": "2026-10-07T18:05:00.000Z",
      "photos": [
        { "id": "a1b2…", "order": 0, "createdAt": "…", "mime": "image/jpeg",
          "data": "<base64>" }
      ]
    }
  ]
}
```

I campi `subtype`, `appellation`, `abv`, `tasting`, `pairing` sono facoltativi: un backup senza di essi
resta valido con `formatVersion: 1`. Un backup con i vecchi campi `aromas`/`taste` viene
accettato e i due campi vengono uniti in `tasting` (data-model.md, migrazione v2).

Le impostazioni (tema, date dei promemoria) **non** fanno parte del backup. Le miniature
non sono incluse: vengono rigenerate all'importazione. L'export è costruito come
`new Blob([...parti])`, una parte per bottiglia, senza creare un'unica stringa in memoria.

## Regole di importazione

1. Dimensione file ≤ 300 MB (oltre: "Backup troppo grande per questo dispositivo"); lettura con `File.text()`, `JSON.parse` in try/catch.
2. `app === "bacco"` e `formatVersion` supportato (oggi: `1`); altrimenti errore
   "Il file non è un backup di Bacco…" oppure "Backup creato da una versione più recente di
   Bacco. Aggiorna l'app e riprova."
3. Ogni bottiglia e foto validata con le stesse regole di `data-model.md`; `mime` solo
   `image/jpeg`; base64 decodificato in `Blob`. Campi sconosciuti ignorati.
4. Al primo errore: nessuna scrittura, messaggio con indice e campo non valido.
5. Unione in un'unica transazione:
   - `id` assente nel DB → aggiunta (bottiglia + foto);
   - `id` presente e `updatedAt` del backup > locale → sostituzione di bottiglia **e** foto;
   - altrimenti → invariata.
6. Riepilogo: "Importate: N nuove, M aggiornate, K invariate."
7. Dopo un'importazione riuscita `lastExportAt` **non** cambia.

## Versioni future

Un nuovo `formatVersion` richiede una funzione di conversione `vN → vN+1` e il test
corrispondente; i backup delle versioni precedenti restano importabili.
