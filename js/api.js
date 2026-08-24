const HV_API_BASE = "https://api.football-data.org/v4";

function hv_normalizza(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|ac|ssc|as|us|cfc|calcio|football club|1913|1909|1907)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function hv_caricaSquadreRef() {
  const res = await fetch("data/squadre-serie-a.json");
  return res.json();
}

// Trova il codice (es. "NAP") a partire da un nome grezzo, sia che arrivi
// dal CSV di fantacalcio.it sia che arrivi dai nomi squadra di football-data.org.
function hv_trovaCodice(nomeGrezzo, squadreRef) {
  if (!nomeGrezzo) return null;
  const grezzo = nomeGrezzo.trim();

  const perCodice = squadreRef.squadre.find((s) => s.codice.toLowerCase() === grezzo.toLowerCase());
  if (perCodice) return perCodice.codice;

  const norm = hv_normalizza(grezzo);
  const match = squadreRef.squadre.find((s) => {
    const n = hv_normalizza(s.nome);
    return norm === n || (norm.length > 2 && (norm.includes(n) || n.includes(norm)));
  });
  return match ? match.codice : null;
}

async function hv_fetchAPI(path, apiKey) {
  const res = await fetch(HV_API_BASE + path, { headers: { "X-Auth-Token": apiKey } });
  if (!res.ok) throw new Error("Risposta API non valida (" + res.status + ")");
  return res.json();
}

// { NAP: 1, JUV: 4, ... } posizione attuale in classifica
async function hv_getClassificaReale(apiKey, squadreRef) {
  const data = await hv_fetchAPI("/competitions/SA/standings", apiKey);
  const tabella = data.standings.find((s) => s.type === "TOTAL") || data.standings[0];
  const risultato = {};
  tabella.table.forEach((riga) => {
    const codice = hv_trovaCodice(riga.team.shortName || riga.team.name, squadreRef);
    if (codice) risultato[codice] = riga.position;
  });
  return risultato;
}

// { live: [...], prossimoTurno: [...] }
async function hv_getPartite(apiKey, squadreRef) {
  const oggi = new Date();
  const tra8gg = new Date(oggi.getTime() + 8 * 86400000);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const data = await hv_fetchAPI(`/competitions/SA/matches?dateFrom=${fmt(oggi)}&dateTo=${fmt(tra8gg)}`, apiKey);

  const partite = data.matches.map((m) => ({
    live: m.status === "IN_PLAY" || m.status === "PAUSED",
    matchday: m.matchday,
    data: m.utcDate,
    casaCodice: hv_trovaCodice(m.homeTeam.shortName || m.homeTeam.name, squadreRef),
    trasfertaCodice: hv_trovaCodice(m.awayTeam.shortName || m.awayTeam.name, squadreRef),
    casaNome: m.homeTeam.shortName || m.homeTeam.name,
    trasfertaNome: m.awayTeam.shortName || m.awayTeam.name,
  }));

  const live = partite.filter((p) => p.live);
  const future = partite.filter((p) => !p.live && p.matchday && p.data > new Date().toISOString());
  let prossimoTurno = [];
  if (future.length > 0) {
    const minGiornata = Math.min(...future.map((p) => p.matchday));
    prossimoTurno = future.filter((p) => p.matchday === minGiornata);
  }

  return { live, prossimoTurno };
}

// Data una posizione reale (1-20), restituisce l'id fascia corrispondente (1-10)
function hv_fasciaDaPosizione(posizione, fasce) {
  const f = fasce.find((f) => posizione >= f.posMin && posizione <= f.posMax);
  return f ? f.id : null;
}
