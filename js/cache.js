// ===== Cache locale: evita di interrogare l'API troppo spesso (limite gratuito:
// 10 richieste/minuto), ed evita pagine vuote se l'API non risponde =====
const HV_CACHE_DURATA = 4 * 60 * 60 * 1000; // 4 ore

function hv_cacheLeggiGrezzo(chiave) {
  try {
    const raw = localStorage.getItem(chiave);
    return raw ? JSON.parse(raw) : null; // { t: timestamp, v: valore } oppure null
  } catch (e) {
    return null;
  }
}

function hv_cacheSet(chiave, valore) {
  try {
    localStorage.setItem(chiave, JSON.stringify({ t: Date.now(), v: valore }));
  } catch (e) {}
}

function hv_orarioBreve(timestamp) {
  const d = new Date(timestamp);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

// Recupera dati con cache: se in cache da meno di maxAgeMs la usa senza chiamare
// l'API. Se scaduta o assente, prova a richiamare l'API; se la chiamata fallisce
// (limite di richieste raggiunto, rete, ecc.) ripiega sui dati vecchi in cache —
// pur di non lasciare la pagina vuota ai tuoi amici — e lo segnala nel risultato.
// Solo se non c'è proprio nessun dato salvato, propaga l'errore.
async function hv_cacheOFetch(chiave, maxAgeMs, fetcherAsync) {
  const cache = hv_cacheLeggiGrezzo(chiave);
  const fresca = cache && Date.now() - cache.t <= maxAgeMs;

  if (fresca) return { dati: cache.v, orario: cache.t, scaduta: false };

  try {
    const dati = await fetcherAsync();
    hv_cacheSet(chiave, dati);
    return { dati, orario: Date.now(), scaduta: false };
  } catch (err) {
    if (cache) return { dati: cache.v, orario: cache.t, scaduta: true, errore: err };
    throw err;
  }
}

function hv_avvisoDatiVecchi(scaduta) {
  return scaduta
    ? '<p class="muted" style="font-size:11px; color: var(--giallo-neon); margin-top:6px;">⚠ L\'API non risponde al momento — questi sono gli ultimi dati salvati, potrebbero non essere aggiornatissimi.</p>'
    : "";
}

// ===== TTL dinamici, calcolati sulle partite già scaricate (non serve una
// chiamata in più): niente più "ogni 4 ore fisse" tutti i giorni, anche quando
// non si gioca. =====

// Quanto aspettare prima di ricontrollare "chi gioca contro chi": se una partita
// è in corso (o sta per iniziare/è appena finita) si aggiorna spesso; nei giorni
// senza partite si allunga, fino a un massimo di 6 ore.
function hv_prossimoTTLPartite(matches, now) {
  const ATTIVA_PRIMA_MS = 10 * 60 * 1000;
  const ATTIVA_DOPO_MS = 130 * 60 * 1000;
  const TTL_ATTIVO = 25 * 60 * 1000;
  const TTL_QUIETO_MAX = 6 * 60 * 60 * 1000;
  const TTL_QUIETO_MIN = 30 * 60 * 1000;

  if (!matches || matches.length === 0) return TTL_QUIETO_MAX;

  let inFinestraAttiva = false;
  let prossimoInizioFinestra = null;

  matches.forEach((m) => {
    if (m.status === "IN_PLAY" || m.status === "PAUSED") {
      inFinestraAttiva = true;
      return;
    }
    const kickoff = new Date(m.data).getTime();
    const inizioFinestra = kickoff - ATTIVA_PRIMA_MS;
    const fineFinestra = kickoff + ATTIVA_DOPO_MS;
    if (now >= inizioFinestra && now <= fineFinestra) inFinestraAttiva = true;
    if (inizioFinestra > now && (prossimoInizioFinestra === null || inizioFinestra < prossimoInizioFinestra)) {
      prossimoInizioFinestra = inizioFinestra;
    }
  });

  if (inFinestraAttiva) return TTL_ATTIVO;
  if (prossimoInizioFinestra !== null) {
    const attesa = prossimoInizioFinestra - now;
    return Math.max(TTL_QUIETO_MIN, Math.min(TTL_QUIETO_MAX, attesa));
  }
  return TTL_QUIETO_MAX;
}

// Quanto aspettare prima di ricontrollare classifica/marcatori/previsioni: si
// aggiornano quando una partita finisce (calcio d'inizio + ~100 minuti, recupero
// incluso), non a orario fisso. "matches" sono le partite già scaricate per "chi
// gioca contro chi" — stessa lista, nessuna chiamata in più solo per questo calcolo.
function hv_prossimoTTLClassifica(matches, now, ultimoAggiornamento) {
  const DURATA_STIMATA_MS = 100 * 60 * 1000;
  const TTL_MASSIMO = 6 * 60 * 60 * 1000;
  const TTL_MINIMO = 15 * 60 * 1000;

  if (!matches || matches.length === 0) return TTL_MASSIMO;

  let prossimoCheckpoint = null;
  let checkpointAppenaPassato = false;

  matches.forEach((m) => {
    const kickoff = new Date(m.data).getTime();
    const checkpoint = kickoff + DURATA_STIMATA_MS;
    if (checkpoint > ultimoAggiornamento && checkpoint <= now) checkpointAppenaPassato = true;
    if (checkpoint > now && (prossimoCheckpoint === null || checkpoint < prossimoCheckpoint)) {
      prossimoCheckpoint = checkpoint;
    }
  });

  if (checkpointAppenaPassato) return 0;
  if (prossimoCheckpoint !== null) {
    const attesa = prossimoCheckpoint - now;
    return Math.max(TTL_MINIMO, Math.min(TTL_MASSIMO, attesa));
  }
  return TTL_MASSIMO;
}
