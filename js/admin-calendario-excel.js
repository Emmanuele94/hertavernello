// Import automatico del calendario di lega dal file Excel esportato da
// leghe.fantacalcio.it (pagina "fantaufficio-buste-chiuse" o simile).
// Il file riporta già, per ogni blocco, sia il numero di giornata di lega
// sia il numero REALE di giornata di Serie A corrispondente — leggiamo
// direttamente quest'ultimo, senza bisogno di calcolare offset a mano.

let hv_calendarioExcelRilevato = null;

function hv_trovaSquadraIdDaFantasquadra(nomeGrezzo) {
  if (!nomeGrezzo) return null;
  const norm = nomeGrezzo.toString().trim().toLowerCase();
  const match = hv_configCalendario.squadre.find(
    (s) => s.nomeFantasquadra.trim().toLowerCase() === norm
  );
  return match ? match.id : null;
}

function hv_parseCalendarioExcel(righe) {
  const giornate = {}; // { numeroReale: { incontri: [[idA,idB],...], nonAbbinati: Set } }
  const REGEX_LEGA = /giornata lega/i;
  const REGEX_SERIEA = /(\d+)\D*giornata\s*serie\s*a/i;

  function leggiCoppia(riga, colA, colB, numeroReale) {
    const nomeA = (riga[colA] ?? "").toString().trim();
    const nomeB = (riga[colB] ?? "").toString().trim();
    if (!nomeA || !nomeB || nomeA === "-" || nomeB === "-") return;

    if (!giornate[numeroReale]) giornate[numeroReale] = { incontri: [], nonAbbinati: new Set() };

    const idA = hv_trovaSquadraIdDaFantasquadra(nomeA);
    const idB = hv_trovaSquadraIdDaFantasquadra(nomeB);
    if (!idA) giornate[numeroReale].nonAbbinati.add(nomeA);
    if (!idB) giornate[numeroReale].nonAbbinati.add(nomeB);
    if (idA && idB) giornate[numeroReale].incontri.push([idA, idB]);
  }

  let giornataSinistra = null;
  let giornataDestra = null;

  righe.forEach((riga) => {
    const c0 = (riga[0] ?? "").toString();
    const c2 = (riga[2] ?? "").toString();
    const c6 = (riga[6] ?? "").toString();
    const c8 = (riga[8] ?? "").toString();

    const matchSx = REGEX_LEGA.test(c0) && c2.match(REGEX_SERIEA);
    const matchDx = REGEX_LEGA.test(c6) && c8.match(REGEX_SERIEA);

    if (matchSx || matchDx) {
      giornataSinistra = matchSx ? Number(matchSx[1]) : null;
      giornataDestra = matchDx ? Number(matchDx[1]) : null;
      return;
    }

    if (giornataSinistra) leggiCoppia(riga, 0, 3, giornataSinistra);
    if (giornataDestra) leggiCoppia(riga, 6, 9, giornataDestra);
  });

  return giornate;
}

document.getElementById("cal-excel-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const wb = XLSX.read(ev.target.result, { type: "array" });
    const foglio = wb.Sheets[wb.SheetNames[0]];
    const righe = XLSX.utils.sheet_to_json(foglio, { header: 1 });

    hv_calendarioExcelRilevato = hv_parseCalendarioExcel(righe);
    hv_mostraAnteprimaCalendarioExcel();
  };
  reader.readAsArrayBuffer(file);
});

function hv_mostraAnteprimaCalendarioExcel() {
  const wrap = document.getElementById("cal-excel-anteprima");
  const numeri = Object.keys(hv_calendarioExcelRilevato)
    .map(Number)
    .sort((a, b) => a - b);

  if (numeri.length === 0) {
    wrap.innerHTML = '<p class="csv-avviso">Non ho trovato nessuna giornata riconoscibile in questo file — controlla che sia l\'export giusto.</p>';
    document.getElementById("cal-excel-conferma").classList.add("hidden");
    return;
  }

  const tuttiNonAbbinati = new Set();
  numeri.forEach((n) => hv_calendarioExcelRilevato[n].nonAbbinati.forEach((x) => tuttiNonAbbinati.add(x)));

  let html = `<p class="desc" style="margin: 10px 0;">Trovate <strong>${numeri.length}</strong> giornate reali: dalla ${numeri[0]}ª alla ${numeri[numeri.length - 1]}ª.</p>`;

  if (tuttiNonAbbinati.size > 0) {
    html += `<p class="csv-avviso">Attenzione: questi nomi squadra nel file non corrispondono a nessun "nomeFantasquadra" in config.json, quelle partite specifiche NON verranno importate — correggi il nome in config.json (sezione 1) se vuoi includerle: <strong>${[...tuttiNonAbbinati].join(", ")}</strong></p>`;
  }

  html += '<div style="max-height: 200px; overflow-y: auto; margin-top: 10px; font-size: 12px;">';
  numeri.forEach((n) => {
    const g = hv_calendarioExcelRilevato[n];
    const desc = g.incontri.map(([a, b]) => `${hv_nomeSquadraById(a)} vs ${hv_nomeSquadraById(b)}`).join(" · ");
    html += `<p style="margin: 4px 0;"><strong>Giornata ${n}</strong> — ${desc || "(nessun abbinamento valido)"}</p>`;
  });
  html += "</div>";

  wrap.innerHTML = html;
  document.getElementById("cal-excel-conferma").classList.remove("hidden");
}

document.getElementById("cal-excel-conferma").addEventListener("click", () => {
  const numeri = Object.keys(hv_calendarioExcelRilevato).map(Number);
  numeri.forEach((n) => {
    const incontri = hv_calendarioExcelRilevato[n].incontri;
    if (incontri.length === 0) return;
    hv_calendarioBozza = hv_calendarioBozza.filter((g) => g.giornata !== n);
    hv_calendarioBozza.push({ giornata: n, incontri });
  });
  hv_renderBozzaCalendario();
  document.getElementById("cal-excel-anteprima").innerHTML = '<p style="color: var(--verde-prato); font-size: 13px;">Giornate aggiunte alla lista qui sotto ✓ — ricordati di generare/salvare il file per renderle definitive.</p>';
  document.getElementById("cal-excel-conferma").classList.add("hidden");
});
