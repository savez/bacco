# Changelog

Tutte le modifiche rilevanti del progetto sono documentate in questo file, generato da
[release-please](https://github.com/googleapis/release-please) a partire dai
[Conventional Commits](https://www.conventionalcommits.org/it/).

## [1.8.0](https://github.com/savez/bacco/compare/v1.7.0...v1.8.0) (2026-10-08)


### ✨ Novità

* filtro Tipo a menu e Nome senza suggerimenti ([#22](https://github.com/savez/bacco/issues/22)) ([95040cc](https://github.com/savez/bacco/commit/95040cc867eca162a3b6681d54848fb522b92015))

## [1.7.0](https://github.com/savez/bacco/compare/v1.6.0...v1.7.0) (2026-10-08)


### ✨ Novità

* filtro Tipologia in Diario e Cantina ([e61ac72](https://github.com/savez/bacco/commit/e61ac72f0e642cb1b4169a95ae158b647fedc933))


### 🐛 Correzioni

* il Produttore del modulo bottiglia è un campo di testo semplice, senza il menu a tendina dei suggerimenti ([e61ac72](https://github.com/savez/bacco/commit/e61ac72f0e642cb1b4169a95ae158b647fedc933))

## [1.6.0](https://github.com/savez/bacco/compare/v1.5.0...v1.6.0) (2026-10-08)


### ✨ Novità

* wishlist dei vini e delle birre da provare ([e4ac831](https://github.com/savez/bacco/commit/e4ac8312cd9423eb5cbe46042544a202877fa953))
* wishlist dei vini e delle birre da provare ([5c94556](https://github.com/savez/bacco/commit/5c94556a28a3a9a8a732ef8c6c81addb12f823f4))

## [1.5.0](https://github.com/savez/bacco/compare/v1.4.0...v1.5.0) (2026-10-08)


### ✨ Novità

* vitigno del vino ([f9e1616](https://github.com/savez/bacco/commit/f9e16165f32a219dd6d35c7030a22a9b9df4386e))
* vitigno del vino con menu a tendina e Altro ([566fb5d](https://github.com/savez/bacco/commit/566fb5da42fa2f195126a86aa8c9256132d48fbd))

## [1.4.0](https://github.com/savez/bacco/compare/v1.3.0...v1.4.0) (2026-10-07)


### ✨ Novità

* nuova interfaccia "Cantina viva" con note organolettiche a chip ([59445d3](https://github.com/savez/bacco/commit/59445d339acc456d6da4a885caf1f53daea9836f))
* nuova interfaccia "Cantina viva" con note organolettiche a chip ([ec3f40e](https://github.com/savez/bacco/commit/ec3f40e1f8de76d32a481edeadbd0f025700bffc))

## [1.3.0](https://github.com/savez/bacco/compare/v1.2.0...v1.3.0) (2026-10-07)


### ✨ Novità

* contrassegno di Stato al posto della ricerca da codice a barre ([b87196c](https://github.com/savez/bacco/commit/b87196c5af13480634307eafcb4bde79b1be25ea))
* contrassegno di Stato; fix salvataggio appeso e mappa ([e025080](https://github.com/savez/bacco/commit/e0250803049bd95ba9219348e58927a9a00f8118))


### 🐛 Correzioni

* il salvataggio non resta più appeso e la mappa resta nel suo riquadro ([b414b06](https://github.com/savez/bacco/commit/b414b069c337e66fe833f1aa58a41397e992cddb))

## [1.2.0](https://github.com/savez/bacco/compare/v1.1.0...v1.2.0) (2026-10-07)


### ✨ Novità

* modulo di registrazione riordinato in sequenza logica ([bcb4a6f](https://github.com/savez/bacco/commit/bcb4a6f1817a012c4280bebf7a7d0cadd9f5a1d2))
* modulo di registrazione riordinato in sequenza logica ([7d7d239](https://github.com/savez/bacco/commit/7d7d239c0feab9a3d3d700732c7f49a50b48ff15))


### 🐛 Correzioni

* bottiglie in cantina da 0 (bevuta subito) e registro movimenti in un accordion ([587ce2f](https://github.com/savez/bacco/commit/587ce2ff0441fb7ebbbbc3aab1c2b112729a734f))
* bottiglie in cantina da 0 e registro movimenti in un accordion ([5c0629a](https://github.com/savez/bacco/commit/5c0629a113c97d92bb2d0e33a158f8a9e2cfdfea))

## [1.1.0](https://github.com/savez/bacco/compare/v1.0.0...v1.1.0) (2026-10-07)


### ✨ Novità

* cantina personale ([d39c07f](https://github.com/savez/bacco/commit/d39c07fcfb1234e32ab6d7b9e01c445708257738))
* cantina personale ([2634b2a](https://github.com/savez/bacco/commit/2634b2ae0575e94ca367dab8e34225bc01fa299b))
* invito all'installazione in un modale dopo 10 secondi ([cdf8ce9](https://github.com/savez/bacco/commit/cdf8ce95b7b761273e5bedd9f5bdd4a973adf882))
* invito all'installazione in un modale dopo 10 secondi ([6f00aa3](https://github.com/savez/bacco/commit/6f00aa3b50b8294be9f3417a7c4586bd9dde3c79))
* link al sito del progetto bacco.smzstudio.it in Impostazioni e nel README ([fc0677e](https://github.com/savez/bacco/commit/fc0677edde830d93f6f9195c19e99944dc3332de))

## 1.0.0 (2026-10-07)

Prima versione pubblica.

### ✨ Novità

- Registro delle bottiglie di vino e birra bevute, salvato solo sul dispositivo (IndexedDB).
- Modulo di registrazione con foto (fotocamera nell'app o galleria), codice a barre con
  scansione, tipo e sottocategoria, denominazione (DOCG, DOC, IGT, IGP), annata, gradazione,
  punteggio da 1 a 5 a forma di bottiglia, analisi organolettica personale, abbinamento,
  note in markdown semplificato, data, ora e posizione facoltativa.
- Ricerca su Open Food Facts dal codice a barre, che compila solo i campi vuoti e mostra
  lo stato della richiesta.
- Registro con ricerca e filtri per tipo, anno e mese, raggruppato per mese.
- Dettaglio e modifica in un pannello modale.
- Mappa personale dei luoghi di consumo (OpenStreetMap).
- Card da condividere in stile social, dal dettaglio e dall'elenco.
- Backup ed export in JSON (con foto) e CSV, import JSON, promemoria di backup dopo 30 giorni.
- PWA installabile e funzionante offline, con invito all'installazione e avviso di aggiornamento.
- Tema chiaro e scuro con selettore e guida ai permessi di fotocamera e posizione.
