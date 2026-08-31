const ROOT = "../";

const state = {
  config: null,
  calendario: null,
  hall: null,
  logos: null,
  serieARef: null,
};

const $ = (id) => document.getElementById(id);

async function getJson(path) {
  const res = await fetch(ROOT + path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

function fmtAuctionDate(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  }).format(d).replace(",", " ·");
}

function setupCountdown(iso) {
  const target = new Date(iso).getTime();
  const el = $("auction-countdown");
  const label = $("countdown-label");

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      el.textContent = "Asta conclusa";
      label.textContent = "Stato asta";
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    el.textContent = `${d}g ${h}h ${m}m`;
  }
  tick();
  setInterval(tick, 30000);
}

function logoFor(teamId, name, side = "") {
  const found = (state.logos?.loghi || []).find(x => x.squadraId === teamId);
  if (found?.immagine) {
    return `<img class="fantasy-logo" src="${ROOT}assets/stemmi/${found.immagine}" alt="Logo ${escapeHtml(name)}">`;
  }
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase();
  return `<span class="logo-fallback ${side}">${escapeHtml(initials || "HV")}</span>`;
}

function escapeHtml(v = "") {
  return String(v).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}

function renderFixtures() {
  const giornate = state.calendario?.giornate || [];
  const wrap = $("fixtures-list");
  if (!giornate.length) {
    wrap.innerHTML = `
      <div class="empty-state compact">
        <span class="empty-icon"><i data-lucide="calendar-x"></i></span>
        <div><strong>Calendario lega non ancora caricato</strong><p>Quando importerai il calendario reale, qui appariranno circa tre sfide con loghi e allenatori.</p></div>
      </div>`;
    $("calendar-status").textContent = "Non caricato";
    refreshIcons();
    return;
  }

  const teams = state.config.squadre;
  const current = giornate[0];
  const rows = (current.incontri || []).filter(x => x.length >= 2).slice(0, 3).map(pair => {
    const a = teams.find(t => t.id === pair[0]);
    const b = teams.find(t => t.id === pair[1]);
    if (!a || !b) return "";
    return `
      <div class="fixture-row">
        <div class="fixture-team">${logoFor(a.id, a.nomeFantasquadra)}<div class="team-lines"><strong>${escapeHtml(a.nomeFantasquadra)}</strong><small>${escapeHtml(a.nomeReale)}</small></div></div>
        <div class="fixture-center"><strong>VS</strong><small>G${current.giornata}</small></div>
        <div class="fixture-team right"><div class="team-lines"><strong>${escapeHtml(b.nomeFantasquadra)}</strong><small>${escapeHtml(b.nomeReale)}</small></div>${logoFor(b.id, b.nomeFantasquadra, "right")}</div>
      </div>`;
  }).join("");
  wrap.innerHTML = rows || `<div class="empty-state compact"><div><strong>Nessun incontro completo</strong><p>Il calendario esiste ma non contiene coppie valide da mostrare.</p></div></div>`;
  $("calendar-status").textContent = `Giornate: ${giornate.length}`;
  refreshIcons();
}

function renderHall() {
  const seasons = state.hall?.stagioni || [];
  const wrap = $("hall-of-fame");
  if (!seasons.length) {
    wrap.innerHTML = `<div class="empty-state compact"><div><strong>Archivio vuoto</strong><p>Nessuna stagione storica disponibile.</p></div></div>`;
    return;
  }

  const validChampions = seasons.filter(s => Array.isArray(s.campionato) && s.campionato.length);
  const last = [...validChampions].sort((a,b) => (b.annoInizio||0)-(a.annoInizio||0))[0];
  const titleCount = {};
  validChampions.forEach(s => s.campionato.forEach(n => titleCount[n] = (titleCount[n] || 0) + 1));
  const leader = Object.entries(titleCount).sort((a,b) => b[1]-a[1])[0];
  const cups = seasons.reduce((acc,s) => acc + ((s.coppa || []).length), 0);

  wrap.innerHTML = `
    <div class="archive-card"><div><small>ULTIMO CAMPIONE REGISTRATO</small><strong>${escapeHtml(last?.campionato?.join(" · ") || "—")}</strong></div><span>${escapeHtml(last?.anno || "")}</span></div>
    <div class="archive-card"><div><small>PIÙ TITOLATO</small><strong>${escapeHtml(leader?.[0] || "—")}</strong></div><span>${leader ? `${leader[1]} titoli` : "—"}</span></div>
    <div class="hall-summary">
      <div class="hall-pill"><strong>${seasons.length}</strong><small>STAGIONI</small></div>
      <div class="hall-pill"><strong>${validChampions.length}</strong><small>CAMPIONATI ASSEGNATI</small></div>
      <div class="hall-pill"><strong>${cups}</strong><small>VINCITORI COPPA REGISTRATI</small></div>
    </div>`;
}

async function loadSerieA() {
  const standingsWrap = $("seriea-standings");
  const scorersWrap = $("top-scorers");
  try {
    const [standRes, scorersRes] = await Promise.all([
      fetch("https://hertavernello-api-proxy.emmanueletufano.workers.dev/competitions/SA/standings"),
      fetch("https://hertavernello-api-proxy.emmanueletufano.workers.dev/competitions/SA/scorers")
    ]);
    if (!standRes.ok || !scorersRes.ok) throw new Error("API non disponibile");
    const [standData, scorerData] = await Promise.all([standRes.json(), scorersRes.json()]);
    const table = (standData.standings || []).find(s => s.type === "TOTAL")?.table || standData.standings?.[0]?.table || [];
    const scorers = scorerData.scorers || [];
    const codeByName = name => {
      const norm = (name || "").toLowerCase();
      return state.serieARef?.squadre?.find(s => norm.includes((s.nome||"").toLowerCase()) || (s.nome||"").toLowerCase().includes(norm))?.codice || "";
    };

    standingsWrap.innerHTML = table.slice(0,5).map(r => {
      const code = codeByName(r.team.shortName || r.team.name);
      return `<table class="standings-table"><tr><td class="rank">${r.position}</td><td><div class="club-cell">${code ? `<img src="${ROOT}assets/loghi/${code}.png" alt="">` : ""}<span>${escapeHtml(r.team.shortName || r.team.name)}</span></div></td><td class="points">${r.points}</td></tr></table>`;
    }).join("") || `<div class="empty-state compact"><div><strong>Classifica non disponibile</strong><p>L'API non ha restituito righe.</p></div></div>`;

    scorersWrap.innerHTML = scorers.slice(0,4).map((s,i) => `<div class="scorer-row"><span class="scorer-rank">${i+1}</span><div class="scorer-copy"><strong>${escapeHtml(s.player?.name || "—")}</strong><small>${escapeHtml(s.team?.shortName || s.team?.name || "")}</small></div><span class="scorer-goals">${s.goals ?? 0}<small>GOL</small></span></div>`).join("") || `<div class="empty-state compact"><div><strong>Marcatori non disponibili</strong><p>L'endpoint gratuito non ha restituito dati.</p></div></div>`;

    $("api-status").textContent = "Aggiornata";
    $("api-state-chip").textContent = "ONLINE";
  } catch (err) {
    standingsWrap.innerHTML = `<div class="empty-state compact"><span class="empty-icon"><i data-lucide="cloud-off"></i></span><div><strong>Serie A non raggiungibile</strong><p>La preview non inventa la classifica: verrà mostrata appena il proxy risponde.</p></div></div>`;
    scorersWrap.innerHTML = `<div class="empty-state compact"><span class="empty-icon"><i data-lucide="cloud-off"></i></span><div><strong>Capocannonieri non raggiungibili</strong><p>Nessun valore di fallback viene simulato.</p></div></div>`;
    $("api-status").textContent = "Non raggiungibile";
    $("api-state-chip").textContent = "OFFLINE";
    refreshIcons();
  }
}

function setupPreviewActions() {
  const toast = $("preview-toast");
  document.querySelectorAll(".preview-pending").forEach(el => {
    el.addEventListener("click", e => {
      if (el.tagName === "A") e.preventDefault();
      toast.classList.add("show");
      clearTimeout(window.__hvToast);
      window.__hvToast = setTimeout(() => toast.classList.remove("show"), 2400);
    });
  });
}

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

async function init() {
  try {
    const [config, calendario, hall, logos, serieARef] = await Promise.all([
      getJson("data/config.json"), getJson("data/calendario.json"), getJson("data/albo-oro.json"), getJson("data/loghi-fantasquadre.json"), getJson("data/squadre-serie-a.json")
    ]);
    Object.assign(state, { config, calendario, hall, logos, serieARef });

    $("brand-name").textContent = config.lega.nome;
    $("brand-season").textContent = `Stagione ${config.lega.stagione}`;
    $("hero-context").textContent = `Stagione ${config.lega.stagione}`;
    $("hero-title").innerHTML = `HERTAVERNELLO <span>${escapeHtml(config.lega.stagione.replace("20", "").replace("20", ""))}</span>`;
    $("auction-date").textContent = fmtAuctionDate(config.lega.dataAsta);
    $("hero-team-count").textContent = String(config.squadre.length);
    $("strip-teams").textContent = String(config.squadre.length);
    $("strip-managers").textContent = String(config.squadre.length);
    $("strip-season").textContent = config.lega.stagione;
    $("strip-history").textContent = String(hall.stagioni?.length || 0);
    setupCountdown(config.lega.dataAsta);
    renderFixtures();
    renderHall();
    refreshIcons();
    await loadSerieA();
  } catch (err) {
    console.error(err);
    $("api-status").textContent = "Errore dati locali";
  }

  setupPreviewActions();
  refreshIcons();
}

init();
