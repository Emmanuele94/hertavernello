# 🐂 Hertavernello — Stagione 2026/2027

Il sito ufficiale (non ufficiale) della lega di fantacalcio più temuta del web. Statico, gratuito, ospitato su GitHub Pages, e aggiornato a mano da chi ha già perso il fanta.

---

## ⚽ Cosa fa questo sito

### 🏠 Home
- **⏱️ Countdown asta** — alla data dell'asta iniziale, e appena impostata anche a quella dell'asta di riparazione (facoltativa: finché non la imposti, semplicemente non compare); passata la data, il countdown diventa "fatta il... ora italiana"
- **⚔️ Chi gioca contro chi** — per ogni partita reale di Serie A, le schede sfida tra i fantallenatori che si affrontano in quella giornata di lega; il live resta visibile (col punteggio) anche a partita finita, fino all'inizio della giornata successiva
- **🔥 Highlights della settimana** — punteggio più alto, striscia di chi è primo in classifica, e altre curiosità, generati da soli dai risultati caricati
- **🏆 Classifica della lega** — la classifica vera della fantalega (vittorie, pareggi, sconfitte, punti), calcolata da sola dai risultati settimanali
- **Classifica generale previsioni · Classifica Serie A · Top marcatori** — affiancate su una riga sola; i marcatori mostrano stemma squadra, foto del giocatore, nazionalità (bandiera col tooltip) e assist, non solo i gol
- Tutte le sezioni sono **espandibili/comprimibili** con un click sul titolo
- Aggiornamento **intelligente**: più frequente quando ci sono partite in corso, molto più diluito nei giorni morti — non più un orario fisso ogni 4 ore

### 👕 Squadre
Una scheda per ogni fantallenatore, con:
- **Logo grande personalizzato** + **logo piccolo (512×512)** e **posizione in classifica**, affiancati accanto al nome
- **Badge automatici** — Il Dominatore, La Maglia Nera, La Corazzata, Il Cecchino, Il Perseguitato, Miglior Difesa, Miglior Attacco, Bomber di Lega (incrocia i gol reali dei giocatori in rosa con l'API) — tutti calcolati da soli dai risultati
- **Rosa completa** divisa per ruolo, con foto del giocatore, stemma della squadra reale e bandiera della nazionalità
- **ℹ️ Orari partite** — icona a comparsa che mostra quando gioca ciascun calciatore in questa giornata (🟡 da giocare, ⚪ già giocata), con avversario e orario in italiano
- **📝 Pagella** — il voto (con emoji e "medaglia" interattiva) e il commento (rigorosamente ironico) dopo l'asta
- **🔮 Previsione Serie A** — lo screenshot del tiermaker con l'ordine previsto delle 20 squadre; in Admin, scegliendo una squadra reale per una posizione, questa sparisce dagli altri menu di quella fantasquadra (mai più doppioni), con contatore "X su 20 assegnate"
- **🥧 Composizione rosa** e **🌍 Da dove arriva la tua squadra** — liste con percentuali (squadre reali e nazionalità dei giocatori), con soprannome goliardico automatico ("Il Fedelissimo del Napoli", "Il Cosmopolita", "Il Turista"...)
- **🎬 Highlights** — video YouTube della fantasquadra (quanti se ne vuole), a piena larghezza, con anteprima cliccabile che si trasforma nel player incorporato (mai un cambio scheda); legati alla stagione, quindi caricarne di nuovi non cancella mai quelli dell'asta precedente
- **🔊 Audio** — clip audio proprie della fantasquadra (i momenti più memorabili), stesso principio dei video: riquadri quadrati con una linea che si anima seguendo il volume vero dell'audio (non un'animazione finta), caricamento multiplo con titolo proposto dal nome del file e modificabile prima di salvare

### 📜 Archivio
Tre viste per rivivere le stagioni passate:
- **🏅 Albo d'oro** — classifica di sempre per Campionato, Coppa e generale; gli anni delle vittorie stanno sempre visibili sotto il nome, senza bisogno di cliccare
- **📅 Lista stagioni** — una scheda per ogni annata (dal 2018/19 a oggi), selezionabile da una barra di anni scorrevole, organizzata in 3 sotto-sezioni:
  - **Home** — vincitore del campionato, vincitore/i della coppa, video della stagione (a piena larghezza, cliccabili come in Squadre), e il regolamento di quell'anno se ne è stato archiviato uno
  - **Curiosità** — classifica Serie A completa (con gli stemmi reali, comprese le squadre non più in A come Benevento, Sampdoria, Chievo...), classifica marcatori (con foto, dove disponibili) e curiosità dell'anno
  - **Squadre** — bottoni orizzontali scrollabili, uno per ogni fantallenatore di quella stagione; cliccando si apre la sua rosa (con lo stemma dell'epoca, se archiviato) e la sua pagella. Se quella fantasquadra ha avuto sia un'asta iniziale che una di riparazione nella stessa stagione, compaiono entrambe le rose, impilate ed etichettate
  - Video, pagelle (con voto ed emoji automatica), e rose si caricano/modificano **direttamente dalla pagina**, salvataggio diretto su GitHub. Le rose si possono incollare direttamente da una colonna Excel (o due colonne insieme, per abbinare anche la squadra reale del giocatore e trovargli la foto)
- **🔊 Audio storici** — gli audio migliori/più storici di tutta la lega: stessi riquadri con linea animata sul volume, caricamento multiplo, gestibili in autonomia da Admin

### 📄 Regolamento
- Tasto sempre visibile in ogni pagina: apre un pannello con l'anteprima del PDF incorporata, più i tasti "Scarica" e "Apri in un'altra scheda" (funziona sia da desktop che da telefono)
- Si carica una volta da Admin e resta lì finché non lo sostituisci
- Quando archivi la prima parte di una stagione, il regolamento di quel momento viene congelato insieme al resto (vedi sotto)

### 🧠 Mini-Quiz
- 38 giornate, una scheda per ciascuna
- Ogni giornata si sblocca da sola appena le partite reali sono concluse
- 10 domande generate automaticamente dai risultati veri e dalle vostre rose (mai scritte a mano)
- Punteggio salvato nel browser di chi gioca, con possibilità di reset

### 🔐 Accesso
- Password unica per gli ospiti, password separata per l'amministratore
- Le sezioni riservate (pannello admin) restano invisibili a chi non ha le credenziali giuste
- Tasto Admin in nav, visibile solo a chi è già entrato come admin
- **↻ Pulisci cache** in ogni pagina: pulizia manuale immediata (fa anche logout) per chi non vuole aspettare l'aggiornamento automatico
- Il sito si aggiorna **da solo** dopo ogni modifica pubblicata: non serve più fare Ctrl+F5 (vedi sotto)

### 🛠️ Pannello Admin (riservato)
- Impostazioni lega (nomi, password, date — asta e asta di riparazione, chiave API)
- Import rose da **CSV o Excel** (esportazione diretta da fantacalcio.it)
- **Aggiorna risultati** — carica i 6 risultati della giornata in 3 modi (screenshot con riconoscimento automatico, testo incollato, o inserimento manuale), con schermata di controllo prima di salvare; da qui si calcolano da soli classifica di lega, badge e highlights
- Scrittura pagelle, previsioni esatte posizione-per-posizione (con filtro a cascata: una squadra scelta sparisce dagli altri menu della stessa fantasquadra)
- Calendario di lega, con import automatico dal file Excel di leghe.fantacalcio.it
- **Archivia la stagione** — due bottoni: "Archivia prima parte" (copia rose + pagelle + video + stemmi + regolamento nell'Archivio, restando nascosto finché la stagione è "in corso") e "Archivia dopo la riparazione" (aggiorna solo le rose, senza mai toccare quelle iniziali)
- **Disconnetti tutti** — un click per far uscire chiunque abbia il sito aperto, entro un paio di minuti
- Caricamento del **regolamento** in PDF
- Salvataggio diretto su GitHub da ogni sezione, senza dover scaricare/ricaricare file a mano — con attesa automatica tra un salvataggio e l'altro per non far scattare i limiti "anti-abuso" di GitHub (mai più errori caricando più cose una via l'altra)

---

## ⚙️ Come funziona sotto il cofano

- **Zero backend, zero database** — solo file statici HTML/CSS/JavaScript
- **Dati Serie A** in tempo reale da [football-data.org](https://www.football-data.org) (piano gratuito), con cache **dinamica** (si stringe nei giorni di partite, si allarga nei giorni morti) per restare sotto il limite di richieste
- **Database giocatori** (foto + nazionalità, oltre 500 calciatori di Serie A) usato per riconoscere automaticamente foto e bandiere ovunque compaia un nome — marcatori, rose, archivio. Per i giocatori storici che il database attuale non trova (ritirati, all'estero...), si può caricare una foto a mano per quel singolo giocatore
- **Aggiornamento automatico e cache**: ogni pagina controlla in automatico (e ogni paio di minuti mentre resta aperta) se il sito è stato aggiornato; se sì, pulisce sessione/cache e si ricarica da sola — niente più Ctrl+F5. È lo stesso meccanismo usato da "Disconnetti tutti"
- **Attesa automatica tra i salvataggi su GitHub** (60 secondi), con conto alla rovescia visibile nei caricamenti più delicati (audio multipli, logo squadra) — evita gli errori "anti-abuso" di GitHub quando si salvano più cose a distanza ravvicinata
- **Video e audio legati alla stagione**: caricarne di nuovi non cancella mai quelli di stagioni precedenti
- **Ospitato gratis** su GitHub Pages
- Tutti i dati della lega (rose, pagelle, previsioni, calendario, risultati, audio, versione del sito) vivono in semplici file `.json` dentro `data/`

---

## 🚧 In lavorazione

- Il contatore di utenti online in tempo reale non è fattibile con questa architettura (sito statico, senza backend) senza aggiungere un servizio esterno dedicato — per ora accantonato

---

*Aggiornato all'11/09/2026 — questo file cresce insieme al sito, quindi se leggi questo elenco tra qualche mese potrebbe già essere superato.*
