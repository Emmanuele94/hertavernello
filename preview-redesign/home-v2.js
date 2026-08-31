(() => {
  const ROOT = "../";
  const API = "https://hertavernello-api-proxy.emmanueletufano.workers.dev";

  function refreshIcons() {
    if (window.lucide) lucide.createIcons();
  }

  function replaceHomeIcons() {
    const icons = [
      [".panel-fixtures .panel-icon", "git-compare-arrows", "blue"],
      [".panel-league .panel-icon", "trophy", "gold"],
      [".panel-scorers .panel-icon", "goal", "violet"],
      [".panel-feature .panel-icon", "sparkles", "gold"],
      [".panel-quiz .panel-icon", "circle-help", "violet"]
    ];

    icons.forEach(([selector, name, theme]) => {
      const el = document.querySelector(selector);
      if (!el) return;
      el.className = `home-v2-icon ${theme}`;
      el.innerHTML = `<i data-lucide="${name}"></i>`;
    });
    refreshIcons();
  }

  function esc(v = "") {
    return String(v).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
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

  function initV2() {
    replaceHomeIcons();
    renderFullSerieA();
    setTimeout(replaceHomeIcons, 250);
    setTimeout(renderFullSerieA, 650);
    setTimeout(renderFullSerieA, 1800);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initV2);
  else initV2();
})();