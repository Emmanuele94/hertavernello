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
function hv_trovaGiocatore(nomeQuery, squadraCodice, db, fantacalcioId) {
  if (!db) return null;

  // L'ID Fantacalcio è stabile anche quando un calciatore cambia squadra o il
  // nome viene scritto in modo leggermente diverso. Le rose nuove lo salvano
  // direttamente dal CSV e data/giocatori.json lo usa come chiave primaria.
  if (fantacalcioId !== undefined && fantacalcioId !== null && String(fantacalcioId).trim()) {
    const id = String(fantacalcioId).trim();
    const perId = db.find((g) => String(g.fantacalcioId || "").trim() === id);
    if (perId) return perId;
  }

  if (!nomeQuery) return null;
  const normQuery = hv_normalizzaNomeGiocatore(nomeQuery);
  if (!normQuery) return null;
  const parole = normQuery.split(/\s+/);
  const ultimaParola = parole[parole.length - 1];
  const paroleIniziali = parole.slice(0, -1);

  const trovaNei = (candidati) => {
    const corrispondenti = candidati.filter((g) => {
      const normDb = hv_normalizzaNomeGiocatore(hv_basNomeDb(g.nome));
      return normDb === normQuery || normDb === ultimaParola || normDb.startsWith(ultimaParola + " ") || ultimaParola.startsWith(normDb);
    });

    if (corrispondenti.length <= 1) return corrispondenti[0] || null;

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
  };

  // Prima privilegiamo la squadra corrente. Se il database giocatori non è
  // ancora stato aggiornato dopo un trasferimento, riproviamo globalmente: una
  // foto valida non deve sparire soltanto perché nel DB è rimasta la vecchia squadra.
  if (squadraCodice) {
    const nellaSquadra = trovaNei(db.filter((g) => g.squadraCodice === squadraCodice));
    if (nellaSquadra) return nellaSquadra;
  }
  return trovaNei(db);
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
