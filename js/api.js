// Il Worker personale su Cloudflare fa da tramite verso football-data.org: la
// chiave API resta nascosta lì (mai visibile nel codice del sito), e risolve
// anche il problema del vecchio proxy pubblico (corsproxy.io) inaffidabile.
const HV_API_BASE = "https://hertavernello-api-proxy.emmanueletufano.workers.dev";

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
  const res = await fetch(HV_API_BASE + path);
  if (!res.ok) {
    let dettaglio = "";
    try {
      const corpo = await res.json();
      dettaglio = corpo.message || "";
    } catch (e) {}
    throw new Error(`${res.status}${dettaglio ? " — " + dettaglio : ""}`);
  }
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

// Tutte le partite della stagione (tutte le giornate, con risultato se giocate).
// Un'unica chiamata invece di una per giornata — pensata per essere messa in
// cache a lungo, dato che le partite concluse non cambiano più risultato.
// Partite dei prossimi giorni CON orario incluso (stesso endpoint filtrato per
// data già usato da hv_getPartite, che a differenza dell'elenco stagionale
// completo include sempre utcDate). Usata per l'orario preciso di ogni partita,
// mentre l'elenco stagionale resta usato solo per capire quale giornata è quella attuale.
async function hv_getPartiteConOrario(apiKey, squadreRef) {
  const oggi = new Date();
  const indietro3gg = new Date(oggi.getTime() - 3 * 86400000);
  const avanti8gg = new Date(oggi.getTime() + 8 * 86400000);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const data = await hv_fetchAPI(`/competitions/SA/matches?dateFrom=${fmt(indietro3gg)}&dateTo=${fmt(avanti8gg)}`, apiKey);

  return data.matches.map((m) => ({
    matchday: m.matchday,
    status: m.status,
    data: m.utcDate,
    casaCodice: hv_trovaCodice(m.homeTeam.shortName || m.homeTeam.name, squadreRef),
    trasfertaCodice: hv_trovaCodice(m.awayTeam.shortName || m.awayTeam.name, squadreRef),
    casaNome: m.homeTeam.shortName || m.homeTeam.name,
    trasfertaNome: m.awayTeam.shortName || m.awayTeam.name,
  }));
}

async function hv_getTutteLePartiteStagione(apiKey, squadreRef) {
  const data = await hv_fetchAPI("/competitions/SA/matches", apiKey);
  return data.matches.map((m) => ({
    matchday: m.matchday,
    status: m.status,
    data: m.utcDate,
    casaCodice: hv_trovaCodice(m.homeTeam.shortName || m.homeTeam.name, squadreRef),
    trasfertaCodice: hv_trovaCodice(m.awayTeam.shortName || m.awayTeam.name, squadreRef),
    casaNome: m.homeTeam.shortName || m.homeTeam.name,
    trasfertaNome: m.awayTeam.shortName || m.awayTeam.name,
    golCasa: m.score && m.score.fullTime ? m.score.fullTime.home : null,
    golTrasferta: m.score && m.score.fullTime ? m.score.fullTime.away : null,
  }));
}

function hv_fasciaDaPosizione(posizione, fasce) {
  const f = fasce.find((f) => posizione >= f.posMin && posizione <= f.posMax);
  return f ? f.id : null;
}

// Numero di giornata reale di Serie A attualmente in corso/prossima
async function hv_getGiornataCorrente(apiKey) {
  const data = await hv_fetchAPI("/competitions/SA", apiKey);
  return data.currentSeason ? data.currentSeason.currentMatchday : null;
}

// Classifica completa (posizione, nome, punti, ecc.) per la tabella in Home
async function hv_getClassificaCompleta(apiKey, squadreRef) {
  const data = await hv_fetchAPI("/competitions/SA/standings", apiKey);
  const tabella = data.standings.find((s) => s.type === "TOTAL") || data.standings[0];
  return tabella.table.map((riga) => ({
    posizione: riga.position,
    codice: hv_trovaCodice(riga.team.shortName || riga.team.name, squadreRef),
    nome: riga.team.shortName || riga.team.name,
    punti: riga.points,
    giocate: riga.playedGames,
  }));
}

// Classifica marcatori (gratis: solo i migliori del campionato, non tutti i giocatori)
async function hv_getTopScorers(apiKey, squadreRef) {
  const data = await hv_fetchAPI("/competitions/SA/scorers", apiKey);
  return (data.scorers || []).map((s) => ({
    nome: s.player.name,
    squadraCodice: hv_trovaCodice(s.team.shortName || s.team.name, squadreRef),
    squadraNome: s.team.shortName || s.team.name,
    gol: s.goals || 0,
    assist: s.assists || 0,
  }));
}
