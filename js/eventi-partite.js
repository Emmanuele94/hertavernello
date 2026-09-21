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
    { key: "rigoriSbagliati", label: "Rigore sbagliato", icon: "rigoreSbagliato_xs.png" },
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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function playerKey(player) {
    const fid = player?.fantacalcioId != null ? String(player.fantacalcioId) : "";
    if (fid) return `id:${fid}`;
    return `n:${normalize(player?.nome)}:${String(player?.squadraCodice || player?.codice || "").toUpperCase()}`;
  }

  function matchKey(match) {
    if (match && match.id != null) return String(match.id);
    return `g${match?.matchday || "x"}-${match?.casaCodice || "casa"}-${match?.trasfertaCodice || "trasferta"}`;
  }

  function emptyData() {
    return {
      _leggimi: "Archivio stagionale degli eventi manuali delle partite reali di Serie A. Conserva risultato, squadre e giocatori/eventi per riuso futuro (statistiche, What If, news) e si modifica dalla Home o dall'Admin.",
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

  // Per l'archivio storico manteniamo editabili anche giocatori che nel frattempo
  // hanno cambiato squadra o non sono più nel database corrente. Gli eventi salvati
  // restano legati alla squadra reale che avevano in quella partita.
  function teamPlayersWithHistory(giocatoriDb, codice, record) {
    const code = String(codice || "").toUpperCase();
    const base = teamPlayers(giocatoriDb, code).map((p) => ({ ...p }));
    const keys = new Set(base.map(playerKey));
    (record?.eventi || [])
      .filter((e) => String(e.squadraCodice || "").toUpperCase() === code)
      .forEach((entry) => {
        let db = null;
        const fid = entry?.fantacalcioId != null ? String(entry.fantacalcioId) : "";
        if (fid) db = (giocatoriDb || []).find((g) => String(g.fantacalcioId || "") === fid) || null;
        if (!db) db = (giocatoriDb || []).find((g) => normalize(g.nome) === normalize(entry.nome)) || null;
        const storico = {
          ...(db || {}),
          fantacalcioId: entry.fantacalcioId || db?.fantacalcioId || null,
          nome: entry.nome || db?.nome || "Giocatore",
          ruolo: entry.ruolo || db?.ruolo || "",
          squadraCodice: code,
        };
        const key = playerKey(storico);
        if (!keys.has(key)) { base.push(storico); keys.add(key); }
      });
    return base.sort((a, b) => {
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
    const key = playerKey(player);
    return `
      <div class="hv-event-player" data-player-key="${escapeHtml(key)}" data-player-id="${escapeHtml(String(player.fantacalcioId || ""))}" data-player-name="${escapeHtml(player.nome || "")}" data-player-team="${escapeHtml(String(player.squadraCodice || ""))}" data-player-role="${escapeHtml(String(player.ruolo || ""))}">
        <div class="hv-event-player-id">
          ${photo ? `<img src="${escapeHtml(photo)}" alt="" class="hv-event-player-photo">` : `<span class="hv-event-player-photo hv-event-player-photo-placeholder">?</span>`}
          <span><strong>${escapeHtml(player.nome || "Giocatore")}</strong><small>${escapeHtml(player.ruolo || "")}</small></span>
          <button type="button" class="hv-event-player-remove" aria-label="Rimuovi ${escapeHtml(player.nome || "giocatore")}" title="Rimuovi dalla selezione">✕</button>
        </div>
        <div class="hv-event-player-controls">
          ${EVENTI.map((def) => eventCounterHtml(def, events[def.key] || 0)).join("")}
        </div>
      </div>`;
  }

  function playerOptionHtml(player, selected, owner) {
    const key = playerKey(player);
    return `
      <button type="button" class="hv-event-picker-option"
        data-player-key="${escapeHtml(key)}"
        data-player-id="${escapeHtml(String(player.fantacalcioId || ""))}"
        data-player-name="${escapeHtml(player.nome || "")}"
        data-player-team="${escapeHtml(String(player.squadraCodice || ""))}"
        data-player-role="${escapeHtml(String(player.ruolo || ""))}"
        data-player-photo="${escapeHtml(player.foto || "")}"
        data-selected="${selected ? "1" : "0"}"${selected ? " hidden" : ""}>
        ${player.foto ? `<img src="${escapeHtml(player.foto)}" alt="">` : `<span class="hv-event-picker-photo-placeholder">?</span>`}
        <span>
          <strong>${escapeHtml(player.nome || "Giocatore")}</strong>
          <small><span>${escapeHtml(player.ruolo || "")}</span><span aria-hidden="true">·</span><span class="hv-event-picker-owner">${escapeHtml(owner || "Svincolato")}</span></small>
        </span>
      </button>`;
  }

  function teamEditorHtml(title, codice, players, record, roseData, config) {
    const selectedKeys = new Set();
    const selectedRows = [];
    players.forEach((player) => {
      const existing = playerRecord(record, player);
      if (!existing || !hasAnyEvent(existing.eventi || {})) return;
      selectedKeys.add(playerKey(player));
      selectedRows.push(playerEditorHtml(player, existing));
    });

    return `
      <section class="hv-event-team-editor" data-team-code="${escapeHtml(codice)}">
        <h4><img src="assets/loghi/${escapeHtml(codice)}.png" alt=""> ${escapeHtml(title)}</h4>
        <div class="hv-event-picker">
          <label>Cerca giocatore</label>
          <div class="hv-event-picker-input-wrap">
            <span aria-hidden="true">⌕</span>
            <input type="search" class="hv-event-picker-input" autocomplete="off" placeholder="Cerca giocatore…" aria-label="Cerca un giocatore di ${escapeHtml(title)}">
            <span class="hv-event-picker-chevron" aria-hidden="true">▾</span>
          </div>
          <div class="hv-event-picker-results" hidden>
            ${players.length ? players.map((p) => playerOptionHtml(p, selectedKeys.has(playerKey(p)), findOwner(p, roseData, config))).join("") : '<p class="empty-state">Nessun giocatore trovato nel database.</p>'}
            <p class="hv-event-picker-empty" hidden>Nessun giocatore corrispondente.</p>
          </div>
        </div>
        <div class="hv-event-selected-list">
          ${selectedRows.length ? selectedRows.join("") : '<p class="hv-event-selected-empty">Nessun giocatore selezionato.</p>'}
        </div>
      </section>`;
  }

  function optionToPlayer(option) {
    return {
      fantacalcioId: option.dataset.playerId || null,
      nome: option.dataset.playerName || "",
      squadraCodice: option.dataset.playerTeam || "",
      ruolo: option.dataset.playerRole || "",
      foto: option.dataset.playerPhoto || "",
    };
  }

  function refreshPicker(picker) {
    const input = picker.querySelector(".hv-event-picker-input");
    const results = picker.querySelector(".hv-event-picker-results");
    if (!input || !results) return;

    const query = normalize(input.value);
    const options = Array.from(results.querySelectorAll(".hv-event-picker-option"));
    const empty = results.querySelector(".hv-event-picker-empty");
    const matches = [];

    options.forEach((option) => {
      const selected = option.dataset.selected === "1";
      const playerName = normalize(option.dataset.playerName || "");
      const tokens = playerName.split(/\s+/).filter(Boolean);

      // Il filtro riguarda ESCLUSIVAMENTE il nome del calciatore.
      // Con campo vuoto mostriamo tutta la rosa disponibile; appena viene
      // digitato un carattere restano visibili solo i nomi che lo contengono.
      const nameMatches = !query || playerName.includes(query);
      if (selected || !nameMatches) {
        option.hidden = true;
        option.classList.add("is-filtered-out");
        option.setAttribute("aria-hidden", "true");
        return;
      }

      let rank = 3;
      if (query && playerName.startsWith(query)) rank = 0;
      else if (query && tokens.some((token) => token.startsWith(query))) rank = 1;
      else if (query) rank = 2;
      matches.push({ option, rank, name: playerName });
    });

    matches
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "it"))
      .forEach(({ option }) => {
        option.hidden = false;
        option.classList.remove("is-filtered-out");
        option.removeAttribute("aria-hidden");
        results.insertBefore(option, empty || null);
      });

    if (empty) {
      empty.textContent = matches.length ? "" : "Nessun giocatore corrispondente.";
      empty.hidden = matches.length > 0;
    }
  }

  function syncSelectedEmpty(teamEditor) {
    const list = teamEditor.querySelector(".hv-event-selected-list");
    if (!list) return;
    const hasRows = !!list.querySelector(".hv-event-player");
    let empty = list.querySelector(".hv-event-selected-empty");
    if (!hasRows && !empty) {
      empty = document.createElement("p");
      empty.className = "hv-event-selected-empty";
      empty.textContent = "Nessun giocatore selezionato.";
      list.appendChild(empty);
    } else if (hasRows && empty) {
      empty.remove();
    }
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

  function findDbPlayer(entry, giocatoriDb) {
    const fid = entry?.fantacalcioId != null ? String(entry.fantacalcioId) : "";
    if (fid) {
      const found = (giocatoriDb || []).find((g) => String(g.fantacalcioId || "") === fid);
      if (found) return found;
    }
    const nome = normalize(entry?.nome);
    const codice = String(entry?.squadraCodice || "").toUpperCase();
    return (giocatoriDb || []).find((g) => normalize(g.nome) === nome && (!codice || String(g.squadraCodice || "").toUpperCase() === codice))
      || (giocatoriDb || []).find((g) => normalize(g.nome) === nome)
      || null;
  }

  function findOwner(entry, roseData, config) {
    const fid = entry?.fantacalcioId != null ? String(entry.fantacalcioId) : "";
    const nome = normalize(entry?.nome);
    let ownerId = "";
    for (const rosa of (roseData?.rose || [])) {
      const found = (rosa.giocatori || []).some((g) => {
        const gid = g.fantacalcioId != null ? String(g.fantacalcioId) : "";
        if (fid && gid && fid === gid) return true;
        return normalize(g.nome) === nome;
      });
      if (found) { ownerId = rosa.squadraId; break; }
    }
    if (!ownerId) return "Svincolato";
    const team = (config?.squadre || []).find((s) => s.id === ownerId);
    return team?.nomeFantasquadra || team?.nomeReale || "Svincolato";
  }

  function summaryPlayerHtml(entry, roseData, config, giocatoriDb) {
    const db = findDbPlayer(entry, giocatoriDb);
    const photo = db?.foto || "";
    const owner = findOwner(entry, roseData, config);
    return `
      <div class="hv-event-summary-player">
        ${photo ? `<img class="hv-event-summary-photo" src="${escapeHtml(photo)}" alt="">` : `<span class="hv-event-summary-photo hv-event-player-photo-placeholder">?</span>`}
        <div class="hv-event-summary-main">
          <strong>${escapeHtml(entry.nome || "Giocatore")}</strong>
          <span class="hv-event-summary-icons">${renderIcons(cleanCounts(entry.eventi || {}), "hv-evento-icon-summary")}</span>
        </div>
        <span class="hv-event-summary-owner">${escapeHtml(owner)}</span>
      </div>`;
  }

  function renderMatchSummary(record, { match, roseData, config, giocatoriDb } = {}) {
    const entries = (record?.eventi || []).filter((entry) => hasAnyEvent(entry.eventi || {}));
    if (!entries.length || !match) return "";
    const homeCode = String(match.casaCodice || "").toUpperCase();
    const awayCode = String(match.trasfertaCodice || "").toUpperCase();
    const group = (code) => entries.filter((e) => String(e.squadraCodice || "").toUpperCase() === code);
    const teamBlock = (name, code, list) => `
      <section class="hv-event-summary-team">
        <h5><img src="assets/loghi/${escapeHtml(code)}.png" alt="">${escapeHtml(name)}</h5>
        ${list.length ? list.map((entry) => summaryPlayerHtml(entry, roseData, config, giocatoriDb)).join("") : '<p class="hv-event-summary-empty">Nessun evento registrato.</p>'}
      </section>`;
    return `
      <div class="hv-event-match-summary">
        <div class="hv-event-match-summary-title"><span>Eventi partita</span><small>Fantallenatore proprietario aggiornato alla rosa attuale</small></div>
        <div class="hv-event-match-summary-grid">
          ${teamBlock(match.casaNome || homeCode, homeCode, group(homeCode))}
          ${teamBlock(match.trasfertaNome || awayCode, awayCode, group(awayCode))}
        </div>
      </div>`;
  }

  function buildAdminControl({ match, giocatoriDb, config, roseData, data, onSaved, standalone = false, openInitially = false }) {
    if (window.hv_role !== "admin") return null;
    const record = getMatchRecord(data, match);
    const wrapper = document.createElement("div");
    wrapper.className = `hv-match-events-admin${standalone ? " hv-match-events-admin-standalone" : ""}`;
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
          ${teamEditorHtml(match.casaNome, match.casaCodice, teamPlayersWithHistory(giocatoriDb, match.casaCodice, record), record, roseData, config)}
          ${teamEditorHtml(match.trasfertaNome, match.trasfertaCodice, teamPlayersWithHistory(giocatoriDb, match.trasfertaCodice, record), record, roseData, config)}
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
    if (openInitially) setOpen(true);

    panel.addEventListener("click", (event) => {
      const option = event.target.closest(".hv-event-picker-option");
      if (option) {
        const teamEditor = option.closest(".hv-event-team-editor");
        const list = teamEditor?.querySelector(".hv-event-selected-list");
        if (!teamEditor || !list) return;
        const player = optionToPlayer(option);
        list.insertAdjacentHTML("beforeend", playerEditorHtml(player, null));
        option.dataset.selected = "1";
        option.hidden = true;
        const picker = option.closest(".hv-event-picker");
        const input = picker?.querySelector(".hv-event-picker-input");
        const results = picker?.querySelector(".hv-event-picker-results");
        if (input) input.value = "";
        if (results) results.hidden = true;
        syncSelectedEmpty(teamEditor);
        refreshPicker(picker);
        input?.focus();
        return;
      }

      const remove = event.target.closest(".hv-event-player-remove");
      if (remove) {
        const row = remove.closest(".hv-event-player");
        const teamEditor = row?.closest(".hv-event-team-editor");
        const key = row?.dataset.playerKey || "";
        row?.remove();
        const option = Array.from(teamEditor?.querySelectorAll(".hv-event-picker-option") || []).find((el) => el.dataset.playerKey === key);
        if (option) option.dataset.selected = "0";
        const picker = teamEditor?.querySelector(".hv-event-picker");
        syncSelectedEmpty(teamEditor);
        refreshPicker(picker);
        return;
      }

      const plus = event.target.closest(".hv-event-plus");
      const minus = event.target.closest(".hv-event-minus");
      const main = event.target.closest(".hv-event-admin-main");
      const counter = event.target.closest(".hv-event-admin-counter");
      if (!counter) return;
      if (plus || main) updateCounter(counter, 1);
      else if (minus) updateCounter(counter, -1);
    });

    panel.addEventListener("focusin", (event) => {
      const input = event.target.closest(".hv-event-picker-input");
      if (!input) return;
      const picker = input.closest(".hv-event-picker");
      const results = picker?.querySelector(".hv-event-picker-results");
      refreshPicker(picker);
      if (results) results.hidden = false;
    });

    panel.addEventListener("input", (event) => {
      const input = event.target.closest(".hv-event-picker-input");
      if (!input) return;
      const picker = input.closest(".hv-event-picker");
      const results = picker?.querySelector(".hv-event-picker-results");
      refreshPicker(picker);
      if (results) results.hidden = false;
    });

    panel.addEventListener("keydown", (event) => {
      const input = event.target.closest(".hv-event-picker-input");
      if (!input) return;
      const picker = input.closest(".hv-event-picker");
      const results = picker?.querySelector(".hv-event-picker-results");

      if (event.key === "Escape") {
        results?.setAttribute("hidden", "");
        input.blur();
        return;
      }

      // Invio resta una scorciatoia accessibile, ma non è necessario:
      // i risultati sono cliccabili/tappabili appena compaiono.
      if (event.key === "Enter" && results && !results.hidden) {
        const first = Array.from(results.querySelectorAll(".hv-event-picker-option"))
          .find((option) => !option.hidden && option.dataset.selected !== "1");
        if (first) {
          event.preventDefault();
          first.click();
        }
      }
    });

    panel.addEventListener("focusout", (event) => {
      const picker = event.target.closest(".hv-event-picker");
      if (!picker) return;
      setTimeout(() => {
        if (!picker.contains(document.activeElement)) {
          const results = picker.querySelector(".hv-event-picker-results");
          if (results) results.hidden = true;
        }
      }, 0);
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
        const precedente = existingIndex >= 0 ? payload.partite[existingIndex] : null;
        const next = {
          ...(precedente || {}),
          matchId: key,
          giornata: Number(match.matchday) || precedente?.giornata || null,
          data: match.data || precedente?.data || null,
          casaCodice: match.casaCodice || precedente?.casaCodice || "",
          trasfertaCodice: match.trasfertaCodice || precedente?.trasfertaCodice || "",
          casaNome: match.casaNome || precedente?.casaNome || "",
          trasfertaNome: match.trasfertaNome || precedente?.trasfertaNome || "",
          golCasa: match.golCasa != null ? Number(match.golCasa) : (precedente?.golCasa ?? null),
          golTrasferta: match.golTrasferta != null ? Number(match.golTrasferta) : (precedente?.golTrasferta ?? null),
          stato: match.live ? "LIVE" : match.finita ? "FINALE" : (precedente?.stato || "PROGRAMMATA"),
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
    renderMatchSummary,
    buildAdminControl,
  };
})();
