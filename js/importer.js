// ===== Importazione rose da CSV =====
const HV_ALIAS = {
  fantasquadra: ["fantasquadra", "squadra"],
  nome: ["calciatore", "giocatore", "nome"],
  ruolo: ["ruolo", "r", "rm"],
  squadraReale: ["squadra_serie_a", "squadraseriea", "squadra serie a", "sq serie a", "club", "squadra reale"],
  costo: ["prezzo", "costo", "pagato", "crediti"],
};

const HV_RUOLO_MAP = {
  P: "POR", POR: "POR",
  D: "DIF", DIF: "DIF",
  C: "CEN", CEN: "CEN", M: "CEN",
  A: "ATT", ATT: "ATT",
};

function hv_trovaColonna(headers, alias) {
  const norm = headers.map((h) => h.trim().toLowerCase());
  for (const a of alias) {
    const idx = norm.indexOf(a);
    if (idx !== -1) return headers[idx];
  }
  return null;
}

let hv_configCorrente = null;
let hv_gruppiRilevati = null;

async function hv_caricaConfig() {
  const res = await fetch("data/config.json");
  hv_configCorrente = await res.json();
}

document.getElementById("csv-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const estensione = file.name.split(".").pop().toLowerCase();

  if (estensione === "xlsx" || estensione === "xls") {
    hv_leggiExcelRose(file);
  } else {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        await hv_processaCSV(results.data, results.meta.fields);
      },
    });
  }
});

// Stesso "motore unico": qualunque sia il formato (CSV o Excel), il resto
// della pipeline (hv_processaCSV) resta identico — legge solo righe con
// intestazione, non gli importa da dove arrivano.
function hv_leggiExcelRose(file) {
  const avviso = document.getElementById("csv-avviso");
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const wb = XLSX.read(ev.target.result, { type: "array" });
      const foglio = wb.Sheets[wb.SheetNames[0]];
      const righe = XLSX.utils.sheet_to_json(foglio, { defval: "" });
      const headers = righe.length > 0 ? Object.keys(righe[0]) : [];
      await hv_processaCSV(righe, headers);
    } catch (err) {
      avviso.textContent = "Non riesco a leggere questo file Excel: " + err.message;
    }
  };
  reader.onerror = () => { avviso.textContent = "Errore nella lettura del file."; };
  reader.readAsArrayBuffer(file);
}

async function hv_processaCSV(rows, headers) {
  if (!hv_configCorrente) await hv_caricaConfig();

  const colFantasquadra = hv_trovaColonna(headers, HV_ALIAS.fantasquadra);
  const colNome = hv_trovaColonna(headers, HV_ALIAS.nome);
  const colRuolo = hv_trovaColonna(headers, HV_ALIAS.ruolo);
  const colSquadraReale = hv_trovaColonna(headers, HV_ALIAS.squadraReale);
  const colCosto = hv_trovaColonna(headers, HV_ALIAS.costo);

  const avviso = document.getElementById("csv-avviso");
  if (!colFantasquadra || !colNome) {
    avviso.textContent =
      "Non trovo le colonne Fantasquadra/Squadra o Calciatore/Giocatore nel file. Controlla l'intestazione del CSV.";
    return;
  }
  avviso.textContent = "";

  // forward-fill sulla colonna fantasquadra (alcuni export la valorizzano solo sulla prima riga di ogni rosa)
  let ultimaFantasquadra = "";
  const gruppi = {};

  rows.forEach((r) => {
    const fs = (r[colFantasquadra] || "").trim();
    if (fs) ultimaFantasquadra = fs;
    const chiave = ultimaFantasquadra;
    if (!chiave) return;

    if (!gruppi[chiave]) gruppi[chiave] = [];

    const nome = (r[colNome] || "").trim();
    if (!nome) return;

    const ruoloRaw = colRuolo ? (r[colRuolo] || "").trim().toUpperCase() : "";
    const ruolo = HV_RUOLO_MAP[ruoloRaw] || "";
    const squadraReale = colSquadraReale ? (r[colSquadraReale] || "").trim() : "";
    const costoRaw = colCosto ? (r[colCosto] || "").trim() : "";
    const costo = costoRaw ? Number(costoRaw.replace(",", ".")) || costoRaw : "";

    gruppi[chiave].push({ ruolo, nome, squadraReale, costo });
  });

  hv_gruppiRilevati = gruppi;
  hv_mostraAssociazioni(gruppi);
}

function hv_mostraAssociazioni(gruppi) {
  const wrap = document.getElementById("csv-associazioni");
  wrap.innerHTML = "";
  wrap.classList.remove("hidden");

  Object.keys(gruppi).forEach((nomeCSV) => {
    const riga = document.createElement("div");
    riga.className = "assoc-row";

    const opzioni = hv_configCorrente.squadre
      .map((s) => {
        const preselezionata =
          s.nomeFantasquadra.trim().toLowerCase() === nomeCSV.trim().toLowerCase();
        return `<option value="${s.id}" ${preselezionata ? "selected" : ""}>${s.nomeReale} (${s.nomeFantasquadra})</option>`;
      })
      .join("");

    riga.innerHTML = `
      <span class="assoc-csv">${nomeCSV}</span>
      <span class="assoc-arrow">→</span>
      <select class="assoc-select" data-csv="${nomeCSV}">
        <option value="">-- non importare --</option>
        ${opzioni}
      </select>
      <span class="assoc-count muted">${gruppi[nomeCSV].length} giocatori</span>
    `;
    wrap.appendChild(riga);
  });

  document.getElementById("csv-conferma").classList.remove("hidden");
  document.getElementById("csv-salva-github").classList.remove("hidden");
}

function hv_costruisciRoseOutput() {
  const selects = document.querySelectorAll(".assoc-select");
  const rose = [];
  selects.forEach((sel) => {
    const squadraId = sel.value;
    if (!squadraId) return;
    const nomeCSV = sel.dataset.csv;
    rose.push({ squadraId, giocatori: hv_gruppiRilevati[nomeCSV] });
  });
  return { _leggimi: "Generato da admin.html — carica questo file al posto di data/rose.json", rose };
}

document.getElementById("csv-conferma").addEventListener("click", () => {
  const output = hv_costruisciRoseOutput();
  const testo = JSON.stringify(output, null, 2);

  document.getElementById("csv-output").value = testo;
  document.getElementById("csv-output-wrap").classList.remove("hidden");

  const blob = new Blob([testo], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.getElementById("csv-download");
  link.href = url;
  link.classList.remove("hidden");
});

document.getElementById("csv-salva-github").addEventListener("click", async () => {
  const stato = document.getElementById("csv-stato-github");
  stato.textContent = "Salvataggio in corso...";
  stato.style.color = "var(--text-muted)";
  try {
    const output = hv_costruisciRoseOutput();
    await hv_ghSalvaJSON("data/rose.json", output, "Aggiorna rose.json da admin.html (import CSV)", hv_configCorrente);
    stato.textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
    stato.style.color = "var(--verde-prato)";
  } catch (err) {
    stato.textContent = "Errore: " + err.message;
    stato.style.color = "var(--wine-bright)";
  }
});
