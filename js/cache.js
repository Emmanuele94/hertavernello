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
