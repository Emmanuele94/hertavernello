# Herta Vernello — Fantalega

Template pronto all'uso. Non serve toccare HTML/CSS/JS: tutto quello che
cambia stagione per stagione sta nella cartella `data/`.

## Struttura

```
index.html          Home (pagelle + previsioni)
rose.html            Pagina rose (tab per squadra)
admin.html           Solo per te: import CSV rose + generatore password
css/style.css        Stile del sito
js/                  Logica (non serve toccarla)
data/config.json     Nome lega, data asta, password, elenco squadre
data/pagelle.json    Voti e commenti
data/previsioni.json Screenshot previsioni Serie A
data/rose.json       Rose (si genera da admin.html dopo l'asta)
assets/logo.png      Il vostro logo
assets/previsioni/   Metti qui gli screenshot da tiermaker.com
```

## Prima di pubblicare

1. Apri `data/config.json` e modifica:
   - `lega.nome`, `lega.stagione`, `lega.dataAsta`
   - l'elenco `squadre`: per ognuna, `nomeReale` (il nome del tuo amico) e
     `nomeFantasquadra` (il nome ESATTO della squadra su fantacalcio.it —
     serve per l'import automatico delle rose più avanti). Se siete in meno
     di 12, cancella le righe di squadra in eccesso; se siete di più,
     copiane una e cambia id/nomi (usa id progressivi tipo `sq-13`).
2. Cambia la password: apri `admin.html` nel browser (anche solo facendo
   doppio click sul file, o con un server locale), scrivi la password nel
   riquadro "Genera password lega", copia l'hash generato e incollalo in
   `config.json` → `lega.passwordHash`. Password di default nel template:
   `vernello26`.

## Il 15 settembre, dopo l'asta

1. Su leghe.fantacalcio.it vai in **Gestione rose → Esporta rose** e
   scarica il CSV.
2. Apri `admin.html`, carica il CSV nella sezione "Importa rose da CSV".
3. Controlla le associazioni proposte (nome squadra nel CSV → fantallenatore)
   e correggile dove serve.
4. Clicca "Genera rose.json", scarica il file e sostituiscilo a
   `data/rose.json`.
5. Fammi avere i tuoi appunti/bozze per le pagelle: te le rifinisco nel
   tono giusto, poi le incolli in `data/pagelle.json` (un blocco per
   squadra, campi `voto`, `badge`, `commento` — formato di esempio già nel
   file).
6. Per le previsioni: fai lo screenshot da tiermaker.com, salvalo dentro
   `assets/previsioni/` e scrivi il nome del file nel campo `immagine`
   della squadra corrispondente in `data/previsioni.json`.
7. Fai commit e push: il sito si aggiorna da solo (vedi sotto).

## Pubblicazione online — GitHub Pages (consigliata)

Dato che hai già GitHub, è la strada più semplice: nessun account in più
da creare, deploy automatico ad ogni push.

1. Crea un nuovo repository su GitHub (puoi tenerlo pubblico: il
   contenuto è comunque protetto dalla password, e comparirà in cima ai
   risultati di ricerca solo se qualcuno cerca esattamente il vostro
   dominio).
2. Carica dentro tutti i file di questa cartella (dalla web UI di GitHub
   con "Add file → Upload files", oppure con git da riga di comando).
3. Vai in **Settings → Pages**, sezione "Build and deployment", scegli
   "Deploy from a branch" → branch `main`, cartella `/ (root)`.
4. Dopo un minuto il sito è online su
   `https://tuonomeutente.github.io/nome-repository/`.
5. Ogni volta che modifichi un file in `data/` e fai push, il sito si
   aggiorna da solo in circa un minuto.

Se in futuro vuoi un dominio personalizzato, si aggiunge in Settings →
Pages → Custom domain, ma non serve per partire.

## Nota sulla password

La protezione è lato client (JavaScript): tiene fuori i curiosi e i
motori di ricerca, ma non è sicurezza vera — chi guarda il codice
sorgente con impegno potrebbe aggirarla. Per un sito privato tra amici va
benissimo; non caricateci dati sensibili veri.

## Tono delle pagelle

Mandami le tue bozze grezze e le idee per ogni squadra dopo l'asta: le
rifinisco nel tono ignorante/cinico concordato (calcio + carattere del
fantallenatore + black humor) prima che tu le incolli nel file.
