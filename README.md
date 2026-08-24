# Herta Vernello — Fantalega

Template pronto all'uso. Non serve toccare HTML/CSS/JS: tutto quello che
cambia stagione per stagione sta nella cartella `data/`, e le parti più
noiose (pagelle, previsioni, import rose) si compilano da `admin.html`
invece che scrivendo JSON a mano.

## Struttura

```
index.html               Home: incrocio partite + classifica generale previsioni
squadre.html              Tab per fantallenatore: rosa + pagella + previsione
admin.html                 Solo per te: import CSV rose, editor pagelle, editor previsioni
css/style.css               Stile del sito
js/                          Logica (non serve toccarla)
data/config.json           Nome lega, data asta, password, chiave API, elenco squadre
data/pagelle.json          Voti e commenti (compilabile da admin.html)
data/previsioni.json      Screenshot + fasce previste (compilabile da admin.html)
data/rose.json               Rose (si genera da admin.html dopo l'asta)
data/squadre-serie-a.json Anagrafica delle 20 squadre di Serie A e delle 10 fasce — non serve toccarlo
assets/logo.png             Il vostro logo
assets/previsioni/           Metti qui gli screenshot da tiermaker.com
```

## Importante: come aprire admin.html

Apri sempre `admin.html` tramite un server, mai con doppio click diretto sul
file — il browser blocca la lettura dei file in `data/` se apri il file
così, e i pannelli restano vuoti. Due modi:

- **Il sito già online** (la strada più comoda): vai su
  `https://tuonomeutente.github.io/hertavernello/admin.html`.
- **In locale**: apri un terminale nella cartella del progetto e lancia
  `python3 -m http.server 8000`, poi apri `http://localhost:8000/admin.html`
  nel browser.

## Prima di pubblicare

1. Apri `data/config.json` e modifica `lega.nome`, `lega.stagione`,
   `lega.dataAsta`, e l'elenco `squadre` (`nomeReale` e `nomeFantasquadra`
   per ognuna — quest'ultimo deve essere identico al nome su
   fantacalcio.it). Per meno di 12 partecipanti cancella le righe in
   eccesso; per farne di più copia una riga e usa un id nuovo (`sq-13`...).
2. Cambia la password da `admin.html` → sezione 1, incolla l'hash in
   `config.json`. Default nel template: `vernello26`.
3. (Facoltativo ma consigliato) Registrati gratis su football-data.org,
   prendi la chiave API e incollala in `config.json` → `footballDataApiKey`.
   Senza questa chiave il sito funziona lo stesso, ma "Chi gioca contro chi"
   e la "Classifica generale previsioni" restano vuote con un avviso.

## Il 15 settembre, dopo l'asta

1. Su leghe.fantacalcio.it: **Gestione rose → Esporta rose**, scarica il CSV.
2. Apri `admin.html` → sezione 2, carica il CSV, controlla le associazioni
   proposte (nome squadra CSV → fantallenatore) e correggile se serve.
   Scarica `rose.json` e sostituiscilo in `data/`.
3. Mandami le tue bozze/idee per le pagelle: te le rifinisco nel tono
   giusto. Poi apri `admin.html` → sezione 3 e compila voto, badge (emoji)
   e commento per ogni squadra — il colore della card lo calcola sempre da
   solo il sito in base al voto. Scarica `pagelle.json` e sostituiscilo.
4. Per le previsioni: fai lo screenshot da tiermaker.com, caricalo su
   GitHub dentro `assets/previsioni/` (es. `sq-01.png`). Poi in
   `admin.html` → sezione 4 scrivi il nome del file per quella squadra e,
   aprendo "Fasce previste", indica in che fascia ha messo ciascuna delle
   20 squadre reali (guardando il tiermaker) — serve per la classifica
   generale automatica in Home. Scarica `previsioni.json` e sostituiscilo.
5. Fai commit e push: il sito si aggiorna da solo in circa un minuto.

## Le due pagine pubbliche

- **Home**: countdown/stato asta, "Chi gioca contro chi" (incrocio tra le
  partite di Serie A — live se ce ne sono, altrimenti il prossimo turno —
  e i fantallenatori che hanno giocatori in quelle squadre), e la
  classifica generale di chi si sta avvicinando di più alla propria
  previsione, calcolata sulla classifica reale aggiornata.
- **Squadre**: un tab per ogni fantallenatore. Selezionandolo vedi la sua
  rosa, la sua pagella, e la sua previsione (clicca sullo screenshot per
  ingrandirlo).

## Pubblicazione online — GitHub Pages

1. Repository nuovo, pubblico (su piano gratuito Pages funziona solo così
   — il contenuto resta comunque protetto dalla password del sito).
2. Carica TUTTO il contenuto di questa cartella (non la cartella stessa,
   il suo contenuto) tramite "Add file → Upload files".
3. Settings → Pages → Source: "Deploy from a branch" → main, `/ (root)` → Save.
4. Dopo un paio di minuti il sito è su
   `https://tuonomeutente.github.io/nome-repository/`.
5. Ogni push successivo aggiorna il sito da solo in circa un minuto.

## Nota sulla password

Protezione lato client: tiene fuori i curiosi e i motori di ricerca, ma
non è sicurezza vera — non caricateci dati sensibili veri.

## Nota sulla chiave API

`footballDataApiKey` in `config.json` resta visibile a chiunque guardi il
codice sorgente della pagina (è un sito statico, non c'è un server che la
nasconda). Per un progetto gratuito tra amici va bene, ma è bene sapere
che non è una chiave segreta al 100%: se un giorno preferisci revocarla e
generarne una nuova, si fa dal tuo account football-data.org in un minuto.
