(function () {
  "use strict";

  const ICON_BASE = "assets/icone-eventi/";
  const EVENTI = [
    { key: "gol", label: "Gol", icon: "golFatto_xs.png" },
    { key: "assist", label: "Assist", icon: "assist_xs.png" },
    { key: "rigoriSegnati", label: "Rigore segnato", icon: "rigoreSegnato_xs.png" },
    { key: "autogol", label: "Autogol", icon: "autogol_xs.png" },
    { key: "ammonizioni", label: "Ammonizione", icon: "ammonito_xs.png" },
    { key: "espulsioni", label: "Espulsione", icon: "espulso_xs.png" },
    { key: "rigoriParati", label: "Rigore parato", icon: "rigoreParato_xs.png" },
  ];

  const ROLE_ORDER = { POR: 0, DIF: 1, CEN: 2, ATT: 3 };

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function matchKey(match) {
    if (match && match.id != null) return String(match.id);
    return `g${match?.matchday || "x"}-${match?.casaCodice || "casa"}-${match?.trasfertaCodice || "trasferta"}`;
  }

  function emptyData() {
    return {
      _leggimi: "Eventi manuali delle partite reali di Serie A usati in Home: gol, assist, rigori, autogol e cartellini. Si modificano dalla Home quando sei loggato come Admin.",
      partite: [],
    };
  }

  async function load() {
    try {
      const res = await fetch("data/eventi-partite.json", { cache: "no-store" });
      if (!res.ok) return emptyData();
      const data = await res.json();
      if (!data || !Array.isArray(data.partite)) return emptyData();
      return data;
    } catch (_) {
      return emptyData();
    }
  }

  function getMatchRecord(data, match) {
    const key = matchKey(match);
    return (data?.partite || []).find((p) => String(p.matchId) === key) || null;
  }

  function playerRecord(record, player) {
    if (!record || !player) return null;
    const fid = player.fantacalcioId != null ? String(player.fantacalcioId) : "";
    if (fid) {
      const byId = (record.eventi || []).find((e) => String(e.fantacalcioId || "") === fid);
      if (byId) return byId;
    }
    const nome = normalize(player.nome);
    const codice = String(player.squadraCodice || player.codice || "").toUpperCase();
    return (record.eventi || []).find((e) => normalize(e.nome) === nome && (!codice || String(e.squadraCodice || "").toUpperCase() === codice)) || null;
  }

  function cleanCounts(raw) {
    const out = {};
    EVENTI.forEach((def) => {
      const n = Math.max(0, Number(raw?.[def.key]) || 0);
      if (n) out[def.key] = n;
    });
    return out;
  }

  function getPlayerEvents(record, player) {
    return cleanCounts(playerRecord(record, player)?.eventi || {});
  }

  function hasAnyEvent(events) {
    return EVENTI.some((def) => Number(events?.[def.key]) > 0);
  }

  function renderIcons(events, className = "") {
    const parts = [];
    EVENTI.forEach((def) => {
      const count = Number(events?.[def.key]) || 0;
      if (!count) return;
      parts.push(`
        <button type="button" class="hv-evento-icon ${className}" data-event-tooltip="${def.label}" aria-label="${def.label}${count > 1 ? ` x${count}` : ""}">
          <img src="${ICON_BASE}${def.icon}" alt="">
          ${count > 1 ? `<span class="hv-evento-count">×${count}</span>` : ""}
        </button>`);
    });
    return parts.join("");
  }

  function initTooltipDelegation() {
    if (window.__hvEventTooltipInit) return;
    window.__hvEventTooltipInit = true;

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest(".hv-evento-icon[data-event-tooltip]");
      document.querySelectorAll(".hv-evento-icon.is-tooltip-open").forEach((el) => {
        if (el !== trigger) el.classList.remove("is-tooltip-open");
      });
      if (!trigger) return;
      event.stopPropagation();
      trigger.classList.toggle("is-tooltip-open");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        document.querySelectorAll(".hv-evento-icon.is-tooltip-open").forEach((el) => el.classList.remove("is-tooltip-open"));
      }
    });
  }

  function teamPlayers(giocatoriDb, codice) {
    return (giocatoriDb || [])
      .filter((g) => String(g.squadraCodice || "").toUpperCase() === String(codice || "").toUpperCase())
      .sort((a, b) => {
        const ra = ROLE_ORDER[a.ruolo] ?? 99;
        const rb = ROLE_ORDER[b.ruolo] ?? 99;
        if (ra !== rb) return ra - rb;
        return String(a.nome || "").localeCompare(String(b.nome || ""), "it");
      });
  }

  function eventCounterHtml(def, count) {
    return `
      <div class="hv-event-admin-counter" data-event-key="${def.key}" data-value="${count || 0}">
        <button type="button" class="hv-event-step hv-event-minus" aria-label="Togli ${def.label}" ${count ? "" : "disabled"}>−</button>
        <button type="button" class="hv-event-admin-main" title="${def.label}" aria-label="${def.label}">
          <img src="${ICON_BASE}${def.icon}" alt="">
          <span class="hv-event-admin-count">${count || 0}</span>
        </button>
        <button type="button" class="hv-event-step hv-event-plus" aria-label="Aggiungi ${def.label}">+</button>
      </div>`;
  }

  function playerEditorHtml(player, existing) {
    const events = cleanCounts(existing?.eventi || {});
    const photo = player.foto || "";
    return `
      <div class="hv-event-player" data-player-id="${String(player.fantacalcioId || "")}" data-player-name="${String(player.nome || "").replace(/"/g, "&quot;")}" data-player-team="${String(player.squadraCodice || "")}" data-player-role="${String(player.ruolo || "")}">
        <div class="hv-event-player-id">
          ${photo ? `<img src="${photo}" alt="" class="hv-event-player-photo">` : `<span class="hv-event-player-photo hv-event-player-photo-placeholder">?</span>`}
          <span><strong>${player.nome || "Giocatore"}</strong><small>${player.ruolo || ""}</small></span>
        </div>
        <div class="hv-event-player-controls">
          ${EVENTI.map((def) => eventCounterHtml(def, events[def.key] || 0)).join("")}
        </div>
      </div>`;
  }

  function teamEditorHtml(title, codice, players, record) {
    const saved = record?.eventi || [];
    return `
      <section class="hv-event-team-editor">
        <h4><img src="assets/loghi/${codice}.png" alt=""> ${title}</h4>
        <div class="hv-event-team-players">
          ${players.length ? players.map((p) => playerEditorHtml(p, playerRecord(record, p))).join("") : '<p class="empty-state">Nessun giocatore trovato nel database per questa squadra.</p>'}
        </div>
      </section>`;
  }

  function readPanelEvents(panel) {
    const eventi = [];
    panel.querySelectorAll(".hv-event-player").forEach((row) => {
      const counts = {};
      row.querySelectorAll(".hv-event-admin-counter").forEach((counter) => {
        const n = Math.max(0, Number(counter.dataset.value) || 0);
        if (n) counts[counter.dataset.eventKey] = n;
      });
      if (!hasAnyEvent(counts)) return;
      eventi.push({
        fantacalcioId: row.dataset.playerId || null,
        nome: row.dataset.playerName || "",
        squadraCodice: row.dataset.playerTeam || "",
        ruolo: row.dataset.playerRole || "",
        eventi: counts,
      });
    });
    return eventi;
  }

  function totalsForScore(eventi, match) {
    let home = 0;
    let away = 0;
    (eventi || []).forEach((entry) => {
      const e = entry.eventi || {};
      const code = String(entry.squadraCodice || "").toUpperCase();
      const goals = (Number(e.gol) || 0) + (Number(e.rigoriSegnati) || 0);
      const ownGoals = Number(e.autogol) || 0;
      if (code === String(match.casaCodice || "").toUpperCase()) {
        home += goals;
        away += ownGoals;
      } else if (code === String(match.trasfertaCodice || "").toUpperCase()) {
        away += goals;
        home += ownGoals;
      }
    });
    return { home, away };
  }

  function scoreWarning(match, eventi) {
    if (match?.golCasa == null || match?.golTrasferta == null) return "";
    const t = totalsForScore(eventi, match);
    if (t.home === Number(match.golCasa) && t.away === Number(match.golTrasferta)) return "";
    return `Il risultato della partita è ${match.golCasa}-${match.golTrasferta}, mentre gli eventi inseriti ricostruiscono ${t.home}-${t.away}. Puoi salvare comunque (per esempio se manca ancora un evento), ma controlla prima di confermare.`;
  }

  function updateCounter(counter, delta) {
    const next = Math.max(0, (Number(counter.dataset.value) || 0) + delta);
    counter.dataset.value = String(next);
    const countEl = counter.querySelector(".hv-event-admin-count");
    if (countEl) countEl.textContent = String(next);
    const minus = counter.querySelector(".hv-event-minus");
    if (minus) minus.disabled = next <= 0;
    counter.classList.toggle("has-value", next > 0);
  }

  function buildAdminControl({ match, giocatoriDb, config, data, onSaved }) {
    if (window.hv_role !== "admin") return null;
    const record = getMatchRecord(data, match);
    const wrapper = document.createElement("div");
    wrapper.className = "hv-match-events-admin";
    wrapper.innerHTML = `
      <button type="button" class="hv-match-events-toggle">${record?.eventi?.length ? "✏️ Modifica eventi" : "⚽ Inserisci eventi"}</button>
      <div class="hv-match-events-panel" hidden>
        <div class="hv-match-events-head">
          <div>
            <strong>Eventi partita</strong>
            <span>${match.casaNome} ${match.golCasa != null ? match.golCasa : ""} - ${match.golTrasferta != null ? match.golTrasferta : ""} ${match.trasfertaNome}</span>
          </div>
          <button type="button" class="hv-match-events-close" aria-label="Chiudi">✕</button>
        </div>
        <p class="hv-match-events-help">Tocca <b>+</b> per aggiungere un evento e <b>−</b> per correggerlo. Il rigore segnato vale già come gol e quindi non va duplicato con l'icona Gol.</p>
        <div class="hv-match-events-legend">
          ${EVENTI.map((def) => `<span><img src="${ICON_BASE}${def.icon}" alt="">${def.label}</span>`).join("")}
        </div>
        <div class="hv-match-events-teams">
          ${teamEditorHtml(match.casaNome, match.casaCodice, teamPlayers(giocatoriDb, match.casaCodice), record)}
          ${teamEditorHtml(match.trasfertaNome, match.trasfertaCodice, teamPlayers(giocatoriDb, match.trasfertaCodice), record)}
        </div>
        <div class="hv-match-events-footer">
          <p class="hv-match-events-status" aria-live="polite"></p>
          <button type="button" class="hv-match-events-clear">Azzera eventi</button>
          <button type="button" class="hv-match-events-save">💾 Salva eventi</button>
        </div>
      </div>`;

    const toggle = wrapper.querySelector(".hv-match-events-toggle");
    const panel = wrapper.querySelector(".hv-match-events-panel");
    const status = wrapper.querySelector(".hv-match-events-status");
    const saveBtn = wrapper.querySelector(".hv-match-events-save");

    const setOpen = (open) => {
      panel.hidden = !open;
      wrapper.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };

    toggle.addEventListener("click", () => setOpen(panel.hidden));
    wrapper.querySelector(".hv-match-events-close")?.addEventListener("click", () => setOpen(false));

    panel.addEventListener("click", (event) => {
      const plus = event.target.closest(".hv-event-plus");
      const minus = event.target.closest(".hv-event-minus");
      const main = event.target.closest(".hv-event-admin-main");
      const counter = event.target.closest(".hv-event-admin-counter");
      if (!counter) return;
      if (plus || main) updateCounter(counter, 1);
      else if (minus) updateCounter(counter, -1);
    });

    wrapper.querySelector(".hv-match-events-clear")?.addEventListener("click", () => {
      if (!confirm("Azzero tutti gli eventi inseriti per questa partita?")) return;
      panel.querySelectorAll(".hv-event-admin-counter").forEach((counter) => {
        counter.dataset.value = "0";
        const count = counter.querySelector(".hv-event-admin-count");
        if (count) count.textContent = "0";
        const minus = counter.querySelector(".hv-event-minus");
        if (minus) minus.disabled = true;
        counter.classList.remove("has-value");
      });
      status.textContent = "Eventi azzerati nella schermata. Premi Salva eventi per confermare.";
    });

    saveBtn.addEventListener("click", async () => {
      const eventi = readPanelEvents(panel);
      const warning = scoreWarning(match, eventi);
      if (warning && !confirm(`${warning}\n\nSalvare comunque?`)) return;
      if (!confirm(`Confermi gli eventi di ${match.casaNome} vs ${match.trasfertaNome}?`)) return;

      saveBtn.disabled = true;
      toggle.disabled = true;
      status.textContent = "Salvataggio in corso…";
      try {
        const key = matchKey(match);
        const payload = data && Array.isArray(data.partite) ? data : emptyData();
        const existingIndex = payload.partite.findIndex((p) => String(p.matchId) === key);
        const next = {
          matchId: key,
          giornata: Number(match.matchday) || null,
          casaCodice: match.casaCodice || "",
          trasfertaCodice: match.trasfertaCodice || "",
          casaNome: match.casaNome || "",
          trasfertaNome: match.trasfertaNome || "",
          aggiornatoIl: new Date().toISOString(),
          eventi,
        };
        if (existingIndex >= 0) payload.partite[existingIndex] = next;
        else payload.partite.push(next);

        if (typeof hv_ghSalvaJSON !== "function") throw new Error("Modulo GitHub non disponibile.");
        await hv_ghSalvaJSON(
          "data/eventi-partite.json",
          payload,
          `Aggiorna eventi ${match.casaNome} - ${match.trasfertaNome}`,
          config,
          (sec) => { status.textContent = `Attendo GitHub: ${sec}s…`; }
        );
        status.textContent = "Eventi salvati ✓";
        toggle.textContent = "✏️ Modifica eventi";
        if (typeof onSaved === "function") {
          setTimeout(() => onSaved(payload), 350);
        }
      } catch (err) {
        status.textContent = `Errore: ${err.message}`;
      } finally {
        saveBtn.disabled = false;
        toggle.disabled = false;
      }
    });

    return wrapper;
  }

  initTooltipDelegation();

  window.HVMatchEvents = {
    defs: EVENTI,
    iconBase: ICON_BASE,
    load,
    matchKey,
    getMatchRecord,
    getPlayerEvents,
    renderIcons,
    buildAdminControl,
  };
})();
