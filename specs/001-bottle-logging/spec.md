# Feature Specification: Bacco – Registro personale di bottiglie (MVP)

**Feature Branch**: `001-bottle-logging`
**Created**: 2026-10-07
**Status**: Draft
**Input**: User description: "Specifiche funzionali del progetto Bacco (Draft, 2026-10-04): PWA per il
tracciamento personale del consumo di vino e birra; registrazione di bottiglie con identificazione,
punteggio 1–5 descritto, foto, note, GPS opzionale; offline completo, installabilità, promemoria di
backup a 30 giorni, tema scuro ispirato alle cantine, esportazione JSON/CSV, card di condivisione;
integrazioni esterne e riconoscimento etichette via LLM da verificare. Per UI/UX usare
/frontend-design."

## Clarifications

### Session 2026-10-07

- Q: Come l'utente rivede i luoghi delle proprie esperienze? → A: Si salvano le coordinate e
  una pagina "Mappa" mostra le bottiglie su una mappa. Precisazione dell'utente: "offline"
  riguarda l'archiviazione dei dati e la registrazione; la mappa (e in futuro le API per i dati
  DOCG) può usare la rete in sola lettura.
- Q: La card di condivisione deve includere un link alla scheda della bottiglia? → A: No. La
  card è un'immagine in stile "Spotify" da pubblicare sui social per dire "ho bevuto questa
  bottiglia". Al massimo può accompagnarla il link alla scheda tecnica/organolettica su un
  sito esterno, se l'utente l'ha inserito.
- Q: All'importazione di un backup, cosa succede alle bottiglie già presenti? → A: Unione: le
  nuove vengono aggiunte; per quelle presenti in entrambi si tiene la versione con data di
  ultima modifica più recente.
- Q: Quali ricerche online includere nella prima versione? → A: Lettura del codice a barre con
  ricerca dei dati della bevanda su Open Food Facts. Le altre integrazioni (DOCG, Wikidata,
  riconoscimento etichette con LLM) restano fuori ambito.

### Session 2026-10-07 (revisione UI/UX dopo la prima prova)

- Q: Come va mostrato il punteggio? → A: Non a tacche: 5 icone a forma di bottiglia, di vino o
  di birra in base al tipo scelto, piene fino al voto (simile alle stelline, ma a tema).
- Q: I dettagli facoltativi restano in una sezione a fisarmonica? → A: No, tutti i campi sono
  visibili nel modulo, divisi in gruppi con un titolo.
- Q: Come si legge il codice a barre? → A: Campo di testo con il codice + icona fotocamera
  accanto; l'icona apre subito la fotocamera in scansione.
- Q: "Scatta foto" cosa apre? → A: La fotocamera direttamente, dentro l'app (non la scelta file).
- Q: La card contiene un riferimento a Bacco? → A: Sì: nome "Bacco" e indirizzo del sito del
  progetto `bacco.smzstudio.it`, a scopo promozionale (sostituisce la risposta precedente
  "nessun link a Bacco"). Resta vietato qualsiasi link ai dati dell'utente.
- Q: Come si capisce che la ricerca su Open Food Facts è in corso? → A: Un riquadro di stato
  sotto il codice mostra in tempo reale validità del codice, ricerca nel registro, ricerca
  online ed esito (campi compilati, non trovato, offline, errore).
- Q: Quali campi mancano? → A: Profumi, sapore, abbinamento ("con cosa l'ho mangiato") e una
  sottocategoria: vino Rosso, Bianco, Rosato, Bollicine, Passito; birra Lager, Pils, IPA, Ale,
  Dubbel, Tripel, Bock, Stout, Porter, Wheat, Sour, più "Altro" con testo libero.

### Session 2026-10-07 (filtri per periodo)

- Q: Come filtrare il registro nel tempo? → A: Filtri per anno e per mese, combinabili con
  ricerca e tipo.

### Session 2026-10-07 (denominazione)

- Q: Serve la denominazione del vino? → A: Sì, solo per il vino: DOCG, DOC, IGT, IGP
  (facoltativa). Nessuna API per i dati DOCG in questa versione: resta fuori ambito.

### Session 2026-10-07 (analisi e gradazione)

- Q: Profumi e sapore restano separati? → A: No, un unico campo testuale "Analisi
  organolettica personale" (sostituisce profumi e sapore; i dati già inseriti vengono uniti).
- Q: Serve la gradazione? → A: Sì, campo "Gradazione" in % vol, facoltativo.

### Session 2026-10-07 (permessi)

- Q: Cosa succede se la fotocamera o la posizione sono bloccate (es. su Mac non compare la
  richiesta)? → A: Un riquadro spiega il motivo e come sbloccarle (browser e sistema
  operativo), con "Riprova"; in Impostazioni c'è una sezione Permessi con stato e richiesta.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrare una bottiglia in pochi tap (Priority: P1)

L'utente ha appena bevuto (o sta bevendo) un vino o una birra. Apre Bacco, tocca il pulsante
principale "Nuova bottiglia", inserisce nome, sceglie il tipo (vino/birra), assegna un punteggio
da 1 a 5 e salva. Produttore e annata sono facoltativi. Ogni livello del punteggio mostra la sua
descrizione, così l'utente valuta in modo coerente nel tempo.

**Why this priority**: è l'operazione primaria del prodotto; senza di essa Bacco non ha valore.
Da sola costituisce già un MVP utilizzabile.

**Independent Test**: con il dispositivo offline, registrare una bottiglia con i soli campi
obbligatori, chiudere e riaprire l'app e verificare che la bottiglia sia presente.

**Acceptance Scenarios**:

1. **Given** l'app aperta sulla schermata principale, **When** l'utente tocca "Nuova bottiglia",
   inserisce nome, tipo e punteggio e conferma, **Then** la bottiglia viene salvata con data e ora
   di consumo correnti e compare in cima al registro.
2. **Given** il modulo di registrazione aperto, **When** l'utente seleziona un livello di
   punteggio, **Then** viene mostrata l'etichetta e la descrizione del livello (es. "4 – Ottimo /
   Molto tipico: …").
3. **Given** il modulo con il nome vuoto o senza punteggio, **When** l'utente tenta di salvare,
   **Then** il salvataggio è impedito e il campo mancante è segnalato in modo chiaro e accessibile.
4. **Given** il dispositivo senza connessione, **When** l'utente registra una bottiglia, **Then**
   l'operazione riesce esattamente come online.

---

### User Story 2 - Consultare, modificare ed eliminare il registro (Priority: P2)

L'utente scorre il proprio registro in ordine cronologico inverso, apre la scheda di una
bottiglia, ne corregge i dati oppure la elimina. Può cercare per nome o produttore e filtrare
per tipo (vino/birra).

**Why this priority**: il registro rende utile nel tempo ciò che è stato salvato; correggere
errori è indispensabile per la fiducia nei dati.

**Independent Test**: con alcune bottiglie salvate, cercarne una per nome, modificarne il
punteggio, eliminarne un'altra e verificare che lista e scheda riflettano le modifiche.

**Acceptance Scenarios**:

1. **Given** un registro con più bottiglie, **When** l'utente apre l'app, **Then** vede la lista
   ordinata dalla più recente e raggruppata per mese, con nome, produttore, tipo e punteggio.
2. **Given** la scheda di una bottiglia, **When** l'utente modifica un campo e salva, **Then** la
   modifica è persistita e visibile in lista e scheda.
3. **Given** la scheda di una bottiglia, **When** l'utente sceglie "Elimina" e conferma, **Then**
   la bottiglia e le sue foto vengono rimosse definitivamente.
4. **Given** il registro, **When** l'utente digita un testo nella ricerca o seleziona un tipo,
   **Then** la lista mostra solo le bottiglie corrispondenti.
5. **Given** un registro vuoto, **When** l'utente apre l'app, **Then** vede un invito chiaro a
   registrare la prima bottiglia.

---

### User Story 3 - Arricchire con foto e note (Priority: P3)

Durante o dopo la registrazione l'utente allega una o più foto (scattate al momento o scelte
dalla galleria: etichetta, contesto) e scrive note libere di degustazione, ricordi o abbinamenti,
usando una formattazione minima (elenchi puntati).

**Why this priority**: arricchisce il ricordo e alimenta la card di condivisione, ma non è
necessario per registrare.

**Independent Test**: aggiungere due foto e una nota con un elenco puntato a una bottiglia,
offline, e verificare che foto e nota formattata siano visibili nella scheda dopo il riavvio.

**Acceptance Scenarios**:

1. **Given** il modulo di registrazione o modifica, **When** l'utente aggiunge una foto dalla
   fotocamera o dalla galleria, **Then** la foto appare in anteprima e viene salvata con la
   bottiglia.
2. **Given** una bottiglia con più foto, **When** l'utente ne rimuove una, **Then** solo quella
   foto viene eliminata.
3. **Given** una nota contenente righe che iniziano con "- ", **When** la scheda viene
   visualizzata, **Then** quelle righe appaiono come elenco puntato e nessun altro contenuto
   della nota viene interpretato come codice o markup.

---

### User Story 4 - Posizione opzionale del consumo (Priority: P4)

Al momento della registrazione l'utente può scegliere di salvare il luogo in cui sta bevendo.
La posizione viene richiesta e salvata solo dopo un'azione esplicita dell'utente e solo con il
suo consenso. Una pagina "Mappa" mostra tutte le bottiglie con posizione come segnaposto su
una mappa; toccando un segnaposto si apre la scheda della bottiglia. La mappa richiede la
connessione; il resto dell'app no.

**Why this priority**: valore emotivo aggiunto, ma opzionale e sensibile per la privacy.

**Independent Test**: registrare una bottiglia con posizione (consenso dato) e una senza;
verificare che solo la prima abbia coordinate e che negando il permesso il salvataggio
avvenga comunque senza posizione.

**Acceptance Scenarios**:

1. **Given** il modulo di registrazione, **When** l'utente non tocca "Aggiungi posizione",
   **Then** nessuna posizione viene richiesta né salvata.
2. **Given** l'utente tocca "Aggiungi posizione" e concede il permesso, **When** salva, **Then**
   le coordinate vengono salvate con la bottiglia.
3. **Given** l'utente nega il permesso o la posizione non è disponibile, **When** salva,
   **Then** la bottiglia viene salvata senza posizione e l'utente riceve un messaggio non bloccante.
4. **Given** una bottiglia con posizione, **When** l'utente la modifica, **Then** può rimuovere
   la posizione.
5. **Given** alcune bottiglie con posizione e il dispositivo online, **When** l'utente apre la
   pagina "Mappa", **Then** vede un segnaposto per ciascuna e toccandolo apre la scheda.
6. **Given** il dispositivo offline, **When** l'utente apre la pagina "Mappa", **Then** vede un
   messaggio che la mappa richiede la connessione; il resto dell'app continua a funzionare.

---

### User Story 5 - Backup, ripristino e controllo dei dati (Priority: P5)

L'utente esporta in qualsiasi momento tutto il registro in un file JSON (completo, ripristinabile)
o CSV (per fogli di calcolo), salvato sul proprio dispositivo. Può importare un backup JSON per
ripristinare i dati (ad es. su un nuovo telefono) ed eliminare tutti i dati. Se sono passati più
di 30 giorni dall'ultimo backup, Bacco glielo ricorda.

**Why this priority**: i dati vivono solo sul dispositivo; senza backup una perdita del
dispositivo o una pulizia del browser cancella tutto.

**Independent Test**: esportare in JSON, eliminare tutti i dati, importare il file e
verificare che registro, foto, note e posizioni siano identici a prima.

**Acceptance Scenarios**:

1. **Given** un registro con bottiglie e foto, **When** l'utente esporta in JSON, **Then** viene
   scaricato un unico file che contiene tutti i dati, foto incluse.
2. **Given** un registro, **When** l'utente esporta in CSV, **Then** viene scaricato un file con
   una riga per bottiglia e i campi testuali e numerici (senza foto), apribile in un foglio di
   calcolo.
3. **Given** un file di backup JSON valido, **When** l'utente lo importa, **Then** le bottiglie
   nuove vengono aggiunte e, per quelle con lo stesso identificativo già presenti, si mantiene
   la versione con data di ultima modifica più recente; nessun duplicato viene creato e
   l'utente vede un riepilogo (aggiunte, aggiornate, invariate).
4. **Given** un file non valido o corrotto, **When** l'utente lo importa, **Then** nessun dato
   esistente viene modificato e l'utente vede un messaggio d'errore comprensibile.
5. **Given** l'ultimo backup (o il primo utilizzo, se mai fatto) risale a più di 30 giorni fa e
   il registro non è vuoto, **When** l'utente apre l'app, **Then** vede un promemoria non
   invasivo con azione diretta di esportazione e possibilità di rimandarlo.
6. **Given** le impostazioni, **When** l'utente sceglie "Elimina tutti i dati" e conferma
   esplicitamente, **Then** tutte le bottiglie, foto e impostazioni vengono cancellate.

---

### User Story 6 - Condividere una bottiglia con una card (Priority: P6)

Dalla scheda di una bottiglia l'utente genera una card visuale in stile "Spotify" (immagine
verticale adatta alle storie social) per dire "ho bevuto questa bottiglia": foto o sfondo a
tema, nome e produttore, estratto delle note, punteggio in numero e stelle. La condivide
tramite le app social, di messaggistica o email del dispositivo, oppure la salva. La card non
contiene link a Bacco; se l'utente ha inserito il link alla scheda tecnica/organolettica su
un sito esterno, questo accompagna l'immagine come testo della condivisione.

**Why this priority**: valorizza le esperienze ma non è necessario al logging.

**Independent Test**: generare la card per una bottiglia con foto e una senza foto e
verificare contenuti e leggibilità; condividerla o salvarla dal dispositivo.

**Acceptance Scenarios**:

1. **Given** una bottiglia con foto, **When** l'utente tocca "Condividi", **Then** viene generata
   un'anteprima della card con la foto come sfondo e i dati richiesti.
2. **Given** una bottiglia senza foto, **When** l'utente genera la card, **Then** viene usato uno
   sfondo tematico (vino o birra).
3. **Given** l'anteprima della card, **When** l'utente conferma, **Then** si apre il menu di
   condivisione del dispositivo; se non disponibile, l'immagine viene scaricata.
4. **Given** note più lunghe dello spazio disponibile, **When** la card viene generata, **Then**
   l'estratto viene troncato in modo leggibile.
5. **Given** una bottiglia con link alla scheda esterna, **When** l'utente condivide, **Then** il
   link è incluso nel testo che accompagna l'immagine; senza link viene condivisa solo l'immagine.

---

### User Story 7 - Installazione e tema (Priority: P7)

Bacco propone in modo non invasivo di essere installato nella schermata home quando non lo è
ancora, e consente di scegliere il tema chiaro, scuro o quello di sistema. Entrambi i temi usano
toni caldi ispirati a cantine e botti.

**Why this priority**: migliora accesso rapido e comfort, ma l'app è utilizzabile anche senza.

**Independent Test**: aprire l'app da browser non installata e verificare il suggerimento di
installazione; cambiare tema e verificare che la scelta persista al riavvio senza sfarfallio.

**Acceptance Scenarios**:

1. **Given** l'app non installata e un browser che supporta l'installazione, **When** l'utente
   la usa, **Then** compare un invito non bloccante all'installazione, che può essere chiuso e
   non riappare per almeno 30 giorni.
2. **Given** un browser senza installazione automatica (es. iOS), **When** l'invito compare,
   **Then** mostra le istruzioni manuali per "Aggiungi a Home".
3. **Given** l'app già installata, **When** viene avviata, **Then** non compare alcun invito.
4. **Given** il selettore tema, **When** l'utente sceglie chiaro, scuro o sistema, **Then** il
   tema si applica subito e viene ricordato ai successivi avvii.

---

### User Story 8 - Compilazione rapida da codice a barre (Priority: P3)

Nel modulo di registrazione l'utente inquadra il codice a barre della bottiglia con la
fotocamera. Se ha già registrato quella bottiglia, Bacco precompila i dati dalla registrazione
precedente (anche offline). Altrimenti, se c'è connessione, cerca il codice su Open Food Facts
e precompila nome, produttore e tipo. L'utente controlla, corregge se serve, aggiunge il
punteggio e salva.

**Why this priority**: riduce la digitazione nell'operazione primaria, ma la registrazione
manuale resta sempre possibile.

**Independent Test**: scansionare il codice a barre di una bottiglia presente su Open Food
Facts (online) e verificare la precompilazione; ripetere offline con una bottiglia già
registrata e verificare la precompilazione dal registro.

**Acceptance Scenarios**:

1. **Given** il modulo di registrazione, **When** l'utente tocca "Scansiona" e inquadra un
   codice a barre, **Then** il codice viene letto sul dispositivo e salvato con la bottiglia.
2. **Given** un codice già presente nel registro, **When** viene letto, **Then** nome,
   produttore, tipo e annata vengono precompilati dall'ultima registrazione, senza rete.
3. **Given** un codice nuovo e il dispositivo online, **When** viene letto, **Then** Bacco cerca
   il codice su Open Food Facts e precompila i campi trovati; i campi restano modificabili.
4. **Given** un codice nuovo e il dispositivo offline, oppure un codice non trovato, **When**
   viene letto, **Then** l'utente vede un messaggio non bloccante e compila a mano.
5. **Given** la fotocamera non disponibile o il permesso negato, **When** l'utente vuole usare
   il codice, **Then** può digitarlo a mano.

---

### Edge Cases

- Spazio di archiviazione del dispositivo esaurito durante il salvataggio di una foto: il
  salvataggio fallisce in modo esplicito, nessun dato parziale corrotto, l'utente viene avvisato.
- Foto molto grandi: vengono ridimensionate prima del salvataggio per limitare lo spazio occupato.
- Il browser cancella i dati del sito: il promemoria di backup e l'importazione JSON sono la
  protezione; l'app chiede al browser l'archiviazione persistente quando possibile.
- Importazione di un backup prodotto da una versione precedente di Bacco: deve essere accettata
  se il formato è riconosciuto; formati sconosciuti sono rifiutati senza modificare i dati.
- Note contenenti testo che somiglia a HTML o script: mostrato come testo semplice.
- Annata fuori intervallo plausibile (es. futura o prima del 1900): rifiutata con messaggio.
- Registrazione interrotta (app chiusa a metà): i dati non salvati possono andare persi; nessuna
  bottiglia incompleta viene creata.
- Aggiornamento dell'app: i dati esistenti restano intatti e leggibili.
- Backup più grande di 300 MB: l'importazione viene rifiutata con il messaggio "Backup troppo
  grande per questo dispositivo" e nessun dato cambia.
- Importazione dopo un'eliminazione: una bottiglia eliminata sul dispositivo ma presente nel
  backup viene di nuovo aggiunta (l'unione non propaga le eliminazioni).

## Requirements *(mandatory)*

### Functional Requirements

**Registrazione e registro**

- **FR-001**: Gli utenti DEVONO poter registrare una bottiglia indicando: nome (obbligatorio),
  tipo vino/birra (obbligatorio), punteggio 1–5 (obbligatorio), produttore (facoltativo),
  annata (facoltativa), sottocategoria (facoltativa, FR-028). Tutti i campi del modulo sono
  visibili senza sezioni a scomparsa.
- **FR-002**: Il sistema DEVE assegnare automaticamente data e ora di consumo correnti,
  modificabili dall'utente.
- **FR-003**: Il selettore di punteggio DEVE mostrare per ogni livello etichetta e descrizione:
  1 Difettoso; 2 Non armonico / Bassa qualità; 3 Piacevole / Corretto; 4 Ottimo / Molto tipico;
  5 Eccellente / Memorabile (con le descrizioni del documento di specifica). Il punteggio è
  rappresentato da 5 icone a forma di bottiglia (di vino o di birra in base al tipo), piene
  fino al valore scelto; ogni icona è un bersaglio di almeno 44×44 px.
- **FR-004**: Il sistema DEVE mostrare il registro in ordine cronologico inverso, raggruppato
  per mese, con nome, produttore, tipo e punteggio (il giorno non compare nella riga; la data
  completa è nella scheda).
- **FR-005**: Gli utenti DEVONO poter cercare per nome/produttore e filtrare per tipo, anno e
  mese di consumo (gli elenchi di anni e mesi mostrano solo i periodi presenti nel registro;
  i filtri si combinano tra loro).
- **FR-006**: Gli utenti DEVONO poter visualizzare, modificare ed eliminare (con conferma) ogni
  bottiglia.
- **FR-007**: Il sistema DEVE suggerire, durante l'inserimento, nomi e produttori già usati
  dall'utente, per ridurre la digitazione.

**Arricchimenti**

- **FR-008**: Gli utenti DEVONO poter allegare più foto per bottiglia, da fotocamera o galleria,
  e rimuoverle singolarmente. "Scatta foto" DEVE aprire direttamente la fotocamera dentro
  l'app; se la fotocamera non è disponibile, si ripiega sulla scelta del file.
- **FR-009**: Il sistema DEVE ridurre le dimensioni delle foto prima di salvarle.
- **FR-010**: Gli utenti DEVONO poter scrivere note libere; righe che iniziano con "- " DEVONO
  essere mostrate come elenco puntato; nessun altro contenuto viene interpretato come markup.
- **FR-011**: Il sistema DEVE richiedere la posizione solo dopo un'azione esplicita dell'utente
  e salvarla solo con il permesso concesso; l'utente DEVE poterla rimuovere.
- **FR-011a**: Il sistema DEVE offrire una pagina "Mappa" con un segnaposto per ogni bottiglia
  con posizione, che apre la relativa scheda; la mappa può scaricare le immagini della mappa
  da un servizio online e, senza connessione, DEVE mostrare un messaggio esplicativo.

**Dati, privacy e backup**

- **FR-012**: Tutti i dati DEVONO essere conservati esclusivamente sul dispositivo; il sistema
  NON DEVE trasmettere dati del registro (bottiglie, note, foto, punteggi) a server o terze
  parti. Le uniche richieste di rete ammesse sono letture di contenuti pubblici: immagini della
  mappa e ricerca su Open Food Facts, che riceve solo il codice a barre.
- **FR-013**: Tutte le funzioni tranne la visualizzazione della mappa e la ricerca online del
  codice a barre DEVONO essere disponibili
  senza connessione dopo il primo caricamento.
- **FR-014**: Gli utenti DEVONO poter esportare l'intero registro in JSON (foto incluse,
  ripristinabile) e in CSV (una riga per bottiglia, senza foto).
- **FR-015**: Gli utenti DEVONO poter importare un backup JSON; il sistema DEVE validarlo
  completamente prima di scrivere. L'importazione unisce i dati: aggiunge le bottiglie nuove
  e, a parità di identificativo, mantiene la versione con data di ultima modifica più recente
  (foto incluse); al termine mostra un riepilogo di bottiglie aggiunte, aggiornate e invariate.
- **FR-016**: Il sistema DEVE registrare la data dell'ultima esportazione e, se sono passati più
  di 30 giorni e il registro non è vuoto, mostrare all'apertura un promemoria non invasivo con
  azione di esportazione e opzione "ricordamelo più tardi".
- **FR-017**: Gli utenti DEVONO poter eliminare tutti i dati con doppia conferma.

**Condivisione**

- **FR-018**: Gli utenti DEVONO poter generare per una bottiglia una card immagine verticale
  (formato storie social) con: foto (o sfondo tematico), nome, produttore, estratto delle note,
  punteggio numerico e a stelle, sottocategoria se presente, e il marchio "Bacco" con
  l'indirizzo del sito del progetto `bacco.smzstudio.it` (promozione). La card NON contiene
  link a dati dell'utente né la posizione.
- **FR-019**: La card DEVE essere condivisibile tramite il menu di condivisione del dispositivo
  o, in alternativa, scaricabile; se presente, il link alla scheda esterna DEVE essere incluso
  nel testo della condivisione, che termina sempre con "Registrato con Bacco ·
  https://bacco.smzstudio.it".
- **FR-019a**: Gli utenti DEVONO poter inserire per ogni bottiglia un link facoltativo alla
  scheda tecnica/organolettica su un sito esterno; sono accettati solo indirizzi `https://`.
  Bacco non apre né scarica il link in automatico.

**App ed esperienza**

- **FR-020**: L'app DEVE essere installabile e proporre l'installazione con un invito non
  invasivo, chiudibile, con istruzioni manuali dove l'installazione automatica non è supportata.
- **FR-021**: Gli utenti DEVONO poter scegliere tema chiaro, scuro o di sistema; la scelta DEVE
  persistere.
- **FR-022**: L'interfaccia DEVE essere progettata prima per smartphone in verticale e adattarsi
  a schermi più grandi; DEVE essere utilizzabile da tastiera e lettore di schermo.
- **FR-023**: L'interfaccia è in italiano.

**Codice a barre**

- **FR-024**: Gli utenti DEVONO poter leggere il codice a barre della bottiglia con la
  fotocamera (lettura eseguita sul dispositivo) o digitarlo a mano; il codice viene salvato
  con la bottiglia. Il campo del codice è un input di testo con accanto un'icona fotocamera
  che apre subito la scansione; un codice digitato a mano e valido avvia la stessa ricerca.
- **FR-025**: Se il codice è già presente nel registro, il sistema DEVE precompilare nome,
  produttore, tipo e annata dall'ultima registrazione con quel codice, senza usare la rete.
- **FR-026**: Se il codice è nuovo e c'è connessione, il sistema DEVE cercarlo su Open Food
  Facts inviando solo il codice a barre, e precompilare i campi trovati; i dati ricevuti DEVONO
  essere validati e trattati come testo semplice.
- **FR-027**: Se la ricerca fallisce (offline, codice non trovato, servizio non disponibile),
  l'utente DEVE poter proseguire con la compilazione manuale senza perdere quanto inserito.
- **FR-027a**: Il modulo DEVE mostrare in un riquadro di stato, sotto il codice, ogni fase
  della ricerca: validità del codice (cifra di controllo GTIN), ricerca nel registro, ricerca
  su Open Food Facts in corso, esito con i campi compilati, non trovato, offline o errore.

**Permessi**

- **FR-030**: Quando fotocamera o posizione non sono disponibili, l'app DEVE spiegare il motivo
  (permesso negato dal browser o dal sistema operativo, nessuna fotocamera, fotocamera in uso,
  indirizzo non sicuro, posizione non determinabile) e i passi per risolvere, specifici per
  sistema e browser, con un'azione "Riprova". Le Impostazioni DEVONO mostrare lo stato dei
  permessi di fotocamera e posizione e permettere di richiederli.

**Degustazione e categorie**

- **FR-028**: Gli utenti DEVONO poter scegliere una sottocategoria in base al tipo — vino:
  Rosso, Bianco, Rosato, Bollicine, Passito; birra: Lager, Pils, IPA, Ale, Dubbel, Tripel,
  Bock, Stout, Porter, Wheat, Sour — oppure scriverne una libera ("Altro"). L'elenco è
  estendibile in versioni future.
- **FR-029**: Gli utenti DEVONO poter annotare, come testo libero facoltativo, l'"Analisi
  organolettica personale" (profumi, sapori, sensazioni, in un unico campo) e l'abbinamento
  ("con cosa l'ho mangiato"); questi campi compaiono nella scheda, nel backup e nel CSV. I
  campi precedenti "profumi" e "sapore" vengono uniti nell'analisi organolettica.
- **FR-032**: Per il vino, gli utenti DEVONO poter indicare la denominazione: DOCG, DOC, IGT o
  IGP (facoltativa; non applicabile alla birra). Viene precompilata dal registro o dalle
  etichette di Open Food Facts quando disponibile e compare in lista, scheda, card, backup e CSV.
- **FR-031**: Gli utenti DEVONO poter indicare la gradazione alcolica in % vol (facoltativa,
  da 0 a 70, al decimo); viene precompilata dal registro o da Open Food Facts quando
  disponibile e compare nella scheda, nella card, nel backup e nel CSV.

### Key Entities

- **Bottiglia**: un evento di consumo. Attributi: identificativo univoco, nome, produttore,
  tipo (vino/birra), sottocategoria, denominazione (solo vino), annata, gradazione, analisi organolettica, abbinamento, codice a barre (facoltativo), punteggio (1–5), data e ora di consumo, note, link alla scheda
  esterna (facoltativo), posizione
  (facoltativa: latitudine, longitudine, precisione), date di creazione e ultima modifica.
- **Foto**: immagine associata a una bottiglia (una bottiglia ha zero o più foto), con ordine
  di visualizzazione.
- **Livello di punteggio**: elenco fisso di 5 livelli con etichetta e descrizione.
- **Impostazioni**: tema scelto, data ultima esportazione, data ultimo rinvio del promemoria,
  data ultimo rifiuto dell'invito di installazione.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utente registra una bottiglia con i soli campi obbligatori in meno di 20 secondi
  e con al massimo 5 interazioni dopo l'apertura dell'app.
- **SC-002**: Il 100% delle funzioni, escluse la mappa e la ricerca online del codice a barre,
  è utilizzabile in modalità aereo dopo il
  primo caricamento.
- **SC-003**: Le uniche richieste verso servizi esterni sono le immagini della pagina "Mappa" e
  la ricerca di un codice a barre su Open Food Facts; nessuna richiesta contiene dati del
  registro (verificabile con gli strumenti del browser).
- **SC-003a**: Con un codice a barre presente su Open Food Facts, la registrazione di una nuova
  bottiglia richiede al massimo 3 interazioni oltre al punteggio.
- **SC-004**: Per registri fino a ~1.000 bottiglie con foto, esportazione JSON seguita da
  importazione su un dispositivo vuoto ripristina il
  100% di bottiglie, foto, note e posizioni.
- **SC-005**: Con 1.000 bottiglie registrate, il registro si apre e la ricerca mostra i
  risultati in meno di 1 secondo su un dispositivo di riferimento (iPhone 12 o Pixel 6a, o
  equivalenti).
- **SC-006**: La card di condivisione viene generata in meno di 3 secondi sul dispositivo di
  riferimento.
- **SC-007**: L'interfaccia rispetta WCAG 2.1 AA in entrambi i temi.
- **SC-008**: Il 90% degli utenti pilota registra la prima bottiglia senza aiuto.

## Assumptions

- **Utente singolo per dispositivo**: nessun account, login o profilo; ogni installazione ha il
  proprio registro.
- **Nessuna sincronizzazione**: il documento cita una "sincronizzazione automatica al ritorno
  della connessione"; poiché i dati restano solo sul dispositivo (costituzione, principio II),
  non esiste un server con cui sincronizzare. Il trasferimento tra dispositivi avviene tramite
  esportazione/importazione JSON.
- **Rete in sola lettura**: la mappa usa un servizio online di immagini della mappa e la
  ricerca da codice a barre usa Open Food Facts, come ammesso dalla costituzione v2.0.0
  (principio II). Il servizio della mappa vede quale zona si sta guardando, non i dati del
  registro.
- **Promemoria di backup**: è un avviso mostrato all'apertura dell'app, non una notifica di
  sistema (che richiederebbe un servizio remoto o permessi aggiuntivi).
- **Tema**: il documento chiede un tema scuro curato; la costituzione richiede anche il tema
  chiaro con selettore. Entrambi usano la palette "cantina"; il predefinito segue il sistema.
- **Fuori ambito per questa versione** (miglioramenti futuri da valutare con la domanda "rende
  il logging più semplice, veloce o significativo?" e compatibilmente con la regola dei dati
  solo locali): integrazioni con Wikidata e banche dati ministeriali/UE, auto-completamento
  codici DOCG, riconoscimento etichette con LLM sul
  dispositivo, sincronizzazione tra dispositivi.
- **Processo**: la finalizzazione della specifica (passaggio da Draft a Finalized), i test con
  utenti pilota e la gestione nel knowledge base personale sono attività di processo, non
  requisiti del prodotto.
- **Design UI/UX**: la progettazione visiva e dei flussi verrà realizzata con la skill
  `/frontend-design` in fase di plan/implementazione.
- Il documento di input era indicato come parte "3/4": si assume che sia completo (termina con
  la sezione 7 e il separatore finale).
