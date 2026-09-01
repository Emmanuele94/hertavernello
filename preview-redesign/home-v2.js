(() => {
  const ROOT = "../";
  const API = "https://hertavernello-api-proxy.emmanueletufano.workers.dev";

  const ICONS = {
    matchup: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path class="icon-soft" d="M8.5 12.5 17 8l8.5 4.5v9L17 26l-8.5-4.5z"/>
        <path class="icon-soft" d="M22.5 26.5 31 22l8.5 4.5v9L31 40l-8.5-4.5z"/>
        <path d="M15 15.5h6.5M26.5 32.5H33M18.5 19l11 10M29.5 19l-11 10"/>
        <circle cx="24" cy="24" r="3.2" class="icon-dot"/>
      </svg>`,
    ranking: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path class="icon-soft" d="M15 9.5h18v8.2c0 7.2-3.8 11.6-9 13.3-5.2-1.7-9-6.1-9-13.3z"/>
        <path d="M18 12.5h12v5.1c0 4.8-2.2 8.1-6 9.7-3.8-1.6-6-4.9-6-9.7zM24 31v6M17.5 39h13"/>
        <path d="M15 14h-4.5c0 5 1.9 8.2 6.3 9.4M33 14h4.5c0 5-1.9 8.2-6.3 9.4"/>
        <path class="icon-accent" d="m24 14.5 1.5 3 3.3.5-2.4 2.3.6 3.2-3-1.5-3 1.5.6-3.2-2.4-2.3 3.3-.5z"/>
      </svg>`,
    scorer: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path class="icon-soft" d="M8.5 13h31v23h-31z"/>
        <path d="M11.5 16h25v17h-25zM11.5 16l8 7.8m17-7.8-8 7.8M11.5 33l8-7.8m17 7.8-8-7.8"/>
        <circle cx="24" cy="24.5" r="5.2"/>
        <path class="icon-accent" d="m24 19.3 2.8 2 .1 3.4-2.7 2.1-3.2-1.1-1.1-3.2 1.9-2.8z"/>
        <path d="M29.2 24.5h6.3M12.5 24.5h6.3"/>
      </svg>`,
    spotlight: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path class="icon-soft" d="M24 7.5 29 17l10.5 1.6-7.6 7.5 1.8 10.6L24 31.8l-9.7 4.9 1.8-10.6-7.6-7.5L19 17z"/>
        <path d="m24 12 3.6 7.1 7.9 1.2-5.7 5.6 1.3 7.9-7.1-3.7-7.1 3.7 1.3-7.9-5.7-5.6 7.9-1.2z"/>
        <circle cx="24" cy="24" r="3.2" class="icon-dot"/>
      </svg>`,
    quiz: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path class="icon-soft" d="M14 10.5h20v9.2c0 7.2-4 11.6-10 13-6-1.4-10-5.8-10-13z"/>
        <path d="M17.5 13.5h13v6.1c0 5-2.4 8.1-6.5 9.5-4.1-1.4-6.5-4.5-6.5-9.5zM14 15h-4c0 5.3 2 8.5 6.6 9.8M34 15h4c0 5.3-2 8.5-6.6 9.8M24 32.7v5M18.5 39.5h11"/>
        <path class="icon-question" d="M21.6 19.1c.2-2 1.5-3.2 3.5-3.2 2.1 0 3.6 1.3 3.6 3.2 0 1.7-.9 2.6-2.3 3.5-1.2.8-1.8 1.5-1.8 2.9M24.5 28.4h.1"/>
      </svg>`
  };

  function premiumIcon(name, theme) {
    return `<span class="home-premium-icon ${theme}"><span class="home-icon-core">${ICONS[name]}</span><span class="home-icon-glint"></span></span>`;
  }

  function replaceHomeIcons() {
    const replacements = [
      [".panel-fixtures .panel-title", "matchup", "blue"],
      [".panel-league .panel-title", "ranking", "gold"],
      [".panel-scorers .panel-title", "scorer", "violet"],
      [".panel-feature .panel-title", "spotlight", "gold"],
      [".panel-quiz .panel-title", "quiz", "violet"]
    ];

    replacements.forEach(([selector, name, theme]) => {
      const title = document.querySelector(selector);
      if (!title || title.querySelector(".home-premium-icon")) return;
      const old = title.querySelector(".panel-icon, .home-v2-icon");
      if (old) old.outerHTML = premiumIcon(name, theme);
      else title.insertAdjacentHTML("afterbegin", premiumIcon(name, theme));
    });
  }

  function replaceQuizShowpiece() {
    const orbit = document.querySelector(".reference-quiz-orbit");
    if (!orbit || orbit.dataset.premium === "1") return;
    orbit.dataset.premium = "1";
    orbit.innerHTML = `
      <span class="quiz-premium-ring ring-one"></span>
      <span class="quiz-premium-ring ring-two"></span>
      <span class="quiz-premium-ring ring-three"></span>
      <span class="quiz-orbit-spark spark-a"></span>
      <span class="quiz-orbit-spark spark-b"></span>
      <span class="quiz-orbit-spark spark-c"></span>
      <div class="quiz-premium-cup">
        <div class="cup-aura"></div>
        <svg viewBox="0 0 210 210" aria-hidden="true">
          <path class="cup-shadow" d="M58 48h94v46c0 42-22 65-47 71-25-6-47-29-47-71z"/>
          <path class="cup-body" d="M65 51h80v40c0 34-17 55-40 62-23-7-40-28-40-62z"/>
          <path class="cup-edge" d="M71 58h68v31c0 28-13 45-34 53-21-8-34-25-34-53z"/>
          <path class="cup-handle" d="M64 66H39c0 35 11 55 37 64M146 66h25c0 35-11 55-37 64"/>
          <path class="cup-stem" d="M105 153v23M79 183h52M88 174h34"/>
          <ellipse class="cup-shine" cx="92" cy="70" rx="15" ry="25" transform="rotate(22 92 70)"/>
        </svg>
        <span class="quiz-cup-question">?</span>
        <span class="quiz-cup-base-glow"></span>
      </div>`;

    const description = document.getElementById("quiz-description");
    if (description) description.textContent = "10 domande sulla lega Hertavernello e sulla Serie A. Una sfida rapida tra memoria, risultati reali e storia della lega.";
  }

  function esc(v = "") {
    return String(v).replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  }

  function normalizeName(str) {
    return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(fc|ac|ssc|as|us|cfc|calcio|football club)\b/g, "").replace(/[^a-z0-9]/g, "");
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
      const table = (standData.standings || []).find(s => s.type === "TOTAL")?.table || standData.standings?.[0]?.table || [];
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

  function markPanelsPremium() {
    document.querySelectorAll(".reference-dashboard > .panel").forEach(panel => panel.classList.add("home-premium-panel"));
  }

  function initV2() {
    replaceHomeIcons();
    replaceQuizShowpiece();
    markPanelsPremium();
    renderFullSerieA();
    setTimeout(() => { replaceHomeIcons(); replaceQuizShowpiece(); markPanelsPremium(); }, 250);
    setTimeout(renderFullSerieA, 650);
    setTimeout(renderFullSerieA, 1800);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initV2);
  else initV2();
})();