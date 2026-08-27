# 🐂 Hertavernello — Stagione 2026/2027

Il sito ufficiale (non ufficiale) della lega di fantacalcio più temuta del web. Statico, gratuito, ospitato su GitHub Pages, e aggiornato a mano da chi ha già perso il fanta.

---

## ⚽ Cosa fa questo sito

### 🏠 Home
- **⚔️ Chi gioca contro chi** — per ogni partita reale di Serie A, le schede sfida tra i fantallenatori che si affrontano in quella giornata di lega, con i rispettivi giocatori coinvolti
- **🏆 Classifica generale previsioni** — chi ha indovinato meglio l'ordine finale della Serie A, aggiornata da sola col procedere del campionato
- **📊 Classifica Serie A** — la classifica reale, sempre aggiornata
- **🥅 Top marcatori** — i migliori marcatori del campionato
- Tutte le sezioni sono **espandibili/comprimibili** con un click sul titolo
- Aggiornamento automatico ogni 4 ore (per non sforare i limiti gratuiti dell'API), con l'orario del prossimo aggiornamento sempre visibile

### 👕 Squadre
Una scheda per ogni fantallenatore, con:
- **Nome fantasquadra e logo personalizzato**, caricabile direttamente dalla pagina
- **Rosa completa** divisa per ruolo, con lo stemma della squadra reale di ogni giocatore
- **ℹ️ Orari partite** — icona a comparsa che mostra quando gioca ciascun calciatore in questa giornata (🟡 da giocare, ⚪ già giocata), con avversario e orario in italiano
- **📝 Pagella** — il voto e il commento (rigorosamente ironico) dopo l'asta
- **🔮 Previsione Serie A** — lo screenshot del tiermaker con l'ordine previsto delle 20 squadre
- **🥧 Composizione rosa** — grafico a torta di quali squadre reali compongono la rosa, con soprannome goliardico automatico ("Il Fedelissimo del Napoli", "Lo Sfascia-derby", "Il Turista"...)
- **🌍 Da dove arriva la tua squadra** — stessa idea ma per nazionalità dei giocatori *(in arrivo dopo il calciomercato)*

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
- Import rose da CSV (esportazione diretta da fantacalcio.it)
- Scrittura pagelle
- Previsioni esatte posizione-per-posizione
- Calendario di lega, con import automatico dal file Excel di leghe.fantacalcio.it
- Salvataggio diretto su GitHub da ogni sezione, senza dover scaricare/ricaricare file a mano

---

## ⚙️ Come funziona sotto il cofano

- **Zero backend, zero database** — solo file statici HTML/CSS/JavaScript
- **Dati Serie A** in tempo reale da [football-data.org](https://www.football-data.org) (piano gratuito), con cache intelligente per restare sotto il limite di richieste
- **Ospitato gratis** su GitHub Pages
- Tutti i dati della lega (rose, pagelle, previsioni, calendario) vivono in semplici file `.json` dentro `data/`

---

## 🚧 In lavorazione

- Grafico a torta per nazionalità dei giocatori (in attesa dei dati aggiornati dopo il calciomercato)

---

*Aggiornato al 27/08/2026 — questo file cresce insieme al sito, quindi se leggi questo elenco tra qualche mese potrebbe già essere superato.*
