(() => {
  "use strict";

  let stato = null;
  let config = null;
  let roseData = null;
  let giocatoriDb = [];
  let initialized = false;

  function esc(v) {
    return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function countEvents(record) {
    let totale = 0;
    (record?.eventi || []).forEach((entry) => {
      Object.values(entry.eventi || {}).forEach((n) => { totale += Number(n) || 0; });
    });
    return totale;
  }

  function recordToMatch(record) {
    return {
      id: record.matchId,
      matchday: Number(record.giornata) || null,
      data: record.data || null,
      casaCodice: record.casaCodice || "",
      trasfertaCodice: record.trasfertaCodice || "",
      casaNome: record.casaNome || record.casaCodice || "Casa",
      trasfertaNome: record.trasfertaNome || record.trasfertaCodice || "Trasferta",
      golCasa: record.golCasa != null ? Number(record.golCasa) : null,
      golTrasferta: record.golTrasferta != null ? Number(record.golTrasferta) : null,
      live: record.stato === "LIVE",
      finita: record.stato === "FINALE",
    };
  }

  function sortedRecords() {
    return [...(stato?.partite || [])].sort((a, b) => {
      const ga = Number(a.giornata) || 0, gb = Number(b.giornata) || 0;
      if (ga !== gb) return gb - ga;
      return String(b.data || b.aggiornatoIl || "").localeCompare(String(a.data || a.aggiornatoIl || ""));
    });
  }

  function renderList() {
    const list = document.getElementById("admin-eventi-archivio-list");
    const editor = document.getElementById("admin-eventi-archivio-editor");
    if (!list || !editor) return;
    editor.innerHTML = "";
    const records = sortedRecords();
    if (!records.length) {
      list.innerHTML = '<p class="empty-state">Nessun evento storico salvato. Le partite compariranno qui dopo il primo salvataggio da “Chi gioca contro chi”.</p>';
      return;
    }

    list.innerHTML = records.map((r, i) => {
      const score = r.golCasa != null && r.golTrasferta != null ? `${r.golCasa} - ${r.golTrasferta}` : "–";
      const eventi = countEvents(r);
      return `
        <article class="admin-eventi-archive-row">
          <div class="admin-eventi-archive-meta">
            <span>Giornata ${r.giornata ?? "–"}</span>
            <small>${eventi} evento${eventi === 1 ? "" : "i"} registrato${eventi === 1 ? "" : "i"}</small>
          </div>
          <div class="admin-eventi-archive-match">
            <span class="admin-eventi-team"><img src="assets/loghi/${esc(r.casaCodice)}.png" alt="">${esc(r.casaNome || r.casaCodice)}</span>
            <strong>${score}</strong>
            <span class="admin-eventi-team admin-eventi-team-away">${esc(r.trasfertaNome || r.trasfertaCodice)}<img src="assets/loghi/${esc(r.trasfertaCodice)}.png" alt=""></span>
          </div>
          <button type="button" class="admin-eventi-edit" data-record-index="${i}">✏️ Modifica eventi</button>
        </article>`;
    }).join("");

    list.querySelectorAll(".admin-eventi-edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        const record = records[Number(btn.dataset.recordIndex)];
        if (record) openEditor(record);
      });
    });
  }

  function openEditor(record) {
    const editor = document.getElementById("admin-eventi-archivio-editor");
    if (!editor || !window.HVMatchEvents) return;
    editor.innerHTML = "";
    const title = document.createElement("div");
    title.className = "admin-eventi-editor-title";
    title.innerHTML = `<strong>Modifica: ${esc(record.casaNome || record.casaCodice)} vs ${esc(record.trasfertaNome || record.trasfertaCodice)}</strong><button type="button" id="admin-eventi-editor-close">Chiudi</button>`;
    editor.appendChild(title);
    const control = window.HVMatchEvents.buildAdminControl({
      match: recordToMatch(record),
      giocatoriDb,
      config,
      roseData,
      data: stato,
      standalone: true,
      openInitially: true,
      onSaved: (payload) => {
        stato = payload;
        renderList();
      },
    });
    if (control) editor.appendChild(control);
    document.getElementById("admin-eventi-editor-close")?.addEventListener("click", () => { editor.innerHTML = ""; });
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function reload() {
    const status = document.getElementById("admin-eventi-archivio-stato");
    if (status) status.textContent = "Carico archivio eventi…";
    try {
      const [configRes, roseRes, giocatoriRes, eventi] = await Promise.all([
        fetch("data/config.json", { cache: "no-store" }),
        fetch("data/rose.json", { cache: "no-store" }),
        fetch("data/giocatori.json", { cache: "no-store" }),
        window.HVMatchEvents.load(),
      ]);
      config = await configRes.json();
      roseData = await roseRes.json();
      giocatoriDb = await giocatoriRes.json();
      if (!Array.isArray(giocatoriDb)) giocatoriDb = giocatoriDb.giocatori || [];
      stato = eventi;
      renderList();
      if (status) status.textContent = `${(stato.partite || []).length} partite archiviate.`;
    } catch (err) {
      if (status) status.textContent = `Errore: ${err.message}`;
    }
  }

  function init() {
    if (initialized || window.hv_role !== "admin") return;
    const root = document.getElementById("admin-eventi-archivio");
    if (!root || !window.HVMatchEvents) return;
    initialized = true;
    document.getElementById("admin-eventi-archivio-refresh")?.addEventListener("click", reload);
    reload();
  }

  window.hv_initAdminEventiPartite = init;
})();
