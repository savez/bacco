# Changelog

Tutte le modifiche rilevanti del progetto sono documentate in questo file, generato da
[release-please](https://github.com/googleapis/release-please) a partire dai
[Conventional Commits](https://www.conventionalcommits.org/it/).

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
