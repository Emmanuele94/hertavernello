// ===== Database giocatori (foto + nazionalità) — data/giocatori.json =====
// Incrocia due fonti diverse (rose Fantacalcio.it / API football-data.org),
// quindi il match è per cognome + squadra reale, non per stringa esatta.

let hv_giocatoriDb = null;

async function hv_caricaGiocatoriDb() {
  if (hv_giocatoriDb) return hv_giocatoriDb;
  const res = await fetch("data/giocatori.json");
  const data = await res.json();
  hv_giocatoriDb = data.giocatori;
  return hv_giocatoriDb;
}

function hv_normalizzaNomeGiocatore(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim();
}

// Toglie l'eventuale suffisso di disambiguazione tipo "Jo." da "Martinez Jo."
function hv_basNomeDb(nomeDb) {
  const parti = nomeDb.split(" ");
  if (parti.length > 1 && /\.$/.test(parti[parti.length - 1])) {
    parti.pop();
  }
  return parti.join(" ");
}

// nomeQuery: sia formato "Cognome" (rose) sia "Nome Cognome" (API marcatori).
// squadraCodice: codice a 3 lettere già usato nel sito (INT, JUV, ecc.).
function hv_trovaGiocatore(nomeQuery, squadraCodice, db) {
  if (!nomeQuery || !db) return null;
  const candidati = squadraCodice ? db.filter((g) => g.squadraCodice === squadraCodice) : db;
  const normQuery = hv_normalizzaNomeGiocatore(nomeQuery);
  if (!normQuery) return null;
  const parole = normQuery.split(/\s+/);
  const ultimaParola = parole[parole.length - 1];
  const paroleIniziali = parole.slice(0, -1); // es. "lautaro" da "lautaro martinez"

  // Tutti i candidati il cui cognome-base (senza il suffisso disambiguante,
  // es. "Jo." in "Martinez Jo.") corrisponde alla query.
  const corrispondenti = candidati.filter((g) => {
    const normDb = hv_normalizzaNomeGiocatore(hv_basNomeDb(g.nome));
    return normDb === normQuery || normDb === ultimaParola || normDb.startsWith(ultimaParola + " ") || ultimaParola.startsWith(normDb);
  });

  if (corrispondenti.length <= 1) return corrispondenti[0] || null;

  // Più di un candidato con lo stesso cognome nella stessa squadra (es. due
  // "Martinez" all'Inter): uso l'eventuale suffisso disambiguante nel db
  // ("Jo." / "L.") confrontato col nome proprio della query ("Josep"/"Lautaro").
  if (paroleIniziali.length > 0) {
    const scelto = corrispondenti.find((g) => {
      const parti = g.nome.split(" ");
      const suffisso = parti.length > 1 ? parti[parti.length - 1].replace(/\.$/, "") : "";
      if (!suffisso) return false;
      const suffissoNorm = hv_normalizzaNomeGiocatore(suffisso);
      return paroleIniziali.some((p) => p.startsWith(suffissoNorm) || suffissoNorm.startsWith(p));
    });
    if (scelto) return scelto;
  }
  return corrispondenti[0];
}

// Iniziali per l'avatar segnaposto quando manca la foto (mai un'immagine rotta).
// "Svilar" (formato rosa, solo cognome) -> "SV". "Dusan Vlahovic" (formato API,
// nome e cognome) -> "DV", non le prime due lettere del nome.
function hv_inizialiGiocatore(nome) {
  const base = hv_basNomeDb(nome || "").trim();
  const parole = base.split(/\s+/).filter(Boolean);
  if (parole.length >= 2) {
    return (parole[0][0] + parole[parole.length - 1][0]).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

let hv_nazioniDb = null;

async function hv_caricaNazioni() {
  if (hv_nazioniDb) return hv_nazioniDb;
  const res = await fetch("data/nazioni.json");
  const data = await res.json();
  hv_nazioniDb = data.nazioni;
  return hv_nazioniDb;
}

// Bandiera con tooltip: l'hover funziona da solo via CSS (:hover), qui gestiamo
// solo il click, necessario su smartphone dove l'hover non esiste. Un click
// altrove chiude eventuali tooltip aperti.
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const bandiera = e.target.closest(".bandiera-wrap");
    document.querySelectorAll(".bandiera-wrap.tooltip-attivo").forEach((el) => {
      if (el !== bandiera) el.classList.remove("tooltip-attivo");
    });
    if (bandiera) {
      e.preventDefault();
      bandiera.classList.toggle("tooltip-attivo");
    }
  });
}

if (typeof module !== "undefined") {
  module.exports = { hv_normalizzaNomeGiocatore, hv_basNomeDb, hv_trovaGiocatore, hv_inizialiGiocatore };
}
