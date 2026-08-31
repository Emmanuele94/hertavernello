const ROOT = "../";
const $ = (id) => document.getElementById(id);

const state = {
  config: null,
  logos: null,
  pagelle: null,
  previsioni: null,
  rose: null,
  currentTeamId: null,
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

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase() || "HV";
}

function logoMeta(teamId) {
  return (state.logos?.loghi || []).find(x => x.squadraId === teamId) || null;
}

function teamLogo(team, cls = "team-switch-logo") {
  const logo = logoMeta(team.id);
  if (logo?.immagine) return `<img class="${cls}" src="${ROOT}assets/stemmi/${logo.immagine}" alt="Logo ${esc(team.nomeFantasquadra)}">`;
  return `<span class="${cls === 'team-switch-logo' ? 'team-switch-fallback' : 'team-logo-big-fallback'}">${esc(initials(team.nomeFantasquadra))}</span>`;
}

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

function emptyBlock(icon, title, copy) {
  return `<div class="premium-empty"><span><i data-lucide="${icon}"></i></span><strong>${esc(title)}</strong><p>${esc(copy)}</p></div>`;
}

function renderSwitcher() {
  $("team-switcher").innerHTML = state.config.squadre.map(team => `
    <button type="button" class="team-switch${team.id === state.currentTeamId ? ' active' : ''}" data-team="${team.id}">
      ${teamLogo(team)}
      <span><strong>${esc(team.nomeFantasquadra)}</strong><small>${esc(team.nomeReale)}</small></span>
    </button>`).join("");

  document.querySelectorAll(".team-switch").forEach(btn => btn.addEventListener("click", () => {
    state.currentTeamId = btn.dataset.team;
    const url = new URL(location.href);
    url.searchParams.set("team", state.currentTeamId);
    history.replaceState(null, "", url);
    renderTeam();
  }));
}

function getCurrentTeam() {
  return state.config.squadre.find(t => t.id === state.currentTeamId) || state.config.squadre[0];
}

function renderTeamHero(team) {
  $("team-logo-stage").innerHTML = teamLogo(team, "team-logo-main");
  $("team-name").textContent = team.nomeFantasquadra;
  $("manager-name").textContent = team.nomeReale;
  $("team-season").textContent = `Stagione ${state.config.lega.stagione}`;
}

function renderIdentity(team) {
  const hasLogo = !!logoMeta(team.id)?.immagine;
  $("identity-body").innerHTML = `
    <div class="identity-banner">
      <div class="identity-box"><small>Nome squadra</small><strong>${esc(team.nomeFantasquadra)}</strong></div>
      <div class="identity-box"><small>Fantallenatore</small><strong>${esc(team.nomeReale)}</strong></div>
      <div class="identity-box"><small>Stemma personalizzato</small><strong>${hasLogo ? 'Disponibile' : 'Fallback con iniziali'}</strong></div>
      <div class="identity-box"><small>Stagione</small><strong>${esc(state.config.lega.stagione)}</strong></div>
    </div>`;
}

function renderPagella(team) {
  const grade = (state.pagelle?.pagelle || []).find(x => x.squadraId === team.id);
  const targets = [$("auction-grade"), $("auction-full")];
  if (!grade) {
    const html = emptyBlock("badge-help", "Pagella non ancora inserita", "Quando l'admin inserirà voto, titolo e commento, compariranno qui senza generazione automatica.");
    targets.forEach(el => el.innerHTML = html);
    return;
  }

  const html = `<div class="grade-wrap"><div class="grade-score"><strong>${esc(String(grade.voto).replace('.', ','))}</strong></div><div class="grade-copy"><span class="grade-badge">${esc(grade.badge || 'PAGELLA')}</span><p>${esc(grade.commento || '')}</p></div></div>`;
  targets.forEach(el => el.innerHTML = html);
}

function renderPrediction(team) {
  const pred = (state.previsioni?.previsioni || []).find(x => x.squadraId === team.id);
  if (!pred?.immagine) {
    $("prediction-content").innerHTML = emptyBlock("image-off", "Previsione non disponibile", "Nessuno screenshot reale è stato caricato per questa fantasquadra.");
    return;
  }
  $("prediction-content").innerHTML = `<div class="prediction-wrap"><img class="prediction-shot" src="${ROOT}assets/previsioni/${pred.immagine}" alt="Previsione Serie A di ${esc(team.nomeReale)}"><div class="prediction-meta">Screenshot reale presente negli asset Hertavernello.</div></div>`;
}

function rosterUnavailableHtml() {
  return `<div class="roster-notice"><strong>Dataset rosa attuale escluso dalla preview</strong><p>` +
    `Il file rose.json dichiara esplicitamente di contenere dati casuali di test. Per questo questa pagina non calcola ruoli, club, costi o nazionalità come se fossero reali.</p></div>` +
    emptyBlock("database-zap", "In attesa della rosa reale", "Dopo l'asta, l'import reale alimenterà automaticamente rosa, donut, nazionalità, club rappresentati e highlights asta.");
}

function renderRosterDependent() {
  const html = rosterUnavailableHtml();
  ["nationality-content","role-content","club-content","roster-content","auction-highlights","stats-nationality","stats-role","stats-clubs"].forEach(id => $(id).innerHTML = html);
}

function renderTeam() {
  const team = getCurrentTeam();
  state.currentTeamId = team.id;
  renderSwitcher();
  renderTeamHero(team);
  renderIdentity(team);
  renderPagella(team);
  renderPrediction(team);
  renderRosterDependent();
  refreshIcons();
}

function setupTabs() {
  document.querySelectorAll(".team-tab").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".team-tab").forEach(x => x.classList.toggle("active", x === btn));
    document.querySelectorAll(".team-view").forEach(view => view.classList.toggle("active", view.dataset.view === btn.dataset.tab));
  }));
}

function setupPending() {
  const toast = $("preview-toast");
  document.querySelectorAll(".preview-pending").forEach(el => el.addEventListener("click", e => {
    e.preventDefault();
    toast.classList.add("show");
    clearTimeout(window.__teamToast);
    window.__teamToast = setTimeout(() => toast.classList.remove("show"), 2200);
  }));
}

async function init() {
  try {
    const [config, logos, pagelle, previsioni, rose] = await Promise.all([
      getJson("data/config.json"),
      getJson("data/loghi-fantasquadre.json"),
      getJson("data/pagelle.json"),
      getJson("data/previsioni.json"),
      getJson("data/rose.json")
    ]);
    Object.assign(state, { config, logos, pagelle, previsioni, rose });
    state.rosterIsTest = /test casuali/i.test(rose?._leggimi || "");
    const requested = new URLSearchParams(location.search).get("team");
    state.currentTeamId = config.squadre.some(t => t.id === requested) ? requested : config.squadre[0]?.id;
    $("brand-season").textContent = `Stagione ${config.lega.stagione}`;
    renderTeam();
  } catch (err) {
    console.error(err);
  }
  setupTabs();
  setupPending();
  refreshIcons();
}

init();
