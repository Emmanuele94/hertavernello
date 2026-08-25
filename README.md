# Hertavernello — Fantalega

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
data/calendario.json      Calendario di lega, chi affronta chi ogni giornata (si compila da admin.html)
data/squadre-serie-a.json Anagrafica delle 20 squadre di Serie A e delle 10 fasce — non serve toccarlo
assets/logo.png             Il vostro logo
assets/loghi/                  Stemmi ufficiali delle 20 squadre di Serie A (già inclusi)
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

- **Home**: countdown/stato asta, "Chi gioca contro chi", classifica generale
  previsioni, e ora anche **Classifica Serie A completa** e **Top marcatori**
  — entrambe si aggiornano al massimo ogni 4 ore (non a ogni apertura pagina)
  per non consumare le chiamate gratuite dell'API.

## Previsioni: ordine esatto, non solo fascia

Da oggi `admin.html` non chiede più solo "in che fascia hai messo questa
squadra" ma la posizione esatta (1°-20°), dentro ogni fascia, letta da
sinistra a destra sul tiermaker — perché "2°-3°-4°" nella stessa fascia
non sono equivalenti, e la classifica generale delle previsioni ora
calcola la distanza dalla posizione reale invece che dalla sola fascia.
Le previsioni caricate con il vecchio sistema vanno ricompilate.
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

## Password: due livelli

Da oggi ci sono due password separate in `config.json`:
- `guestPasswordHash` — quella che dai agli amici, fa vedere Home e Squadre.
- `adminPasswordHash` — la tua: fa vedere il sito come agli amici MA sblocca
  anche `admin.html`, che ora è protetta (prima non lo era).

Password guest di default nel template: **herta2026**. Password admin di
default: **cambiami-admin** — cambiala subito dalla sezione 1 di
`admin.html` prima di condividere il link con chiunque.

## Upload previsioni e salvataggio diretto da admin.html (facoltativo)

**Importante**: il token GitHub non va mai incollato in `config.json` —
il repository è pubblico (necessario per GitHub Pages gratis), e GitHub
scansiona i repository pubblici alla ricerca di propri token esposti:
appena ne trova uno dentro un file lo revoca automaticamente, anche se
hai bypassato l'avviso "secret scanning" al momento del commit. Per
questo il token vive solo nel browser (sessionStorage), mai nel
repository: si incolla una volta a sessione (pulsante "Imposta/cambia
token GitHub" nella sezione 1 di admin.html, oppure il sito te lo chiede
da solo alla prima azione che ne ha bisogno) e sparisce chiudendo la
scheda o il browser — a quel punto va reincollato.

Con il token impostato in sessione, sia il pulsante "Salva direttamente
su GitHub" in ogni sezione di admin.html, sia il pulsante
"Carica/aggiorna screenshot" nella pagina Squadre, scrivono i file
direttamente sul repository — niente più download/upload manuale. Il
sito pubblico si aggiorna con un minuto di ritardo (il tempo del
redeploy di GitHub Pages).

Senza token impostato in sessione, il sito te lo chiede al momento
giusto; se preferisci non inserirlo mai, restano sempre disponibili i
pulsanti di download/upload manuale in ogni sezione.

## Nota sulla chiave API

`footballDataApiKey` in `config.json` resta visibile a chiunque guardi il
codice sorgente della pagina (è un sito statico, non c'è un server che la
nasconda). Per un progetto gratuito tra amici va bene, ma è bene sapere
che non è una chiave segreta al 100%: se un giorno preferisci revocarla e
generarne una nuova, si fa dal tuo account football-data.org in un minuto.
