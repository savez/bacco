# Changelog

Tutte le modifiche rilevanti del progetto sono documentate in questo file, generato da
[release-please](https://github.com/googleapis/release-please) a partire dai
[Conventional Commits](https://www.conventionalcommits.org/it/).

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
