(() => {
  const ROOT = "../";
  let hvRosterConfig = null;
  let hvRosterGroups = null;
  let hvRosterRoleWarning = "";

  const $ = id => document.getElementById(id);
  const esc = (v = "") => String(v).replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[c]));

  async function loadConfig() {
    if (hvRosterConfig) return hvRosterConfig;
    const res = await fetch("data/config.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`config.json: ${res.status}`);
    hvRosterConfig = await res.json();
    return hvRosterConfig;
  }

  function styleKey(ws, rowIndex, colIndex) {
    const ref = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    const cell = ws[ref];
    const fill = cell?.s?.fill;
    const color = fill?.fgColor || fill?.bgColor || {};
    return [fill?.patternType || "", color.rgb || "", color.indexed ?? "", color.theme ?? "", color.tint ?? ""].join("|");
  }

  function roleMapForRows(ws, playerRows, firstTeamCol) {
    if (!playerRows.length) return new Map();
    const segments = [];
    let last = null;
    for (const rowIndex of playerRows) {
      const key = styleKey(ws, rowIndex, firstTeamCol);
      if (!segments.length || key !== last) segments.push({ key, rows: [] });
      segments[segments.length - 1].rows.push(rowIndex);
      last = key;
    }

    const roles = ["POR", "DIF", "CEN", "ATT"];
    const out = new Map();
    if (segments.length === 4 && segments.every(s => s.key)) {
      segments.forEach((segment, i) => segment.rows.forEach(r => out.set(r, roles[i])));
      hvRosterRoleWarning = "Ruoli letti dai quattro blocchi colore dell'Excel (portieri, difensori, centrocampisti, attaccanti).";
      return out;
    }

    // Fallback compatibile con il layout del file campione: 4 POR, 8 DIF, 8 CEN, 6 ATT.
    if (playerRows.length === 26) {
      const cuts = [4, 12, 20, 26];
      playerRows.forEach((r, i) => out.set(r, i < cuts[0] ? "POR" : i < cuts[1] ? "DIF" : i < cuts[2] ? "CEN" : "ATT"));
      hvRosterRoleWarning = "Ruoli ricavati dalla struttura 4/8/8/6 del file campione perché i colori non erano leggibili dal browser.";
      return out;
    }

    hvRosterRoleWarning = "Il file non espone una colonna Ruolo e il layout non corrisponde al campione: i ruoli restano vuoti, senza inventarli.";
    return out;
  }

  function detectTeamColumns(matrix) {
    const header = matrix[0] || [];
    const cols = [];
    for (let c = 0; c < header.length; c++) {
      const name = String(header[c] ?? "").trim();
      const next = String(header[c + 1] ?? "").trim().toLowerCase();
      if (name && next === "costo") cols.push(c);
    }
    return cols;
  }

  function findTotalRow(matrix, teamCols) {
    for (let r = 1; r < matrix.length; r++) {
      if (teamCols.some(c => String(matrix[r]?.[c] ?? "").trim().toLowerCase() === "totale")) return r;
    }
    return matrix.length;
  }

  async function parseWorkbook(file) {
    const config = await loadConfig();
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", cellStyles: true });
    const sheetName = wb.SheetNames.includes("ROSE") ? "ROSE" : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    const teamCols = detectTeamColumns(matrix);
    if (!teamCols.length) throw new Error("Non trovo blocchi 'Nome squadra | costo' nel primo foglio.");

    const totalRow = findTotalRow(matrix, teamCols);
    const playerRows = [];
    for (let r = 1; r < totalRow; r++) {
      if (teamCols.some(c => String(matrix[r]?.[c] ?? "").trim())) playerRows.push(r);
    }
    const roleByRow = roleMapForRows(ws, playerRows, teamCols[0]);

    const groups = {};
    const totals = {};
    for (const c of teamCols) {
      const teamName = String(matrix[0]?.[c] ?? "").trim();
      if (!teamName) continue;
      const players = [];
      for (const r of playerRows) {
        const name = String(matrix[r]?.[c] ?? "").trim();
        if (!name) continue;
        const rawCost = matrix[r]?.[c + 1];
        const numeric = typeof rawCost === "number" ? rawCost : Number(String(rawCost ?? "").replace(",", "."));
        players.push({
          ruolo: roleByRow.get(r) || "",
          nome: name,
          squadraReale: "",
          costo: Number.isFinite(numeric) ? numeric : ""
        });
      }
      groups[teamName] = players;
      const rawTotal = matrix[totalRow]?.[c + 1];
      const total = typeof rawTotal === "number" ? rawTotal : Number(String(rawTotal ?? "").replace(",", "."));
      totals[teamName] = Number.isFinite(total) ? total : null;
    }

    hvRosterGroups = groups;
    renderAssociations(groups, totals, config, sheetName);
  }

  function renderAssociations(groups, totals, config, sheetName) {
    const wrap = $("csv-associazioni");
    const avviso = $("csv-avviso");
    wrap.innerHTML = "";
    wrap.classList.remove("hidden");

    const names = Object.keys(groups);
    avviso.textContent = `${sheetName}: ${names.length} fantasquadre rilevate. ${hvRosterRoleWarning} Il club reale non è presente in questo export e resta vuoto.`;

    names.forEach(name => {
      const row = document.createElement("div");
      row.className = "assoc-row";
      const options = (config.squadre || []).map(s => {
        const exact = String(s.nomeFantasquadra || "").trim().toLowerCase() === name.toLowerCase();
        return `<option value="${esc(s.id)}" ${exact ? "selected" : ""}>${esc(s.nomeReale)} (${esc(s.nomeFantasquadra)})</option>`;
      }).join("");
      const total = totals[name];
      row.innerHTML = `
        <span class="assoc-csv">${esc(name)}</span>
        <span class="assoc-arrow">→</span>
        <select class="assoc-select" data-csv="${esc(name)}">
          <option value="">-- non importare --</option>${options}
        </select>
        <span class="assoc-count muted">${groups[name].length} giocatori${total !== null ? ` · ${total} crediti` : ""}</span>`;
      wrap.appendChild(row);
    });

    $("csv-conferma").classList.remove("hidden");
    $("csv-salva-github").classList.remove("hidden");
  }

  function buildOutput() {
    const rose = [];
    document.querySelectorAll(".assoc-select").forEach(sel => {
      const squadraId = sel.value;
      if (!squadraId) return;
      const sourceName = sel.dataset.csv;
      rose.push({ squadraId, giocatori: hvRosterGroups[sourceName] || [] });
    });
    return {
      _leggimi: "Generato dal Control Center Hertavernello tramite import Excel rose (.xlsx/.xls). I club reali restano vuoti se non presenti nell'export.",
      rose
    };
  }

  function setupUi() {
    const module = document.querySelector('[data-admin-view="rose"]');
    if (!module) return;
    const heading = module.querySelector('.module-head h2');
    const intro = module.querySelector('.module-head p');
    const label = module.querySelector('label[for="csv-file"]');
    if (heading) heading.textContent = "Importa rose da Excel";
    if (intro) intro.textContent = "Dopo l’asta carica l’export .xlsx/.xls di leghe.fantacalcio.it e verifica le associazioni.";
    if (label) {
      const strong = label.querySelector('strong');
      const span = label.querySelector('span');
      if (strong) strong.textContent = "Seleziona Excel rose";
      if (span) span.textContent = "Blocchi squadra: nome giocatore, costo e separatore";
    }

    const oldInput = $("csv-file");
    if (!oldInput) return;
    const input = oldInput.cloneNode(true); // rimuove il vecchio listener CSV senza toccare gli script ufficiali root
    input.accept = ".xlsx,.xls";
    oldInput.replaceWith(input);

    input.addEventListener("change", async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      $("csv-avviso").textContent = "Analisi Excel in corso…";
      $("csv-associazioni").classList.add("hidden");
      $("csv-conferma").classList.add("hidden");
      $("csv-salva-github").classList.add("hidden");
      try { await parseWorkbook(file); }
      catch (err) { $("csv-avviso").textContent = `Errore import Excel: ${err.message}`; }
    });

    // Sostituiamo i vecchi handler CSV dei due pulsanti clonando anche loro.
    const confirmOld = $("csv-conferma");
    const confirm = confirmOld.cloneNode(true);
    confirmOld.replaceWith(confirm);
    confirm.addEventListener("click", () => {
      const output = buildOutput();
      const text = JSON.stringify(output, null, 2);
      $("csv-output").value = text;
      $("csv-output-wrap").classList.remove("hidden");
      const blob = new Blob([text], { type: "application/json" });
      const link = $("csv-download");
      link.href = URL.createObjectURL(blob);
      link.classList.remove("hidden");
    });

    const saveOld = $("csv-salva-github");
    const save = saveOld.cloneNode(true);
    saveOld.replaceWith(save);
    save.addEventListener("click", async () => {
      const status = $("csv-stato-github");
      status.textContent = "Salvataggio in corso…";
      try {
        const config = await loadConfig();
        await hv_ghSalvaJSON("data/rose.json", buildOutput(), "Aggiorna rose.json da Admin preview (import Excel)", config);
        status.textContent = "Salvato ✓ — rose.json aggiornato.";
      } catch (err) {
        status.textContent = `Errore: ${err.message}`;
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupUi);
  else setupUi();
})();
