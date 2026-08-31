const ROOT = "../";
const $ = id => document.getElementById(id);

const state = { seasons: [], activeIndex: 0, curiosityMode: "calcio" };

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

function aggregate(seasons) {
  const league = {}, cup = {}, overall = {};
  seasons.forEach(s => {
    (s.campionato || []).forEach(name => {
      (league[name] ||= []).push(s.anno);
      (overall[name] ||= []).push({ anno: s.anno, tipo: "Campionato" });
    });
    (s.coppa || []).forEach(name => {
      (cup[name] ||= []).push(s.anno);
      (overall[name] ||= []).push({ anno: s.anno, tipo: "Coppa" });
    });
  });
  return { league, cup, overall };
}

function rankingRows(map, overall = false) {
  const rows = Object.entries(map)
    .map(([name, details]) => ({ name, details, count: details.length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "it"));

  if (!rows.length) return `<div class="empty-history">Nessun trofeo registrato.</div>`;

  return rows.slice(0, 6).map((row, index) => {
    const years = overall
      ? row.details.slice().reverse().map(x => `${x.anno} · ${x.tipo}`).join(" · ")
      : row.details.slice().reverse().join(" · ");
    return `<div class="hall-row">
      <span class="hall-rank">${index + 1}</span>
      <span class="hall-person"><strong>${esc(row.name)}</strong><small>${esc(years)}</small></span>
      <span class="hall-count"><strong>${row.count}</strong><small>${row.count === 1 ? "TROFEO" : "TROFEI"}</small></span>
    </div>`;
  }).join("");
}

function renderHall() {
  const finished = state.seasons.filter(s => !s.inCorso);
  const { league, cup, overall } = aggregate(finished);
  $("hall-league").innerHTML = rankingRows(league);
  $("hall-cup").innerHTML = rankingRows(cup);
  $("hall-overall").innerHTML = rankingRows(overall, true);

  const leagueCount = finished.reduce((n, s) => n + (s.campionato || []).length, 0);
  const cupCount = finished.reduce((n, s) => n + (s.coppa || []).length, 0);
  $("kpi-seasons").textContent = state.seasons.length;
  $("kpi-leagues").textContent = leagueCount;
  $("kpi-cups").textContent = cupCount;
  $("kpi-trophies").textContent = leagueCount + cupCount;
}

function renderTabs() {
  const wrap = $("season-tabs");
  wrap.innerHTML = state.seasons.map((s, i) => `<button type="button" class="season-tab${i === state.activeIndex ? " active" : ""}" data-i="${i}">${esc(s.anno)}</button>`).join("");
  wrap.querySelectorAll(".season-tab").forEach(btn => btn.addEventListener("click", () => setSeason(Number(btn.dataset.i))));
}

function winnerCard(kind, names) {
  const league = kind === "campionato";
  return `<div class="winner-card">
    <span><i data-lucide="${league ? "trophy" : "award"}"></i></span>
    <small>${league ? "CAMPIONE HERTAVERNELLO" : "VINCITORE COPPA"}</small>
    <strong>${names?.length ? names.map(esc).join(" · ") : "Non assegnata"}</strong>
  </div>`;
}

function serieARows(season) {
  const rows = season.classificaSerieA || [];
  if (!rows.length) return `<div class="empty-history">Classifica Serie A non disponibile per questa stagione.</div>`;
  return `<div class="history-table">${rows.slice(0, 8).map((r, i) => `<div class="history-row">
    <span class="history-rank">${i + 1}</span>
    ${r.codice ? `<img src="${ROOT}assets/loghi/${esc(r.codice)}.png" alt="">` : `<span></span>`}
    <span class="history-name">${esc(r.nome)}</span>
    <span class="history-value">${r.punti != null ? `${esc(r.punti)} pt` : "—"}</span>
  </div>`).join("")}</div>`;
}

function scorerRows(season) {
  const rows = season.topMarcatori || [];
  if (!rows.length) return `<div class="empty-history">Top marcatori non disponibile per questa stagione.</div>`;
  return `<div class="history-table scorer-table">${rows.slice(0, 6).map((r, i) => `<div class="history-row">
    <span class="history-rank">${i + 1}</span>
    <span class="history-name">${esc(r.nome)}<small>${esc(r.squadra || "")}</small></span>
    <span class="history-value">${r.gol != null ? `${esc(r.gol)} gol` : "—"}</span>
  </div>`).join("")}</div>`;
}

function curiosityHtml(season) {
  const c = season.curiosita;
  if (!c) return `<div class="empty-history">Nessuna curiosità storica registrata.</div>`;
  const list = c[state.curiosityMode] || [];
  return `<div class="curiosity-panel">
    <h3>${esc(c.titolo || `Curiosità ${season.anno}`)}</h3>
    <div class="curiosity-tabs">
      <button class="curiosity-tab${state.curiosityMode === "calcio" ? " active" : ""}" data-mode="calcio">Nel calcio</button>
      <button class="curiosity-tab${state.curiosityMode === "mondo" ? " active" : ""}" data-mode="mondo">Nel mondo</button>
    </div>
    <ul class="curiosity-list">${list.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
  </div>`;
}

function renderSeason() {
  const season = state.seasons[state.activeIndex];
  if (!season) return;
  $("season-year").textContent = season.anno;
  $("season-status").textContent = season.inCorso ? "IN CORSO" : "ARCHIVIATA";
  $("season-winners").innerHTML = winnerCard("campionato", season.campionato) + winnerCard("coppa", season.coppa);
  $("season-seriea").innerHTML = serieARows(season);
  $("season-scorers").innerHTML = scorerRows(season);
  $("season-curiosity").innerHTML = curiosityHtml(season);

  document.querySelectorAll(".curiosity-tab").forEach(btn => btn.addEventListener("click", () => {
    state.curiosityMode = btn.dataset.mode;
    $("season-curiosity").innerHTML = curiosityHtml(season);
    bindCuriosityTabs();
  }));
  refreshIcons();
}

function bindCuriosityTabs() {
  document.querySelectorAll(".curiosity-tab").forEach(btn => btn.addEventListener("click", () => {
    state.curiosityMode = btn.dataset.mode;
    $("season-curiosity").innerHTML = curiosityHtml(state.seasons[state.activeIndex]);
    bindCuriosityTabs();
  }));
}

function setSeason(index) {
  if (!state.seasons.length) return;
  state.activeIndex = Math.max(0, Math.min(index, state.seasons.length - 1));
  state.curiosityMode = "calcio";
  renderTabs();
  renderSeason();
  document.querySelector(`.season-tab[data-i="${state.activeIndex}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

function setupControls() {
  $("season-prev").addEventListener("click", () => setSeason(state.activeIndex - 1));
  $("season-next").addEventListener("click", () => setSeason(state.activeIndex + 1));

  const toast = $("preview-toast");
  document.querySelectorAll(".preview-pending").forEach(el => el.addEventListener("click", e => {
    e.preventDefault();
    toast.classList.add("show");
    clearTimeout(window.__archiveToast);
    window.__archiveToast = setTimeout(() => toast.classList.remove("show"), 2200);
  }));
}

async function init() {
  try {
    const [archive, config] = await Promise.all([getJson("data/albo-oro.json"), getJson("data/config.json")]);
    state.seasons = (archive.stagioni || []).slice().sort((a, b) => (a.annoInizio || 0) - (b.annoInizio || 0));
    state.activeIndex = Math.max(0, state.seasons.length - 1);
    $("brand-season").textContent = `Stagione ${config.lega.stagione}`;
    renderHall();
    renderTabs();
    renderSeason();
  } catch (err) {
    console.error(err);
  }
  setupControls();
  refreshIcons();
}

init();