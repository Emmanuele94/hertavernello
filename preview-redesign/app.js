const ROOT = "../";

const premiumIconStyles = document.createElement("link");
premiumIconStyles.rel = "stylesheet";
premiumIconStyles.href = "icon-system.css";
document.head.appendChild(premiumIconStyles);

const PREMIUM_EMBLEMS = {
  fixtures: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="hv-fixtures-a" x1="3" y1="4" x2="16" y2="27"><stop stop-color="#a77cff"/><stop offset="1" stop-color="#5147d8"/></linearGradient>
        <linearGradient id="hv-fixtures-b" x1="29" y1="4" x2="17" y2="27"><stop stop-color="#6fcfff"/><stop offset="1" stop-color="#286fe8"/></linearGradient>
      </defs>
      <path d="M4 6.5 12.5 3l5 3v7.2c0 5.2-3.4 9.1-8.5 12.8C5.7 23.4 3 19.6 3 15V8.2Z" fill="url(#hv-fixtures-a)" opacity=".96"/>
      <path d="m28 6.5-8.5-3.5-5 3v7.2c0 5.2 3.4 9.1 8.5 12.8 3.3-2.6 6-6.4 6-11V8.2Z" fill="url(#hv-fixtures-b)" opacity=".9"/>
      <path d="m10 10 12 12M22 10 10 22" stroke="#eef5ff" stroke-width="1.5" stroke-linecap="round" opacity=".9"/>
      <circle cx="10" cy="10" r="2" fill="#fff"/><circle cx="22" cy="10" r="2" fill="#fff"/>
    </svg>`,
  league: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs><linearGradient id="hv-trophy" x1="8" y1="3" x2="23" y2="27"><stop stop-color="#fff0a8"/><stop offset=".45" stop-color="#f0bd55"/><stop offset="1" stop-color="#a86f20"/></linearGradient></defs>
      <path d="M10 4h12v5.7c0 5-2.2 8.4-6 10.3-3.8-1.9-6-5.3-6-10.3V4Z" fill="url(#hv-trophy)"/>
      <path d="M10 7H5.5v2c0 4.1 2.2 6.7 6.2 7.4M22 7h4.5v2c0 4.1-2.2 6.7-6.2 7.4" fill="none" stroke="#f5c968" stroke-width="2" stroke-linecap="round"/>
      <path d="M16 20v4M11.5 27h9" stroke="#f6d17a" stroke-width="2.2" stroke-linecap="round"/>
      <path d="m16 7.1 1.15 2.3 2.55.37-1.85 1.8.44 2.54L16 12.9l-2.29 1.2.44-2.53-1.85-1.8 2.55-.37Z" fill="#fff5c9" opacity=".88"/>
    </svg>`,
  seriea: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs><linearGradient id="hv-seriea" x1="6" y1="4" x2="25" y2="28"><stop stop-color="#76d9ff"/><stop offset=".5" stop-color="#248cff"/><stop offset="1" stop-color="#3947db"/></linearGradient></defs>
      <path d="M16 2.8 27 7v8.6c0 6.3-4.4 10.4-11 13.6C9.4 26 5 21.9 5 15.6V7Z" fill="url(#hv-seriea)" opacity=".95"/>
      <path d="M11 20.8V11.4M16 22.5V8.8M21 20.8v-7.2" stroke="#eaf7ff" stroke-width="2" stroke-linecap="round" opacity=".94"/>
      <circle cx="16" cy="8.2" r="2.2" fill="#fff" opacity=".92"/>
    </svg>`,
  scorers: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs><radialGradient id="hv-target" cx="50%" cy="45%" r="55%"><stop stop-color="#d897ff"/><stop offset=".55" stop-color="#9b52ff"/><stop offset="1" stop-color="#5420b8"/></radialGradient></defs>
      <circle cx="16" cy="16" r="11.5" fill="url(#hv-target)" opacity=".9"/>
      <circle cx="16" cy="16" r="7.3" fill="#08111d" stroke="#e0b3ff" stroke-width="1.2" opacity=".96"/>
      <circle cx="16" cy="16" r="3.3" fill="#c978ff"/>
      <path d="M16 2.8v5M16 24.2v5M2.8 16h5M24.2 16h5" stroke="#f1dfff" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="16" cy="16" r="1.15" fill="#fff"/>
    </svg>`,
  feature: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs><linearGradient id="hv-star" x1="7" y1="4" x2="24" y2="27"><stop stop-color="#fff0a4"/><stop offset=".45" stop-color="#efbd55"/><stop offset="1" stop-color="#c37b17"/></linearGradient></defs>
      <path d="m16 3.4 3.66 7.41 8.18 1.19-5.92 5.77 1.4 8.14L16 22.06l-7.32 3.85 1.4-8.14L4.16 12l8.18-1.19Z" fill="url(#hv-star)"/>
      <path d="m16 8.1 2.02 4.1 4.53.66-3.28 3.2.78 4.51L16 18.43l-4.05 2.14.78-4.51-3.28-3.2 4.53-.66Z" fill="#fff7d0" opacity=".56"/>
    </svg>`,
  hall: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs><linearGradient id="hv-hall" x1="9" y1="4" x2="23" y2="27"><stop stop-color="#ffe8a0"/><stop offset=".48" stop-color="#d9a84e"/><stop offset="1" stop-color="#815116"/></linearGradient></defs>
      <path d="M11 6h10v4.2c0 4.1-1.8 6.8-5 8.4-3.2-1.6-5-4.3-5-8.4V6Z" fill="url(#hv-hall)"/>
      <path d="M16 18.6v4M12 25.2h8" stroke="#e9bd64" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M8.6 10.1c-2.4 2.4-3 5.4-1.9 8.6.9 2.8 2.8 4.8 5.8 6.1M23.4 10.1c2.4 2.4 3 5.4 1.9 8.6-.9 2.8-2.8 4.8-5.8 6.1" fill="none" stroke="#c79036" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M6.3 13.3 4.1 12M6.1 17.5 3.5 17M8.3 21.2l-2.2 1.4M25.7 13.3l2.2-1.3M25.9 17.5l2.6-.5M23.7 21.2l2.2 1.4" stroke="#f2cc78" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`,
  quiz: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs><linearGradient id="hv-quiz" x1="7" y1="4" x2="25" y2="27"><stop stop-color="#e1a1ff"/><stop offset=".45" stop-color="#9f55ff"/><stop offset="1" stop-color="#5620bd"/></linearGradient></defs>
      <path d="M9 6h14v5c0 5.1-2.6 8.6-7 10.5C11.6 19.6 9 16.1 9 11V6Z" fill="url(#hv-quiz)"/>
      <path d="M9 9H5v2.1c0 3.6 1.8 5.8 5.2 6.7M23 9h4v2.1c0 3.6-1.8 5.8-5.2 6.7" fill="none" stroke="#bb7cff" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M16 21.5v3M12 27h8" stroke="#c78aff" stroke-width="1.8" stroke-linecap="round"/>
      <text x="16" y="16.5" text-anchor="middle" fill="#fff" font-size="11" font-family="Inter, sans-serif" font-weight="800">?</text>
    </svg>`
};

function applyPremiumEmblems() {
  const targets = [
    [".panel-fixtures .panel-icon", "fixtures"],
    [".panel-league .panel-icon", "league"],
    [".panel-seriea .panel-icon", "seriea"],
    [".panel-scorers .panel-icon", "scorers"],
    [".panel-feature .panel-icon", "feature"],
    [".panel-hall .panel-icon", "hall"],
    [".panel-quiz .panel-icon", "quiz"]
  ];

  targets.forEach(([selector, key]) => {
    const el = document.querySelector(selector);
    if (!el || !PREMIUM_EMBLEMS[key]) return;
    el.className = `panel-icon panel-emblem emblem-${key}`;
    el.innerHTML = PREMIUM_EMBLEMS[key];
  });
}

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
  applyPremiumEmblems();

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
