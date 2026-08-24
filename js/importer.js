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

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      await hv_processaCSV(results.data, results.meta.fields);
    },
  });
});

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
}

document.getElementById("csv-conferma").addEventListener("click", () => {
  const selects = document.querySelectorAll(".assoc-select");
  const rose = [];

  selects.forEach((sel) => {
    const squadraId = sel.value;
    if (!squadraId) return;
    const nomeCSV = sel.dataset.csv;
    rose.push({ squadraId, giocatori: hv_gruppiRilevati[nomeCSV] });
  });

  const output = { _leggimi: "Generato da admin.html — carica questo file al posto di data/rose.json", rose };
  const testo = JSON.stringify(output, null, 2);

  document.getElementById("csv-output").value = testo;
  document.getElementById("csv-output-wrap").classList.remove("hidden");

  const blob = new Blob([testo], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.getElementById("csv-download");
  link.href = url;
  link.classList.remove("hidden");
});
