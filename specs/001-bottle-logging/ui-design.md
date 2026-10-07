# UI/UX Design: Bacco

**Feature**: `001-bottle-logging` | **Date**: 2026-10-07 | Prodotto con `/frontend-design`

## Tesi

**Soggetto**: il registro di cantina. Nelle cantine le botti si segnano col **gesso**: date,
lotti e conteggi a **tacche**, scritti a mano sul fondo della botte. Le casse di vino e le
botti di birra sono marchiate con lettere **a stencil**. Bacco è quel registro, in tasca.

**Pubblico**: una persona che beve vino e birra con curiosità, non un sommelier; registra in
piedi, al tavolo, con una mano, spesso con luce bassa.

**Unico compito della schermata principale**: registrare la bottiglia che hai davanti,
subito.

## Firma: le bottiglie che si riempiono (revisione 2026-10-07)

Le tacche di gesso erano poco leggibili (feedback dell'utente). Il punteggio diventa una fila
di **5 bottiglie**, con la sagoma del tipo scelto:

- **vino**: bottiglia bordolese (spalle alte, collo lungo, etichetta);
- **birra**: bottiglia da birra (corpo basso, collo con tappo a corona);
- nessun tipo ancora scelto: sagoma bordolese neutra.

Fino al voto scelto le bottiglie sono **piene** del loro liquido (feccia per il vino, luppolo
con un filo di schiuma per la birra); le altre sono solo contorno. Al tocco il liquido sale
dal fondo (180 ms, nessuna animazione con `prefers-reduced-motion`). Si legge come le
stelline, ma parla di vino e birra. Sotto la fila: "4 · Ottimo / Molto tipico" + descrizione.

```text
  Punteggio
  [▮][▮][▮][▮][▯]      ← 4 bottiglie piene, la 5ª vuota
  4 · Ottimo / Molto tipico
  Rappresentativa dello stile o dell'annata…
```

Accessibilità: `radiogroup` di 5 radio nativi; ogni bottiglia è un'area di tocco ≥ 44×44 px;
nome accessibile "4 – Ottimo / Molto tipico". In lista e in scheda le stesse bottiglie in
piccolo (sola lettura, `role="img"`). Sulla card restano numero + stelle (FR-018).

## Colore

Due temi, stessa famiglia: **cantina** (scuro: legno di botte e gesso) e **calce** (chiaro:
la parete imbiancata a calce della cantina, un grigio-verde freddo, **non** crema).
Vino e birra hanno un colore proprio che codifica il tipo (barretta laterale in lista,
segmento selezionato, segnaposto in mappa): **feccia** per il vino, **luppolo** per la birra.
Il colore accompagna sempre il testo "Vino"/"Birra", non lo sostituisce (WCAG 1.4.1).

| Token | Ruolo | Cantina (scuro) | Calce (chiaro) |
|---|---|---|---|
| `--c-botte` | sfondo | `#1C1613` | `#E6E8E2` |
| `--c-doga` | superfici (card, sheet) | `#2A211C` | `#F4F5F1` |
| `--c-gesso` | testo principale | `#EDE6D8` | `#2A1E19` |
| `--c-cenere` | testo secondario | `#B5A99A` | `#5C5049` |
| `--c-feccia` | vino, azione primaria | `#C9607F` | `#7D2341` |
| `--c-luppolo` | birra | `#E0AC4A` | `#7A5510` |
| `--c-rame` | bordi attivi, focus | `#C08050` | `#8A4F2A` |

Contrasti misurati (WCAG 2.1, T083): testo principale 12,7–14,8:1 in entrambi i temi;
testo secondario 6,3–7,8:1; feccia/luppolo/rame su `botte` sempre ≥ 4,6:1 (testo) e
quindi anche ≥ 3:1 (elementi grafici). **Il pulsante primario usa sempre testo
`--c-botte` su `--c-feccia`** (4,66:1 in scuro, 7,77:1 in chiaro): `--c-doga` su
`--c-feccia` scende a 4,10:1 nel tema scuro e non supera la soglia AA di 4,5:1 per il
testo normale, quindi non va usato su quello sfondo. `--c-doga` resta corretto su
`--c-rame` e `--c-luppolo` in entrambi i temi.

Focus: anello 2 px `--c-rame` con offset 2 px, sempre visibile.

## Tipografia

Font self-hosted da `@fontsource/*` (nessuna CDN), precacheati.

| Ruolo | Font | Uso |
|---|---|---|
| Display (con parsimonia) | **Big Shoulders Stencil Display** 700 | titoli di schermata, annata, nome sulla card, numero del punteggio |
| Testo | **Atkinson Hyperlegible Next** 400/700 | tutto il resto, nomi in lista; cifre tabellari per date e annate |

Scala (mobile, rem): 0,875 didascalie · 1 testo · 1,125 nomi in lista · 1,5 titoli ·
2,5 annata/punteggio in scheda · 5 sulla card. Lo stencil è maiuscolo con spaziatura
+0,04em; mai sotto 1,25 rem (leggibilità).

Perché: lo stencil viene dalle marchiature di casse e botti; Atkinson Hyperlegible è nato
per la massima leggibilità, utile con luce bassa e in movimento.

## Layout

Mobile-first (320–430 px), una colonna, azioni nella zona del pollice.

### Registro (home) — revisione UX 2026-10-07

Un diario da scorrere spesso, con una mano: i filtri occupano una riga, l'elenco il resto.

```text
┌──────────────────────────────┐
│ [🥂] BACCO                ⚙  │  icona + nome (home); ingranaggio = Impostazioni
│ ( 🔍 Cerca nome o produttore ✕) │
│ (Vino)(Birra) │ (Anno ▾)(Mese ▾) │  una riga; Vino/Birra sono interruttori
│ 60 bottiglie · 30 vini · 30 birre │  con filtri: "5 di 60 bottiglie · Azzera filtri"
│ OTTOBRE 2026          12 bott. │  intestazione del mese fissa durante lo scorrimento
│ [▮] Barolo Cannubi   🍾🍾🍾🍾 │  tessera: foto, o sagoma nel colore del tipo
│     Vino Rosso DOCG · Borgogno · 2019 │  nessun giorno: il mese è nell'intestazione
│ …                            │
│  ⌂ Home     [ + ]     ◎ Mappa │  + centrale rialzato = Nuova bottiglia (nascosto nel modulo)
└──────────────────────────────┘
```

Vuoto: icona di Bacco grande, "Il registro è vuoto", "Registra la prima bottiglia: bastano
nome, tipo e punteggio." e il pulsante "+ Nuova bottiglia". Nessun risultato: "Nessuna
bottiglia con questi filtri." + "Azzera filtri".

### Nuova bottiglia (pieno schermo, salva in basso)

Nessuna sezione a scomparsa: tutto visibile, in gruppi con un titolo piccolo in stencil.
Il percorso minimo (nome → tipo → punteggio → Salva) resta ≤ 5 tocchi; chi scansiona parte
dal codice in alto.

```text
┌──────────────────────────────┐
│ ✕  NUOVA BOTTIGLIA           │
│ FOTO  [📷 Scatta] [Galleria] │  ← "Scatta" apre la fotocamera in app
│ Codice a barre               │
│ [ 8001234567890        ][📷] │  ← l'icona apre subito la fotocamera
│ ┌ ✓ EAN-13 · controllo ok  ┐ │  ← riquadro di stato ricerca
│ │ ◌ Cerco su Open Food F…  │ │
│ └──────────────────────────┘ │
│ BOTTIGLIA                    │
│ Nome *  [ Barolo Cannubi   ] │
│ Produttore [      ] Annata [ ]│
│ Tipo *  [ Vino | Birra ]     │
│ (Rosso)(Bianco)(Rosato)(…)   │  ← sottocategoria a chip + "Altro"
│ Punteggio *  🍾🍾🍾🍾🍾       │
│ DEGUSTAZIONE                 │
│ Analisi organolettica · Abb. │
│ Note                         │
│ QUANDO E DOVE                │
│ Data [    ] Ora [  ] Adesso  │
│ Link scheda tecnica          │
│ [        Salva bottiglia   ] │
└──────────────────────────────┘
```

Riquadro di stato della ricerca (FR-027a): bordo sinistro colorato per esito (rame in corso,
gesso trovato, feccia errore), un'icona e una riga di testo per fase; resta visibile finché
l'utente non cambia codice. I campi compilati portano l'etichetta "da Open Food Facts" o
"dal tuo registro" finché non vengono modificati.

### Fotocamera (scansione e foto)

Sovrapposizione a tutto schermo, sfondo `--c-botte`: video al centro, cornice di mira (per
il codice) o pulsante tondo di scatto (per la foto), "Annulla" in alto. Si apre già con la
fotocamera posteriore attiva; se non è disponibile: "Fotocamera non disponibile" + scelta
file (foto) o campo di testo (codice).

### Scheda bottiglia

Foto in alto (scorrimento orizzontale se più di una), nome, produttore, annata grande in
stencil, bottiglie del punteggio + descrizione del livello, data, sottocategoria, profumi,
sapore, abbinamento, note, luogo (con "Apri nella mappa"),
link esterno, azioni: Modifica · Condividi · Elimina.

### Mappa

Mappa a tutta altezza; segnaposto colorati per tipo con legenda "● Vino ● Birra"; tocco →
mini-card (nome, tipo in testo) → scheda. Offline:
"La mappa ha bisogno della connessione. Ecco i tuoi luoghi:" + elenco.

### Impostazioni

Tema (Sistema · Chiaro · Scuro), Esporta JSON, Esporta CSV, Importa backup, Elimina tutti i
dati (zona separata, doppia conferma), data dell'ultimo backup.

### Banner non bloccanti (sopra la barra di navigazione, uno alla volta)

- Promemoria backup: "Ultimo backup 34 giorni fa. [Esporta ora] [Più tardi]"
- Installazione: "Aggiungi Bacco alla schermata Home per aprirlo con un tocco. [Installa]
  [Non ora]" (iOS: istruzioni + "Installata, Bacco protegge meglio i tuoi dati: Safari
  può cancellare i dati dei siti non usati da 7 giorni.").
- Aggiornamento app: "Nuova versione disponibile. [Aggiorna]"

## Icona dell'app

"Cin cin": un calice di vino rosso e un boccale di birra con la schiuma che si toccano, su
fondo legno di botte (`#1C1613` → `#2A211C` radiale), con tre piccoli segni di brindisi.
Solo forme (nessun font), entro la safe zone delle icone maskable.

## Movimento

Un solo momento: il liquido che sale nelle bottiglie del punteggio. Transizioni di vista 150 ms in dissolvenza;
nessuna animazione decorativa. Tutto disattivato con `prefers-reduced-motion: reduce`.

## Testi (voce)

Italiano, tono asciutto, verbi d'azione, maiuscola solo a inizio frase (tranne lo stencil).
Le azioni mantengono lo stesso nome lungo il flusso: "Salva bottiglia" → "Bottiglia salvata";
"Esporta JSON" → "Backup esportato". Errori che dicono cosa fare: "Il file non è un backup di
Bacco. Scegli un file .json esportato da Bacco." Nessuna scusa, nessun punto esclamativo.

## Revisione contro i default

- Palette: evitati crema + serif + terracotta (rischio tipico di un'app sul vino) e nero +
  accento acido; il tema chiaro è calce fredda, lo scuro è legno di botte.
- Tipo: niente serif ad alto contrasto "da etichetta"; lo stencil viene dal mondo reale
  delle casse e botti.
- Struttura: niente numerazioni decorative; i gruppi per mese e la barretta di tipo
  codificano informazioni vere.
- Tolto un accessorio: scartata una texture di legno di sfondo.
- Revisione 2026-10-07: le tacche (troppo astratte) lasciano il posto alle bottiglie, che
  restano specifiche del soggetto ma si leggono subito come un voto.


## Dettaglio e modifica in pannello modale

Dettaglio (`/bottiglia/:id`) e modifica (`/bottiglia/:id/modifica`) si aprono in un pannello sopra la pagina da cui si parte (registro o mappa), che resta montata sotto con filtri e scorrimento. Su telefono il pannello sale dal basso (angoli superiori arrotondati, max 92dvh); su schermi larghi è centrato. Chiusura con ✕, tocco sullo sfondo o Esc; con un link diretto sotto c'è il registro. Nella modifica il pulsante "Salva bottiglia" resta in fondo al pannello. La nuova bottiglia (`/nuova`) resta una pagina.
