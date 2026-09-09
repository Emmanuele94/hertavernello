# 🐂 Hertavernello — Stagione 2026/2027

Il sito ufficiale (non ufficiale) della lega di fantacalcio più temuta del web. Statico, gratuito, ospitato su GitHub Pages, e aggiornato a mano da chi ha già perso il fanta.

---

## ⚽ Cosa fa questo sito

### 🏠 Home
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
- **📝 Pagella** — il voto e il commento (rigorosamente ironico) dopo l'asta
- **🔮 Previsione Serie A** — lo screenshot del tiermaker con l'ordine previsto delle 20 squadre
- **🥧 Composizione rosa** e **🌍 Da dove arriva la tua squadra** — liste con percentuali (squadre reali e nazionalità dei giocatori), con soprannome goliardico automatico ("Il Fedelissimo del Napoli", "Il Cosmopolita", "Il Turista"...)
- **🎬 Highlights** — video YouTube della fantasquadra (quanti se ne vuole), caricabili direttamente dalla pagina

### 📜 Archivio
Due viste per rivivere le stagioni passate:
- **🏅 Albo d'oro** — classifica di sempre per Campionato, Coppa e generale; gli anni delle vittorie stanno sempre visibili sotto il nome, senza bisogno di cliccare
- **📅 Lista stagioni** — una scheda per ogni annata (dal 2018/19 a oggi), selezionabile da una barra di anni scorrevole, organizzata in 3 sotto-sezioni:
  - **Home** — vincitore del campionato, vincitore/i della coppa, video della stagione
  - **Curiosità** — classifica Serie A completa (con gli stemmi reali, comprese le squadre non più in A come Benevento, Sampdoria, Chievo...), classifica marcatori (con foto, dove disponibili) e curiosità dell'anno
  - **Squadre** — le rose storiche di ogni fantasquadra (con foto dei giocatori, dove riconoscibili) e le pagelle di quell'anno
  - Video e pagelle si caricano **direttamente dalla pagina**, righe multiple, salvataggio diretto su GitHub

### 🧠 Mini-Quiz
- 38 giornate, una scheda per ciascuna
- Ogni giornata si sblocca da sola appena le partite reali sono concluse
- 10 domande generate automaticamente dai risultati veri e dalle vostre rose (mai scritte a mano)
- Punteggio salvato nel browser di chi gioca, con possibilità di reset

### 🔐 Accesso
- Password unica per gli ospiti, password separata per l'amministratore
- Le sezioni riservate (pannello admin) restano invisibili a chi non ha le credenziali giuste

### 🛠️ Pannello Admin (riservato)
- Impostazioni lega (nomi, password, date, chiave API)
- Import rose da **CSV o Excel** (esportazione diretta da fantacalcio.it)
- **Aggiorna risultati** — carica i 6 risultati della giornata in 3 modi (screenshot con riconoscimento automatico, testo incollato, o inserimento manuale), con schermata di controllo prima di salvare; da qui si calcolano da soli classifica di lega, badge e highlights
- Scrittura pagelle, previsioni esatte posizione-per-posizione
- Calendario di lega, con import automatico dal file Excel di leghe.fantacalcio.it
- Salvataggio diretto su GitHub da ogni sezione, senza dover scaricare/ricaricare file a mano

---

## ⚙️ Come funziona sotto il cofano

- **Zero backend, zero database** — solo file statici HTML/CSS/JavaScript
- **Dati Serie A** in tempo reale da [football-data.org](https://www.football-data.org) (piano gratuito), con cache **dinamica** (si stringe nei giorni di partite, si allarga nei giorni morti) per restare sotto il limite di richieste
- **Database giocatori** (foto + nazionalità, oltre 500 calciatori di Serie A) usato per riconoscere automaticamente foto e bandiere ovunque compaia un nome — marcatori, rose, archivio
- **Ospitato gratis** su GitHub Pages
- Tutti i dati della lega (rose, pagelle, previsioni, calendario, risultati) vivono in semplici file `.json` dentro `data/`

---

## 🚧 In lavorazione

- Foto "d'epoca" dei giocatori nell'Archivio (per ora si vedono solo se il giocatore gioca ancora oggi — il database foto è quello della stagione attuale)

---

*Aggiornato al 09/09/2026 — questo file cresce insieme al sito, quindi se leggi questo elenco tra qualche mese potrebbe già essere superato.*
