// Deve essere il PRIMO script caricato in ogni pagina, prima di auth.js:
// controlla se il sito è stato aggiornato (o se l'admin ha premuto
// "Disconnetti tutti" in Admin) confrontando data/versione.json — scaricato
// sempre "fresco", mai dalla cache del browser — con l'ultima versione vista
// su questo dispositivo. Se è cambiata: pulisce la sessione (quindi fa
// logout, voluto) e ricarica la pagina, così tutti i file .js/.css vengono
// ripescati veri e non dalla cache — niente più Ctrl+F5 a mano.
//
// Il controllo è anche periodico (ogni 2 minuti) mentre la pagina resta
// aperta, così anche chi ha già una scheda aperta viene aggiornato/sloggato
// entro un paio di minuti da "Disconnetti tutti", non solo chi ricarica.

const HV_CHIAVE_VERSIONE_VISTA = "hv_versione_vista";

function hv_pulisciCacheELocale() {
  sessionStorage.clear();
  Object.keys(localStorage).forEach((chiave) => {
    if (chiave.indexOf("hv_cache_") === 0) localStorage.removeItem(chiave);
  });
}

async function hv_controllaVersione(alCambioRicarica) {
  try {
    const res = await fetch("data/versione.json?_=" + Date.now(), { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const vistaOra = localStorage.getItem(HV_CHIAVE_VERSIONE_VISTA);

    if (!vistaOra) {
      // Prima visita su questo dispositivo: memorizzo e basta, niente da pulire.
      localStorage.setItem(HV_CHIAVE_VERSIONE_VISTA, data.v);
      return;
    }

    if (vistaOra !== data.v && alCambioRicarica) {
      hv_pulisciCacheELocale();
      localStorage.setItem(HV_CHIAVE_VERSIONE_VISTA, data.v);
      location.href = location.pathname + "?_agg=" + Date.now();
    }
  } catch (err) {
    // Nessuna connessione o file non raggiungibile: non blocco la pagina,
    // riproverà al prossimo caricamento o al prossimo controllo periodico.
  }
}

hv_controllaVersione(true);
setInterval(() => hv_controllaVersione(true), 2 * 60 * 1000);

// Usata dal tasto "Pulisci cache" presente in ogni pagina: uguale al
// controllo automatico, ma immediato e senza aspettare che la versione sia
// davvero cambiata — utile quando non si vuole aspettare.
function hv_pulisciCacheManuale() {
  hv_pulisciCacheELocale();
  localStorage.removeItem(HV_CHIAVE_VERSIONE_VISTA);
  location.href = location.pathname + "?_agg=" + Date.now();
}

document.addEventListener("DOMContentLoaded", () => {
  const link = document.getElementById("hv-pulisci-cache");
  if (link) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      hv_pulisciCacheManuale();
    });
  }
});
