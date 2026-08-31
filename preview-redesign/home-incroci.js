(() => {
  const ROOT = "../";
  const API_BASE = "https://hertavernello-api-proxy.emmanueletufano.workers.dev";
  const $ = id => document.getElementById(id);

  function esc(v = "") {
    return String(v).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  }

  async function getJson(path) {
    const res = await fetch(ROOT + path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  }

  function normalizeName(str) {
    return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(fc|ac|ssc|as|us|cfc|calcio|football club|1913|1909|1907)\b/g, "")
      .replace(/[^a-z0-9]/g, "").trim();
  }

  function findCode(raw, ref) {
    if (!raw) return null;
    const direct = ref.squadre.find(s => s.codice.toLowerCase() === raw.trim().toLowerCase());
    if (direct) return direct.codice;
    const norm = normalizeName(raw);
    const found = ref.squadre.find(s => {
      const n = normalizeName(s.nome);
      return norm === n || (norm.length > 2 && (norm.includes(n) || n.includes(norm)));
    });
    return found?.codice || null;
  }

  function activeRound(matches) {
    const starts = {};
    matches.filter(m => m.matchday).forEach(m => {
      const t = new Date(m.data).getTime();
      if (!(m.matchday in starts) || t < starts[m.matchday]) starts[m.matchday] = t;
    });
    const keys = Object.keys(starts).map(Number);
    if (!keys.length) return null;
    let active = null;
    keys.forEach(round => {
      if (starts[round] <= Date.now() && (active === null || round > active)) active = round;
    });
    return active ?? Math.min(...keys);
  }

  function formatKickoff(iso) {
    return new Intl.DateTimeFormat("it-IT", { weekday:"short", hour:"2-digit", minute:"2-digit" }).format(new Date(iso));
  }

  function clubLogo(code, name) {
    if (code) return `<img src="${ROOT}assets/loghi/${code}.png" alt="${esc(name)}">`;
    return `<span>${esc((name || "?").slice(0, 1))}</span>`;
  }

  function relevantPlayers(teamId, match, rose, ref) {
    const roster = (rose.rose || []).find(r => r.squadraId === teamId);
    if (!roster) return [];
    return (roster.giocatori || []).map(p => ({ nome:p.nome, codice:findCode(p.squadraReale, ref) }))
      .filter(p => p.codice === match.homeCode || p.codice === match.awayCode);
  }

  function impact(match, config, calendario, rose, ref, rosterIsTest) {
    if (rosterIsTest) return null;
    const round = (calendario.giornate || []).find(g => Number(g.giornata) === Number(match.matchday));
    if (!round) return null;
    let duels = 0;
    let players = 0;
    (round.incontri || []).forEach(pair => {
      if (!Array.isArray(pair) || pair.length < 2) return;
      const a = config.squadre.find(t => t.id === pair[0]);
      const b = config.squadre.find(t => t.id === pair[1]);
      if (!a || !b) return;
      const pa = relevantPlayers(a.id, match, rose, ref);
      const pb = relevantPlayers(b.id, match, rose, ref);
      if (!pa.length && !pb.length) return;
      duels += 1;
      players += pa.length + pb.length;
    });
    return { duels, players };
  }

  function stateHtml(match) {
    if (match.live) return `<span class="home-cross-state live">LIVE${match.minute ? ` ${match.minute}'` : ""}</span>`;
    if (match.finished) return `<span class="home-cross-state final">FINALE</span>`;
    return `<span class="home-cross-state">${esc(formatKickoff(match.data))}</span>`;
  }

  async function run() {
    const wrap = $("fixtures-list");
    if (!wrap) return;

    try {
      const [config, calendario, rose, ref] = await Promise.all([
        getJson("data/config.json"), getJson("data/calendario.json"), getJson("data/rose.json"), getJson("data/squadre-serie-a.json")
      ]);
      const rosterIsTest = /test casuali/i.test(rose?._leggimi || "");
      const now = new Date();
      const from = new Date(now.getTime() - 5 * 86400000);
      const to = new Date(now.getTime() + 9 * 86400000);
      const fmt = d => d.toISOString().slice(0,10);
      const res = await fetch(`${API_BASE}/competitions/SA/matches?dateFrom=${fmt(from)}&dateTo=${fmt(to)}`, { cache:"no-store" });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const all = (data.matches || []).map(m => ({
        matchday:m.matchday, data:m.utcDate, live:m.status === "IN_PLAY" || m.status === "PAUSED", finished:m.status === "FINISHED", minute:m.minute ?? null,
        homeGoals:m.score?.fullTime?.home ?? null, awayGoals:m.score?.fullTime?.away ?? null,
        homeName:m.homeTeam?.shortName || m.homeTeam?.name || "Casa", awayName:m.awayTeam?.shortName || m.awayTeam?.name || "Trasferta",
        homeCode:findCode(m.homeTeam?.shortName || m.homeTeam?.name, ref), awayCode:findCode(m.awayTeam?.shortName || m.awayTeam?.name, ref)
      }));
      const round = activeRound(all);
      const matches = all.filter(m => m.matchday === round).sort((a,b) => new Date(a.data)-new Date(b.data)).slice(0,3);

      if (!matches.length) {
        wrap.innerHTML = `<div class="empty-state compact"><span class="empty-icon"><i data-lucide="calendar-x"></i></span><div><strong>Nessuna partita Serie A nella finestra attuale</strong><p>Non vengono creati incontri di esempio.</p></div></div>`;
        if ($("calendar-status")) $("calendar-status").textContent = "Nessuna partita";
        if (window.lucide) lucide.createIcons();
        return;
      }

      wrap.innerHTML = `<div class="home-cross-list">${matches.map(match => {
        const info = impact(match, config, calendario, rose, ref, rosterIsTest);
        const score = match.homeGoals != null && match.awayGoals != null ? `${match.homeGoals} — ${match.awayGoals}` : "VS";
        const meta = info
          ? (info.duels ? `${info.duels} incroci Hertavernello · ${info.players} giocatori coinvolti` : "Nessun impatto fantasy rilevato")
          : (rosterIsTest ? "Incrocio fantasy in attesa delle rose reali" : "Scontri Hertavernello non ancora importati");
        return `<div class="home-cross-match">
          <div class="home-cross-top"><small>SERIE A · G${esc(match.matchday || "—")}</small>${stateHtml(match)}</div>
          <div class="home-cross-main">
            <div class="home-cross-club">${clubLogo(match.homeCode, match.homeName)}<strong>${esc(match.homeName)}</strong></div>
            <div class="home-cross-score">${score}</div>
            <div class="home-cross-club away">${clubLogo(match.awayCode, match.awayName)}<strong>${esc(match.awayName)}</strong></div>
          </div>
          <div class="home-cross-meta"><i data-lucide="git-compare-arrows"></i><span>${esc(meta)}</span></div>
        </div>`;
      }).join("")}</div>`;
      if ($("calendar-status")) $("calendar-status").textContent = round ? `Serie A · G${round}` : "Serie A";
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      wrap.innerHTML = `<div class="empty-state compact"><span class="empty-icon"><i data-lucide="cloud-off"></i></span><div><strong>Match Center non raggiungibile</strong><p>Nessun dato di fallback viene inventato.</p></div></div>`;
      if ($("calendar-status")) $("calendar-status").textContent = "API offline";
      if (window.lucide) lucide.createIcons();
    }
  }

  window.addEventListener("load", run);
})();
