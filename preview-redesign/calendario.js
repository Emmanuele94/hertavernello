const ROOT = "../";
const API_BASE = "https://hertavernello-api-proxy.emmanueletufano.workers.dev";
const $ = id => document.getElementById(id);

const state = {
  config: null,
  calendario: null,
  rose: null,
  serieARef: null,
  matches: [],
  activeRound: null,
  teamFilter: "all",
  rosterIsTest: true,
};

async function getJson(path) {
  const res = await fetch(ROOT + path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

function esc(v = "") {
  return String(v).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

function normalizeName(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|ac|ssc|as|us|cfc|calcio|football club|1913|1909|1907)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function findClubCode(raw) {
  if (!raw) return null;
  const value = raw.trim();
  const byCode = state.serieARef?.squadre?.find(s => s.codice.toLowerCase() === value.toLowerCase());
  if (byCode) return byCode.codice;
  const norm = normalizeName(value);
  const found = state.serieARef?.squadre?.find(s => {
    const n = normalizeName(s.nome);
    return norm === n || (norm.length > 2 && (norm.includes(n) || n.includes(norm)));
  });
  return found?.codice || null;
}

function teamById(id) {
  return state.config?.squadre?.find(t => t.id === id) || null;
}

function clubLogo(code, name, cls = "real-club-logo") {
  if (code) return `<img class="${cls}" src="${ROOT}assets/loghi/${code}.png" alt="${esc(name || code)}">`;
  return `<span class="club-logo-fallback ${cls}">${esc((name || "?").slice(0, 1).toUpperCase())}</span>`;
}

function calculateActiveRound(matches, now = Date.now()) {
  const withRound = matches.filter(m => m.matchday);
  if (!withRound.length) return null;
  const firstKickoff = {};
  withRound.forEach(m => {
    const t = new Date(m.data).getTime();
    if (!(m.matchday in firstKickoff) || t < firstKickoff[m.matchday]) firstKickoff[m.matchday] = t;
  });
  let active = null;
  Object.entries(firstKickoff).forEach(([round, start]) => {
    if (start <= now) {
      const n = Number(round);
      if (active === null || n > active) active = n;
    }
  });
  if (active === null) active = Math.min(...Object.keys(firstKickoff).map(Number));
  return active;
}

async function loadSerieAMatches() {
  const now = new Date();
  const from = new Date(now.getTime() - 5 * 86400000);
  const to = new Date(now.getTime() + 9 * 86400000);
  const fmt = d => d.toISOString().slice(0, 10);
  const res = await fetch(`${API_BASE}/competitions/SA/matches?dateFrom=${fmt(from)}&dateTo=${fmt(to)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`football-data proxy: ${res.status}`);
  const data = await res.json();
  const all = (data.matches || []).map(m => ({
    id: m.id,
    matchday: m.matchday,
    status: m.status,
    live: m.status === "IN_PLAY" || m.status === "PAUSED",
    finished: m.status === "FINISHED",
    data: m.utcDate,
    minute: m.minute ?? null,
    homeGoals: m.score?.fullTime?.home ?? null,
    awayGoals: m.score?.fullTime?.away ?? null,
    homeCode: findClubCode(m.homeTeam?.shortName || m.homeTeam?.name),
    awayCode: findClubCode(m.awayTeam?.shortName || m.awayTeam?.name),
    homeName: m.homeTeam?.shortName || m.homeTeam?.name || "Casa",
    awayName: m.awayTeam?.shortName || m.awayTeam?.name || "Trasferta",
  }));
  const round = calculateActiveRound(all);
  return {
    round,
    matches: all.filter(m => m.matchday === round).sort((a, b) => new Date(a.data) - new Date(b.data)),
  };
}

function relevantPlayers(teamId, match) {
  if (state.rosterIsTest) return [];
  const roster = (state.rose?.rose || []).find(r => r.squadraId === teamId);
  if (!roster) return [];
  return (roster.giocatori || [])
    .map(player => ({
      nome: player.nome,
      codice: findClubCode(player.squadraReale),
    }))
    .filter(player => player.codice === match.homeCode || player.codice === match.awayCode);
}

function fantasyDuelsForMatch(match) {
  if (state.rosterIsTest || !match.matchday) return [];
  const round = (state.calendario?.giornate || []).find(g => Number(g.giornata) === Number(match.matchday));
  if (!round) return [];

  const duels = [];
  (round.incontri || []).forEach(pair => {
    if (!Array.isArray(pair) || pair.length < 2) return;
    const teamA = teamById(pair[0]);
    const teamB = teamById(pair[1]);
    if (!teamA || !teamB) return;
    if (state.teamFilter !== "all" && teamA.id !== state.teamFilter && teamB.id !== state.teamFilter) return;

    const playersA = relevantPlayers(teamA.id, match);
    const playersB = relevantPlayers(teamB.id, match);
    if (!playersA.length && !playersB.length) return;
    duels.push({ teamA, teamB, playersA, playersB });
  });
  return duels;
}

function formatKickoff(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d).replace(",", " ·");
}

function matchState(match) {
  if (match.live) return `<span class="real-match-state live"><i data-lucide="radio"></i> LIVE${match.minute ? ` ${match.minute}'` : ""}</span>`;
  if (match.finished) return `<span class="real-match-state finished"><i data-lucide="check"></i> FINALE</span>`;
  return `<span class="real-match-state scheduled"><i data-lucide="clock-3"></i> ${esc(formatKickoff(match.data))}</span>`;
}

function scoreHtml(match) {
  if (match.homeGoals == null || match.awayGoals == null) return `<span class="real-vs">VS</span>`;
  return `<span class="real-score"><b>${match.homeGoals}</b><em>—</em><b>${match.awayGoals}</b></span>`;
}

function playerList(players) {
  if (!players.length) return `<div class="no-owned-player">Nessun giocatore coinvolto</div>`;
  return `<div class="owned-player-list">${players.map(player => `
    <div class="owned-player">
      ${clubLogo(player.codice, player.nome, "owned-club-logo")}
      <strong>${esc(player.nome)}</strong>
    </div>`).join("")}</div>`;
}

function duelHtml(duel) {
  return `
    <article class="fantasy-duel">
      <div class="fantasy-duel-head">
        <div><small>SCONTRO HERTAVERNELLO</small><strong>${esc(duel.teamA.nomeFantasquadra)} <span>vs</span> ${esc(duel.teamB.nomeFantasquadra)}</strong></div>
        <span class="duel-impact">${duel.playersA.length + duel.playersB.length} ${duel.playersA.length + duel.playersB.length === 1 ? "GIOCATORE" : "GIOCATORI"}</span>
      </div>
      <div class="fantasy-duel-body">
        <div class="fantasy-owner-side">
          <div class="fantasy-owner"><small>${esc(duel.teamA.nomeFantasquadra)}</small><strong>${esc(duel.teamA.nomeReale)}</strong></div>
          ${playerList(duel.playersA)}
        </div>
        <div class="duel-vs-mark">VS</div>
        <div class="fantasy-owner-side right">
          <div class="fantasy-owner"><small>${esc(duel.teamB.nomeFantasquadra)}</small><strong>${esc(duel.teamB.nomeReale)}</strong></div>
          ${playerList(duel.playersB)}
        </div>
      </div>
    </article>`;
}

function fantasyEmptyForMatch(match) {
  if (state.rosterIsTest) {
    return `<div class="crossover-inner-empty"><i data-lucide="database-zap"></i><div><strong>Incrocio rose sospeso nella preview</strong><p>Il file rose.json attuale è dichiarato come dataset casuale di test. La partita reale resta visibile, ma non attribuisco quei giocatori ai fantallenatori come se fossero veri.</p></div></div>`;
  }

  const round = (state.calendario?.giornate || []).find(g => Number(g.giornata) === Number(match.matchday));
  if (!round) {
    return `<div class="crossover-inner-empty"><i data-lucide="git-compare-arrows"></i><div><strong>Scontri Hertavernello non ancora importati</strong><p>Per la giornata ${esc(match.matchday || "—")} manca l'abbinamento tra fantallenatori. Appena sarà disponibile, qui comparirà automaticamente chi possiede i giocatori di questa partita.</p></div></div>`;
  }

  if (state.teamFilter !== "all") {
    return `<div class="crossover-inner-empty"><i data-lucide="search-x"></i><div><strong>Nessun giocatore coinvolto per questo fantallenatore</strong><p>In questa partita reale la rosa selezionata non genera un incrocio da mostrare.</p></div></div>`;
  }

  return `<div class="crossover-inner-empty"><i data-lucide="minus"></i><div><strong>Nessun impatto su uno scontro di lega</strong><p>Nelle coppie Hertavernello di questa giornata non risultano giocatori delle due squadre reali.</p></div></div>`;
}

function realMatchHtml(match) {
  const duels = fantasyDuelsForMatch(match);
  return `
    <article class="real-match-card">
      <header class="real-match-head">
        <span class="real-round">SERIE A · GIORNATA ${esc(match.matchday || "—")}</span>
        ${matchState(match)}
      </header>
      <div class="real-match-main">
        <div class="real-team home">
          ${clubLogo(match.homeCode, match.homeName)}
          <strong>${esc(match.homeName)}</strong>
        </div>
        <div class="real-match-center">
          ${scoreHtml(match)}
          <small>${match.live || match.finished ? esc(formatKickoff(match.data)) : "PARTITA REALE"}</small>
        </div>
        <div class="real-team away">
          ${clubLogo(match.awayCode, match.awayName)}
          <strong>${esc(match.awayName)}</strong>
        </div>
      </div>
      <div class="fantasy-impact-zone">
        <div class="impact-zone-title"><i data-lucide="git-compare-arrows"></i><span>Impatto sugli scontri Hertavernello</span><b>${duels.length}</b></div>
        ${duels.length ? `<div class="fantasy-duels">${duels.map(duelHtml).join("")}</div>` : fantasyEmptyForMatch(match)}
      </div>
    </article>`;
}

function updateWarning() {
  const warning = $("data-warning");
  const messages = [];
  if (state.rosterIsTest) messages.push("Le rose presenti oggi sono marcate come dati casuali di test, quindi la preview non assegna quei giocatori ai fantallenatori.");
  if (!(state.calendario?.giornate || []).length) messages.push("Gli scontri della fantalega non sono ancora caricati: servono soltanto per sapere quali due fantallenatori confrontare nella stessa giornata di Serie A.");

  if (!messages.length) {
    warning.classList.add("hidden");
    return;
  }
  $("data-warning-title").textContent = "Incrocio fantasy parzialmente in attesa dei dati reali";
  $("data-warning-copy").textContent = messages.join(" ");
  warning.classList.remove("hidden");
}

function renderMatches() {
  const wrap = $("real-matches");
  const visible = state.matches;
  const duelCount = visible.reduce((sum, match) => sum + fantasyDuelsForMatch(match).length, 0);
  $("stat-round").textContent = state.activeRound ? `G${state.activeRound}` : "—";
  $("stat-real-matches").textContent = String(visible.length);
  $("stat-fantasy-links").textContent = String(duelCount);
  $("toolbar-title").textContent = state.activeRound ? `Giornata ${state.activeRound} · ${visible.length} partite reali` : "Nessuna giornata Serie A trovata";

  if (!visible.length) {
    wrap.innerHTML = `<div class="match-center-empty"><span><i data-lucide="calendar-x"></i></span><h2>Nessuna partita di Serie A nella finestra attuale.</h2><p>La funzione non genera match di esempio. Verranno mostrati appena football-data.org restituisce una giornata attiva.</p></div>`;
    refreshIcons();
    return;
  }

  wrap.innerHTML = visible.map(realMatchHtml).join("");
  refreshIcons();
}

function populateTeamFilter() {
  const select = $("team-filter");
  select.innerHTML = `<option value="all">Tutti i fantallenatori</option>` + (state.config?.squadre || []).map(team =>
    `<option value="${team.id}">${esc(team.nomeFantasquadra)} · ${esc(team.nomeReale)}</option>`
  ).join("");
  select.value = state.teamFilter;
  select.addEventListener("change", () => {
    state.teamFilter = select.value;
    renderMatches();
  });
}

function setupPending() {
  const toast = $("preview-toast");
  document.querySelectorAll(".preview-pending").forEach(el => el.addEventListener("click", e => {
    e.preventDefault();
    toast.classList.add("show");
    clearTimeout(window.__crossoverToast);
    window.__crossoverToast = setTimeout(() => toast.classList.remove("show"), 2200);
  }));
}

async function init() {
  try {
    const [config, calendario, rose, serieARef] = await Promise.all([
      getJson("data/config.json"),
      getJson("data/calendario.json"),
      getJson("data/rose.json"),
      getJson("data/squadre-serie-a.json"),
    ]);
    Object.assign(state, { config, calendario, rose, serieARef });
    state.rosterIsTest = /test casuali/i.test(rose?._leggimi || "");
    $("brand-season").textContent = `Stagione ${config.lega.stagione}`;
    populateTeamFilter();
    updateWarning();

    const serieA = await loadSerieAMatches();
    state.activeRound = serieA.round;
    state.matches = serieA.matches;
    renderMatches();
  } catch (err) {
    console.error(err);
    $("toolbar-title").textContent = "Impossibile leggere la giornata Serie A";
    $("real-matches").innerHTML = `<div class="match-center-empty"><span><i data-lucide="cloud-off"></i></span><h2>Match center non raggiungibile.</h2><p>${esc(err.message)}. Non vengono mostrati dati di fallback inventati.</p></div>`;
  }

  setupPending();
  refreshIcons();
}

init();
