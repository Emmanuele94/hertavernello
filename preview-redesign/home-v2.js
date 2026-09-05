(() => {
  const ROOT = "../";
  const API = "https://hertavernello-api-proxy.emmanueletufano.workers.dev";

  // Readability + sharpness layers are loaded last so their desktop/mobile
  // sizing and native-resolution guards win over the earlier refinement sheets.
  [
    ["home-readable-css", "home-readable.css"],
    ["home-sharp-css", "home-sharp.css"]
  ].forEach(([id, href]) => {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  });

  const ASSETS = {
    logo: `${ROOT}assets/logo.png`,
    matchup: `${ROOT}assets/icone/hv-home-chi-gioca.png`,
    league: `${ROOT}assets/icone/hv-home-classifica-generale.png`,
    scorers: `${ROOT}assets/icone/hv-home-capocannonieri.png`,
    featured: `${ROOT}assets/icone/hv-home-squadra-evidenza.png`,
    quiz: `${ROOT}assets/icone/hv-home-quiz-fantallenatore.png`
  };

  function esc(v = "") {
    return String(v).replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  }

  function normalizeName(str) {
    return (str || "").toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(fc|ac|ssc|as|us|cfc|calcio|football club)\b/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  function assetIcon(src, alt = "") {
    return `<span class="home-asset-icon"><img src="${src}" alt="${esc(alt)}"></span>`;
  }

  function applyBranding() {
    document.querySelectorAll(".brand-logo, .restyling-logo-card img, .quiz-brand-line img").forEach(img => {
      img.src = ASSETS.logo;
    });
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) favicon.href = ASSETS.logo;
  }

  function replacePanelIcon(selector, src, alt) {
    const title = document.querySelector(selector);
    if (!title) return;
    const current = title.querySelector(".panel-icon, .home-v2-icon, .home-premium-icon, .home-asset-icon");
    const html = assetIcon(src, alt);
    if (current) current.outerHTML = html;
    else title.insertAdjacentHTML("afterbegin", html);
  }

  function applyHomeAssets() {
    replacePanelIcon(".panel-fixtures .panel-title", ASSETS.matchup, "Chi gioca contro chi");
    replacePanelIcon(".panel-league .panel-title", ASSETS.league, "Classifica Hertavernello");
    replacePanelIcon(".panel-scorers .panel-title", ASSETS.scorers, "Capocannonieri");
    replacePanelIcon(".panel-feature .panel-title", ASSETS.featured, "Squadra in evidenza");
    replacePanelIcon(".panel-quiz .panel-title", ASSETS.quiz, "Quiz del Fantallenatore");

    const sideMatch = document.querySelector(".hero-side-panel .side-panel-item:nth-child(2)");
    if (sideMatch) {
      const old = sideMatch.querySelector("svg, .side-custom-icon");
      if (old) old.outerHTML = `<img class="side-custom-icon" src="${ASSETS.matchup}" alt="">`;
    }

    const orbit = document.querySelector(".reference-quiz-orbit");
    if (orbit && orbit.dataset.assetReady !== "1") {
      orbit.dataset.assetReady = "1";
      orbit.classList.add("quiz-asset-showpiece");
      orbit.innerHTML = `<span class="quiz-asset-aura"></span><img src="${ASSETS.quiz}" alt="">`;
    }

    const heading = document.querySelector(".reference-quiz .quiz-copy h3");
    if (heading) heading.textContent = "Metti alla prova!";
    const description = document.getElementById("quiz-description");
    if (description) {
      description.textContent = "10 domande sulla lega Hertavernello e sulla Serie A. Memoria, risultati reali e storia della lega in una sfida rapida.";
    }

    document.querySelectorAll(".reference-dashboard > .panel").forEach(panel => {
      panel.classList.add("home-premium-panel");
    });
  }

  async function renderFullSerieA() {
    const wrap = document.getElementById("seriea-standings");
    if (!wrap) return;

    try {
      const [standRes, refRes] = await Promise.all([
        fetch(`${API}/competitions/SA/standings`, { cache: "no-store" }),
        fetch(`${ROOT}data/squadre-serie-a.json`, { cache: "no-store" })
      ]);
      if (!standRes.ok || !refRes.ok) return;

      const [standData, ref] = await Promise.all([standRes.json(), refRes.json()]);
      const table = (standData.standings || []).find(s => s.type === "TOTAL")?.table
        || standData.standings?.[0]?.table
        || [];
      if (!table.length) return;

      const codeByName = name => {
        const norm = normalizeName(name);
        return ref?.squadre?.find(s => {
          const local = normalizeName(s.nome);
          return norm === local || (norm.length > 2 && (norm.includes(local) || local.includes(norm)));
        })?.codice || "";
      };

      wrap.innerHTML = `<div class="home-seriea-scroll" aria-label="Classifica completa Serie A">
        <table class="home-seriea-table"><tbody>${table.map(r => {
          const name = r.team?.shortName || r.team?.name || "—";
          const code = codeByName(name);
          return `<tr>
            <td class="rank">${esc(r.position)}</td>
            <td><div class="club-cell">${code ? `<img src="${ROOT}assets/loghi/${esc(code)}.png" alt="">` : ""}<span>${esc(name)}</span></div></td>
            <td class="points">${esc(r.points ?? "—")}</td>
          </tr>`;
        }).join("")}</tbody></table>
      </div>`;
    } catch (err) {
      console.warn("Classifica Serie A completa non caricata", err);
    }
  }

  function init() {
    applyBranding();
    applyHomeAssets();
    renderFullSerieA();

    setTimeout(() => {
      applyBranding();
      applyHomeAssets();
    }, 250);
    setTimeout(renderFullSerieA, 700);
    setTimeout(renderFullSerieA, 1800);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();