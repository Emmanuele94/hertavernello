# 🐂 Hertavernello — Stagione 2026/2027

Il sito ufficiale *(non ufficiale)* della lega di fantacalcio più temuta del web.

Frontend statico, gratuito e ospitato su **GitHub Pages**, con alcuni servizi dinamici affidati a **Cloudflare Workers + D1**. Nasce per tenere insieme rose, calendario, risultati, pagelle, previsioni, archivio storico, contenuti multimediali e — soprattutto — materiale utile per prendere in giro gli amici nel gruppo WhatsApp.

🔗 **Sito:** https://emmanuele94.github.io/hertavernello/

---

## ⚽ Cosa fa questo sito

### 🏠 Home

- **⏱️ Countdown asta** — mostra il conto alla rovescia per l'asta iniziale e, se configurata, anche per l'asta di riparazione. Una volta passata la data, resta indicato quando è stata fatta.
- **⚔️ Chi gioca contro chi** — usa il calendario della fantalega come riferimento: se la lega inizia più avanti rispetto alla Serie A, mostra già in anteprima la prima giornata fantasy configurata invece di restare bloccato sulle giornate precedenti.
- Le **10 partite reali di Serie A** vengono mostrate in schede compatte, inizialmente chiuse ed espandibili singolarmente; se ne possono tenere aperte più di una contemporaneamente.
- **👤 Scegli la tua squadra** — filtro rapido per mostrare solo gli scontri fantasy che coinvolgono una determinata fantasquadra; con **Tutte le squadre** si torna alla panoramica completa.
- Dentro ogni partita reale vengono mostrati gli **scontri fantasy coinvolti** con i giocatori delle due rose che scendono in campo.
- **📸 Condivisione scontro** — ogni singolo scontro fantasy può essere trasformato in immagine: su desktop si può copiare negli appunti o scaricare in PNG; su mobile, quando supportato, si apre direttamente il menu di condivisione del telefono (WhatsApp, Telegram, ecc.).
- **🔥 Highlights della settimana** — punteggio più alto, strisce, curiosità e altri dati generati automaticamente dai risultati caricati.
- **🏆 Classifica della lega** — vittorie, pareggi, sconfitte e punti calcolati automaticamente dai risultati settimanali.
- **Classifica generale previsioni · Classifica Serie A · Top marcatori** — con stemmi più leggibili, foto giocatori, nazionalità, gol e assist.
- Tutte le principali sezioni sono **espandibili/comprimibili**.
- Aggiornamento dati **dinamico**: più frequente quando ci sono partite in corso, più rilassato nei giorni senza gare.
- Layout responsive: su monitor grandi la Home sfrutta meglio lo spazio disponibile, mentre su tablet e smartphone si ricompone senza scroll orizzontali inutili.

---

### 👕 Squadre

Una scheda per ogni fantallenatore, ottimizzata sia per desktop sia per mobile.

- **Logo grande personalizzato**, foto/logo del presidente, logo piccolo e posizione in classifica.
- Lo **stemma grande della fantasquadra** è cliccabile/tappabile e si apre ingrandito in lightbox.
- **🔎 Ricerca immediata** — da 3 caratteri cerca sia calciatori sia fantasquadre. Selezionando un risultato, apre automaticamente la squadra corretta, scorre fino al giocatore e lo evidenzia per qualche secondo.
- **Badge automatici** legati ai risultati della lega: Dominatore, Maglia Nera, Corazzata, Cecchino, Perseguitato, Miglior Difesa, Miglior Attacco, Bomber di Lega e altri riconoscimenti calcolati automaticamente.
- **Rosa completa** divisa per ruolo, con foto del calciatore, squadra reale, stemma, nazionalità e prezzo pagato.
- Su mobile la rosa resta compatta e leggibile senza dover scorrere lateralmente per vedere i crediti/prezzo.
- **ℹ️ INFO Rosa** — un solo pulsante accanto al titolo Rosa mostra o nasconde sotto le righe dei giocatori le informazioni sulle partite reali della giornata: avversario, giorno/orario e stato della gara.
- **📝 Pagella** — piccolo badge accanto alla scheda del fantallenatore che apre una pagina dedicata a pieno schermo, senza occupare tutta la pagina Squadre.
- **🔮 Previsione Serie A** — screenshot/tiermaker con ordine previsto delle 20 squadre; in Admin una squadra già scelta sparisce dagli altri menu della stessa previsione, evitando doppioni.
- **🥧 Composizione rosa** e **🌍 provenienza** — percentuali per squadre reali e nazionalità, con soprannomi goliardici automatici su 5 livelli, ad esempio **Il Monomarca, Lo Scout, Il Turista, Il Mercante Globale, Il Km Zero, Il Talent Scout, Il Cosmopolita, L'ONU del Fantacalcio**.
- **🎬 Highlights video** — video YouTube della fantasquadra con anteprima cliccabile e player incorporato nella pagina.
- **🔊 Audio** — clip della fantasquadra con visualizzazione animata legata al volume reale, caricamento multiplo e titolo modificabile.
- **🔄 Storico mercato** — gli scambi registrati dall'Admin compaiono sotto la squadra in righe compatte e cliccabili, con dettaglio dei giocatori ceduti/ricevuti e della controparte.

---

### 📝 Pagella dedicata

Le pagelle dell'asta non sono più costrette dentro la pagina Squadre.

- Pagina dedicata e responsive per ogni fantasquadra.
- Mostra **nome squadra, stemma, fantallenatore, foto/logo del presidente, voto, badge e testo completo**.
- I testi già scritti restano nei dati esistenti: la pagina è solo una nuova modalità di visualizzazione.
- **📋 Copia testo** — per incollare la pagella su WhatsApp, ChatGPT o dove serve.
- **📸 Copia immagine** — su desktop crea una versione grafica pronta da incollare.
- **⬇ Scarica PNG** — salva la pagella come immagine.
- **📤 Condividi da mobile** — quando il browser lo supporta, apre direttamente il menu di condivisione del telefono.
- Il tasto di ritorno riporta direttamente alla fantasquadra corretta nella pagina Squadre.

---

### 📜 Archivio

Tre viste principali per rivivere le stagioni passate, completamente adattate anche agli schermi piccoli.

- **🏅 Albo d'oro** — classifica storica per Campionato, Coppa e generale; gli anni delle vittorie sono sempre visibili.
- **📅 Lista stagioni** — una scheda per ogni annata dal 2018/19 in poi, selezionabile da una barra scorrevole.
- Ogni stagione è organizzata in:
  - **Home** — vincitore del campionato, vincitore/i della coppa, video della stagione e regolamento storico quando disponibile.
  - **Curiosità** — classifica Serie A completa, marcatori con foto dove disponibili e curiosità dell'anno.
  - **Squadre** — fantallenatori della stagione, rose storiche, stemmi dell'epoca e pagelle.
- Se una fantasquadra ha avuto **asta iniziale + asta di riparazione** nella stessa stagione, entrambe le rose possono essere conservate e mostrate separatamente.
- Video, pagelle e rose storiche possono essere caricati/modificati direttamente dall'area di gestione prevista.
- **🔊 Audio storici** — raccolta degli audio più memorabili della lega.
- Tabelle, rose, pagelle, media e sotto-navigazioni sono state ripensate per evitare overflow e scroll orizzontali generali su smartphone.

---

### 📄 Regolamento

- Tasto sempre disponibile nel sito.
- Anteprima PDF incorporata.
- **Scarica** e **Apri in un'altra scheda**.
- Caricamento da Admin: il regolamento resta attivo finché non viene sostituito.
- Durante l'archiviazione della stagione può essere congelato insieme agli altri contenuti storici.

---

### 🧠 Mini-Quiz

- 38 giornate, una scheda per ciascuna.
- Ogni giornata si sblocca automaticamente quando le partite reali risultano concluse.
- 10 domande generate dai risultati reali e dalle rose.
- Punteggio salvato localmente nel browser con possibilità di reset.

---

## 💡 Bug & Consigli

Il sito ha un vero sistema interno per raccogliere segnalazioni senza intasare il gruppo WhatsApp.

- Voce **💡 Bug / Consigli** disponibile nella navigazione.
- Scelta tra:
  - **🐛 Segnala bug**
  - **💡 Proponi consiglio**
- Campi per nome e descrizione.
- Fino a **5 immagini/screenshot** per segnalazione.
- Le immagini vengono compresse prima dell'invio.
- **Bozza automatica in IndexedDB**: se si chiude la pagina per errore, testo e immagini restano salvati e vengono ripristinati alla riapertura.
- Su desktop è possibile:
  - trascinare immagini nel riquadro;
  - incollare direttamente uno screenshot dagli appunti con **Ctrl+V**, senza salvarlo prima come file.
- Su mobile resta il caricamento classico di screenshot/foto.
- Le segnalazioni vengono salvate su **Cloudflare D1** tramite Worker.
- L'Admin vede il numero delle nuove segnalazioni con un badge e può aprire direttamente la sezione dedicata.
- Stati disponibili: **Nuova · Da valutare · Accettata · Risolta · Scartata**.
- Ogni segnalazione conserva anche informazioni tecniche utili come pagina, versione sito, browser/piattaforma e dimensione schermo.
- **📋 Copia per ChatGPT** prepara automaticamente un testo ordinato da incollare in chat per discutere il bug o la proposta.

---

## ❓ Guida iniziale

- Alla prima visita compare una guida breve che spiega **Home, Squadre, Archivio e Bug/Consigli**.
- L'utente può scegliere **Non mostrare più**.
- La scelta viene memorizzata sul singolo browser/dispositivo.
- La guida resta sempre riapribile manualmente dalla navigazione.

---

## 🔐 Accesso

- Password unica per gli ospiti e password separata per l'amministratore.
- Le funzioni riservate restano invisibili agli utenti normali.
- Il tasto Admin compare solo quando si entra come amministratore.
- Il vecchio pulsante pubblico **Pulisci cache** è stato rimosso.
- Gli aggiornamenti normali del sito **non devono più disconnettere gli utenti**.
- La funzione Admin **Disconnetti tutti** resta separata e serve davvero a invalidare le sessioni quando necessario.

---

## 🛠️ Pannello Admin

Il pannello non è più una singola pagina infinita: è organizzato in **schede tematiche** e ricorda l'ultima scheda aperta.

Se si arriva da un collegamento diretto — per esempio **Bug / Consigli** — apre automaticamente la scheda corretta.

### Navigazione Admin

Le funzioni sono raggruppate in aree come:

- **🏠 Generale**
- **👥 Rose & Giocatori**
- **🔄 Mercato & Scambi**
- **📅 Calendario & Risultati**
- **📊 Contenuti**
- **💡 Bug & Consigli**
- aree dedicate a grafica/icone e altre funzioni già esistenti

La navigazione rapida numerata apre la scheda corretta e fa scroll morbido fino al blocco richiesto.

### 👥 Rose & Giocatori

- Import rose da **CSV/Excel**.
- Supporto alla colonna `Squadra_Appartenenza`.
- Salvataggio del **Fantacalcio_Id** per rendere più affidabile l'associazione dei giocatori.
- Il matching usa prima l'ID e poi il nome come fallback: un trasferimento di squadra reale non deve più far sparire automaticamente una foto corretta.
- **Ricerca giocatore** nell'Admin.
- Modifica di:
  - squadra reale;
  - nazionalità;
  - foto.
- Le modifiche possono essere preparate in sequenza e poi salvate insieme con **Salva tutte le modifiche**.
- La foto scelta viene caricata e collegata direttamente al giocatore selezionato: non è più necessario affidarsi al nome del file caricato manualmente nella repo.
- Convenzione nazionalità: **nazionalità sportiva se il giocatore rappresenta una nazionale; altrimenti nazionalità principale**.

### 🔄 Mercato & Scambi

- Scelta manuale della **data dello scambio**, anche retroattiva.
- Selezione delle due fantasquadre.
- Dopo aver scelto una squadra, compare la rosa divisa per ruolo con **checkbox**.
- Supporto tecnico a scambi multipli.
- Regola attuale della lega: **stesso numero di giocatori e stessi ruoli da entrambe le parti**.
- Esempio valido: `1 C + 1 A ↔ 1 C + 1 A`.
- Riepilogo prima della conferma.
- Al salvataggio:
  - aggiorna automaticamente `data/rose.json`;
  - registra lo storico in `data/mercato.json`;
  - rende il movimento visibile nella pagina Squadre.
- Nessuna gestione interna dei crediti: il sito resta uno strumento di intrattenimento/storico, mentre i crediti ufficiali vengono gestiti dalla piattaforma della lega.

### 📅 Calendario & Risultati

- Calendario di lega gestibile manualmente.
- Nella stessa giornata, una fantasquadra già selezionata **sparisce dalle altre select**, evitando duplicati.
- Se viene cambiata o rimossa, torna disponibile.
- La regola vale solo all'interno della stessa giornata.
- Le ultime squadre restano sempre da scegliere manualmente.
- Il salvataggio viene bloccato se una squadra compare due volte nella stessa giornata.
- La lista delle giornate salvate è contenuta in un box con **scroll interno**, così l'Admin non diventa infinito quando il calendario è completo.
- **Aggiorna risultati** — caricamento dei risultati della giornata tramite i flussi già previsti dal sito, con controllo prima del salvataggio; da qui derivano classifica, badge e highlights.

### 📝 Pagelle, previsioni e contenuti

- Scrittura/modifica delle pagelle dell'asta.
- Previsioni Serie A posizione-per-posizione con filtro anti-doppione.
- Caricamento regolamento PDF.
- Gestione video, audio, stemmi, icone e contenuti storici.
- Archiviazione stagione con conservazione separata delle rose iniziali e, quando previsto, delle rose post-riparazione.

### 💡 Bug & Consigli Admin

- Elenco segnalazioni con filtri per stato.
- Badge numerico delle nuove segnalazioni.
- Visualizzazione degli screenshot allegati.
- Cambio stato.
- Pulsante **Copia per ChatGPT**.

### 🔌 Salvataggio GitHub

- Le sezioni che modificano i dati usano il salvataggio diretto sulla repository GitHub.
- Token conservato in `sessionStorage`.
- Gestione SHA e conflitti.
- Attesa automatica di circa **60 secondi tra salvataggi delicati/multipli** per evitare i limiti anti-abuso di GitHub.

---

## 📱 Responsive design

Il sito è stato ripensato per funzionare bene su:

- monitor desktop grandi;
- notebook;
- tablet;
- smartphone.

In particolare:

- la Home sfrutta circa il **92% della larghezza** sui display grandi, con limite massimo per non diventare dispersiva;
- rose e tabelle principali non richiedono più scroll orizzontali generali su mobile;
- pulsanti e touch target sono più comodi;
- stemmi, icone e badge sono più leggibili sugli schermi grandi;
- Archivio e Squadre hanno layout dedicati alle larghezze ridotte;
- i blocchi molto lunghi hanno scroll interni solo dove serve davvero.

---

## ⚙️ Come funziona sotto il cofano

L'architettura non è più completamente “zero backend”: il cuore del sito resta statico, ma alcuni servizi dinamici passano da Cloudflare.

### Frontend

- HTML, CSS e JavaScript statici.
- Pubblicazione principale su **GitHub Pages**.
- Dati della lega principalmente in file `.json` dentro `data/`.

### Cloudflare

- **Cloudflare Worker** per gli endpoint dinamici del sito.
- **D1 Database** per Bug & Consigli, inclusi testo, stato e immagini compresse.
- Le immagini delle segnalazioni sono memorizzate direttamente in D1: non è richiesto R2.
- Il Worker espone API utilizzabili sia dalla copia GitHub Pages sia dalla distribuzione Cloudflare.
- CORS configurato per permettere il funzionamento cross-host.

### Deploy Cloudflare

- Deploy gestito con `wrangler.jsonc`.
- Script `cloudflare-deploy.sh` crea automaticamente le regole di esclusione necessarie prima del deploy.
- Questo evita che `.git` e altri file tecnici vengano considerati Static Assets da Wrangler.
- Database D1 collegato esplicitamente tramite binding.

### Dati Serie A

- Dati in tempo reale da **football-data.org** tramite proxy Cloudflare.
- Cache dinamica per ridurre le richieste nei giorni tranquilli e aggiornare più spesso durante le partite.

### Database giocatori

- Oltre 500 calciatori con foto, nazionalità e dati di associazione.
- Utilizzato in rose, marcatori, Archivio e altre sezioni.
- Supporto a `Fantacalcio_Id` per un matching più stabile rispetto al solo nome/squadra.
- Le foto possono essere associate direttamente dall'Admin senza dipendere dal nome fisico del file.

### Cache e aggiornamenti

- Service worker dedicato (`sw-restyling.js`).
- Versione corrente gestita tramite `data/versione.json`.
- Le release normali aggiornano CSS/JS/cache **senza cancellare la sessione**.
- Il logout globale usa una versione sessione separata.
- Vecchie cache legacy vengono ripulite automaticamente quando non servono più.
- Le chiamate `/api/` sono escluse dalla cache del service worker.
- Gli asset modificabili come stemmi/previsioni vengono gestiti senza cache-buster casuali basati su `Date.now()`, evitando di gonfiare inutilmente la cache mobile.

### Pulizia tecnica

Nel tempo sono stati rimossi diversi residui legacy, tra cui il vecchio service worker e file di versione non più usati, mantenendo invece redirect e compatibilità utili per vecchi link.

---

## 🗂️ Dati principali

I file più importanti includono:

- `data/rose.json` — rose correnti
- `data/giocatori.json` — database giocatori, foto, nazionalità e ID
- `data/calendario.json` — calendario della fantalega
- `data/risultati.json` — risultati
- `data/pagelle.json` — pagelle dell'asta
- `data/previsioni.json` — previsioni Serie A
- `data/mercato.json` — storico degli scambi
- `data/albo-oro.json` — archivio storico
- `data/versione.json` — versione del sito/cache

A questi si aggiungono i file dedicati ad audio, configurazione, loghi e altri contenuti della lega.

---

## 🚧 Idee / sviluppi futuri

- Migliorare ulteriormente la parte grafica della Home, badge e icone man mano che vengono creati nuovi asset.
- Possibili notifiche esterne per Bug & Consigli in futuro; per ora il badge Admin è sufficiente.
- Il contatore utenti online in tempo reale resta fuori scope finché non serve un servizio dedicato.
- Eventuali nuove regole di mercato potranno sfruttare il motore scambi già predisposto per selezioni multiple.

---

*Aggiornato al 19/09/2026 — questo file cresce insieme a Hertavernello, quindi se lo stai leggendo tra qualche mese potrebbe essere già superato.*
