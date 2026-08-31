const ROOT = "../";
const $ = id => document.getElementById(id);

const state = {
  config: null,
  calendario: null,
  logos: null,
  activeRound: null,
  teamFilter: "all",
};

async function getJson(path) {
  const res = await fetch(ROOT + path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

function esc(v = "") {
  return String(v).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "HV";
}

function logoMeta(teamId) {
  return (state.logos?.loghi || []).find(x => x.squadraId === teamId) || null;
}

function teamById(id) {
  return state.config?.squadre?.find(t => t.id === id) || null;
}

function teamLogo(team) {
  const meta = logoMeta(team.id);
  if (meta?.immagine) {
    return `<img class="calendar-team-logo" src="${ROOT}assets/stemmi/${meta.immagine}" alt="Logo ${esc(team.nomeFantasquadra)}">`;
  }
  return `<span class="calendar-team-fallback">${esc(initials(team.nomeFantasquadra))}</span>`;
}

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

function getRounds() {
  return Array.isArray(state.calendario?.giornate) ? [...state.calendario.giornate] : [];
}

function countMatches(rounds) {
  return rounds.reduce((total, round) => total + (round.incontri || []).filter(pair => Array.isArray(pair) && pair.length >= 2).length, 0);
}

function populateStats() {
  const rounds = getRounds();
  $("stat-teams").textContent = String(state.config?.squadre?.length || 0);
  $("stat-rounds").textContent = String(rounds.length);
  $("stat-matches").textContent = String(countMatches(rounds));
  $("brand-season").textContent = `Stagione ${state.config.lega.stagione}`;
}

function populateTeamFilter() {
  const select = $("team-filter");
  select.innerHTML = `<option value="all">Tutte le fantasquadre</option>` + state.config.squadre.map(team =>
    `<option value="${team.id}">${esc(team.nomeFantasquadra)} · ${esc(team.nomeReale)}</option>`
  ).join("");

  select.value = state.teamFilter;
  select.addEventListener("change", () => {
    state.teamFilter = select.value;
    renderActiveRound();
  });
}

function renderRoundSelector() {
  const rounds = getRounds();
  const selector = $("round-selector");
  if (!rounds.length) {
    selector.innerHTML = "";
    $("round-selector-label").textContent = "Nessuna giornata disponibile";
    $("round-prev").disabled = true;
    $("round-next").disabled = true;
    return;
  }

  if (!rounds.some(r => r.giornata === state.activeRound)) state.activeRound = rounds[0].giornata;

  selector.innerHTML = rounds.map(round => `
    <button class="round-chip${round.giornata === state.activeRound ? ' active' : ''}" type="button" data-round="${round.giornata}">
      GIORNATA ${esc(round.giornata)}
    </button>`).join("");

  selector.querySelectorAll(".round-chip").forEach(btn => btn.addEventListener("click", () => {
    state.activeRound = Number(btn.dataset.round);
    renderRoundSelector();
    renderActiveRound();
  }));

  const idx = rounds.findIndex(r => r.giornata === state.activeRound);
  $("round-prev").disabled = idx <= 0;
  $("round-next").disabled = idx < 0 || idx >= rounds.length - 1;
  $("round-selector-label").textContent = `Giornata ${state.activeRound}`;
}

function matchRow(pair, roundNumber) {
  if (!Array.isArray(pair) || !pair.length) return "";

  if (pair.length === 1) {
    const resting = teamById(pair[0]);
    if (!resting) return "";
    if (state.teamFilter !== "all" && state.teamFilter !== resting.id) return "";
    return `<div class="rest-card"><i data-lucide="pause-circle"></i><div><strong>${esc(resting.nomeFantasquadra)} riposa</strong><small>${esc(resting.nomeReale)} · Giornata ${esc(roundNumber)}</small></div></div>`;
  }

  const home = teamById(pair[0]);
  const away = teamById(pair[1]);
  if (!home || !away) return "";
  if (state.teamFilter !== "all" && state.teamFilter !== home.id && state.teamFilter !== away.id) return "";

  return `
    <article class="calendar-match">
      <div class="calendar-team">
        ${teamLogo(home)}
        <div class="calendar-team-copy"><strong>${esc(home.nomeFantasquadra)}</strong><small>${esc(home.nomeReale)}</small></div>
      </div>
      <div class="match-center"><span class="match-vs">VS</span><small>G${esc(roundNumber)}</small></div>
      <div class="calendar-team away">
        ${teamLogo(away)}
        <div class="calendar-team-copy"><strong>${esc(away.nomeFantasquadra)}</strong><small>${esc(away.nomeReale)}</small></div>
      </div>
    </article>`;
}

function emptyRoundFilter(roundNumber) {
  const team = teamById(state.teamFilter);
  return `<div class="calendar-empty" style="min-height:300px;grid-template-columns:180px 1fr">
    <div class="empty-calendar-art" style="height:180px"><i data-lucide="search-x"></i></div>
    <div class="calendar-empty-copy"><span class="empty-status">FILTRO SQUADRA</span><h2>Nessun incontro trovato.</h2><p>${team ? `${esc(team.nomeFantasquadra)} non compare negli incontri registrati per la giornata ${esc(roundNumber)}.` : `Nessun incontro valido disponibile per questa giornata.`}</p></div>
  </div>`;
}

function renderActiveRound() {
  const rounds = getRounds();
  const content = $("calendar-content");

  if (!rounds.length) {
    $("toolbar-title").textContent = "In attesa del calendario";
    return;
  }

  const round = rounds.find(r => r.giornata === state.activeRound) || rounds[0];
  const matches = (round.incontri || []).map(pair => matchRow(pair, round.giornata)).filter(Boolean);
  const totalVisible = matches.length;
  const filterTeam = teamById(state.teamFilter);

  $("toolbar-title").textContent = filterTeam
    ? `Giornata ${round.giornata} · ${filterTeam.nomeFantasquadra}`
    : `Giornata ${round.giornata} · Tutte le sfide`;

  if (!totalVisible) {
    content.innerHTML = emptyRoundFilter(round.giornata);
    refreshIcons();
    return;
  }

  content.innerHTML = `
    <section class="round-panel">
      <header class="round-panel-head">
        <div class="round-title-group"><small>CHI GIOCA CONTRO CHI</small><h2>Giornata ${esc(round.giornata)}</h2></div>
        <span class="round-count">${totalVisible} ${totalVisible === 1 ? 'VOCE' : 'VOCI'}</span>
      </header>
      <div class="matches-grid">${matches.join("")}</div>
    </section>`;
  refreshIcons();
}

function setupRoundArrows() {
  const move = delta => {
    const rounds = getRounds();
    const idx = rounds.findIndex(r => r.giornata === state.activeRound);
    const next = rounds[idx + delta];
    if (!next) return;
    state.activeRound = next.giornata;
    renderRoundSelector();
    renderActiveRound();
    document.querySelector(`.round-chip[data-round="${state.activeRound}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };
  $("round-prev").addEventListener("click", () => move(-1));
  $("round-next").addEventListener("click", () => move(1));
}

function setupPending() {
  const toast = $("preview-toast");
  document.querySelectorAll(".preview-pending").forEach(el => el.addEventListener("click", e => {
    e.preventDefault();
    toast.classList.add("show");
    clearTimeout(window.__calendarToast);
    window.__calendarToast = setTimeout(() => toast.classList.remove("show"), 2200);
  }));
}

async function init() {
  try {
    const [config, calendario, logos] = await Promise.all([
      getJson("data/config.json"),
      getJson("data/calendario.json"),
      getJson("data/loghi-fantasquadre.json")
    ]);
    Object.assign(state, { config, calendario, logos });
    const rounds = getRounds();
    state.activeRound = rounds[0]?.giornata ?? null;
    populateStats();
    populateTeamFilter();
    renderRoundSelector();
    renderActiveRound();
  } catch (err) {
    console.error(err);
    $("toolbar-title").textContent = "Errore nel caricamento del calendario";
  }

  setupRoundArrows();
  setupPending();
  refreshIcons();
}

init();
