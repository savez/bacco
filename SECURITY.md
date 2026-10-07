# Security Policy

## Versioni supportate

| Versione                          | Supportata |
| --------------------------------- | ---------- |
| Ultima release su `main` (v1.x)   | ✅         |
| Versioni precedenti               | ❌         |

## Come segnalare una vulnerabilità

Se trovi una vulnerabilità, **non aprire una issue pubblica**.

Usa **GitHub Security Advisories**: la segnalazione resta privata tra te e il maintainer.

🔗 <https://github.com/savez/bacco/security/advisories/new>

In alternativa scrivi a [@savez](https://github.com/savez) su GitHub.

### Cosa includere

- Descrizione della vulnerabilità
- Passi per riprodurla (meglio con un PoC)
- Versione o commit interessato
- Impatto stimato

### Tempi di risposta

Progetto personale open source, quindi best effort:

- **Presa in carico**: entro 72 ore
- **Correzione o mitigazione**: entro 14 giorni per gravità alta, best effort per le altre

## Modello di sicurezza

Bacco è una PWA **senza backend**. I principi sono fissati nella
[costituzione del progetto](.specify/memory/constitution.md):

- **I dati del registro non lasciano mai il dispositivo.** Bottiglie, foto, note e
  coordinate vivono solo nell'IndexedDB del browser. Non c'è login, analytics o telemetria.
- **Rete solo in lettura e solo verso servizi pubblici elencati nella CSP**:
  - `tile.openstreetmap.org`: tessere della mappa (riceve solo le coordinate della tessera visualizzata);
  - `world.openfoodfacts.org`: ricerca per codice a barre (riceve solo il codice).
- **Content Security Policy restrittiva** (`script-src 'self'`, niente script inline, niente
  `eval` tranne `wasm-unsafe-eval` per il decoder dei codici a barre), definita sia in
  [docker/nginx-security-headers.conf](docker/nginx-security-headers.conf) sia in
  [render.yaml](render.yaml).
- **Permessi minimi**: fotocamera e posizione solo su richiesta esplicita dell'utente, mai all'avvio.
- **Nessun HTML dell'utente renderizzato**: le note in markdown semplificato sono trasformate
  in nodi Vue (la regola ESLint `vue/no-v-html` è impostata a errore).
- **Import dei backup validato** prima della scrittura nel database.

## Strumenti attivi

- **CI** (lint, test, build) su ogni PR
- **commitlint** sui messaggi di commit (Conventional Commits)
- **Dependabot** per aggiornamenti e avvisi di sicurezza delle dipendenze
- **Branch protection** su `main`: PR obbligatoria e controlli verdi prima del merge

## Divulgazione

Una volta confermato e corretto il problema:

1. pubblico una GitHub Security Advisory con i dettagli (CVE se applicabile);
2. cito chi l'ha segnalato, se lo desidera;
3. la correzione compare nel CHANGELOG con riferimento all'advisory.

## Fuori ambito

- Non esiste un server del maintainer da attaccare: l'istanza pubblica serve solo file statici.
- Le vulnerabilità del browser o del sistema operativo dell'utente.
- L'accesso fisico a un dispositivo sbloccato (i dati locali non sono cifrati).
- I contenuti restituiti da Open Food Facts (dati pubblici di terzi, mostrati come testo).

## Licenza

Rilasciato sotto licenza MIT (vedi [LICENSE](LICENSE)), senza garanzie, "AS IS".
