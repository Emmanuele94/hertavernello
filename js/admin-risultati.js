let hv_risConfig = null;
let hv_risCalendario = null;
let hv_risEsistenti = [];
let hv_risImmagine = null; // { dataUrl, img }
let hv_risAnteprima = null; // { partite, metodo }
let hv_risMetodoAttivo = "screenshot";

async function hv_initRisultatiForm() {
  const [configRes, calRes, risRes] = await Promise.all([
    fetch("data/config.json"),
    fetch("data/calendario.json"),
    fetch("data/risultati.json"),
  ]);
  hv_risConfig = await configRes.json();
  hv_risCalendario = (await calRes.json()).giornate || [];
  hv_risEsistenti = (await risRes.json()).risultati || [];

  hv_wireTabRisultati();
  hv_wireScreenshotRisultati();
  hv_wireTestoRisultati();

  document.getElementById("ris-giornata").addEventListener("change", hv_rigeneraFormManuale);
  hv_rigeneraFormManuale();
}

function hv_giornataSelezionata() {
  return Number(document.getElementById("ris-giornata").value) || null;
}

function hv_accoppiamentiGiornata(matchday) {
  const g = hv_risCalendario.find((x) => x.giornata === matchday);
  return g ? g.incontri.filter((c) => c.length === 2) : [];
}

// ===== Tab =====
function hv_wireTabRisultati() {
  const tabs = { screenshot: "ris-tab-screenshot", testo: "ris-tab-testo", manuale: "ris-tab-manuale" };
  Object.entries(tabs).forEach(([metodo, id]) => {
    document.getElementById(id).addEventListener("click", () => {
      hv_risMetodoAttivo = metodo;
      Object.entries(tabs).forEach(([m, i]) => document.getElementById(i).classList.toggle("ris-tab-attivo", m === metodo));
      ["screenshot", "testo", "manuale"].forEach((m) => document.getElementById("ris-metodo-" + m).classList.toggle("hidden", m !== metodo));
      if (metodo === "manuale") hv_rigeneraFormManuale();
    });
  });
}

// ===== Metodo manuale =====
function hv_rigeneraFormManuale() {
  const matchday = hv_giornataSelezionata();
  const wrap = document.getElementById("ris-manuale-righe");
  if (!matchday) {
    wrap.innerHTML = '<p class="desc">Scegli prima il numero di giornata qui sopra.</p>';
    return;
  }
  const accoppiamenti = hv_accoppiamentiGiornata(matchday);
  if (accoppiamenti.length === 0) {
    wrap.innerHTML = '<p class="desc">Nessun accoppiamento trovato nel calendario per questa giornata — controlla la sezione 5 qui sopra.</p>';
    return;
  }
  const nome = (id) => (hv_risConfig.squadre.find((s) => s.id === id) || {}).nomeFantasquadra || id;
  wrap.innerHTML = accoppiamenti
    .map(
      ([a, b], i) => `
    <div class="campo-riga" style="align-items:center; margin-bottom:8px;">
      <span style="flex:1; text-align:right;">${nome(a)}</span>
      <input type="number" step="0.5" class="ris-manuale-score" data-i="${i}" data-lato="home" style="width:70px;">
      <span class="muted">vs</span>
      <input type="number" step="0.5" class="ris-manuale-score" data-i="${i}" data-lato="away" style="width:70px;">
      <span style="flex:1;">${nome(b)}</span>
    </div>`
    )
    .join("");
  document.getElementById("ris-manuale-genera").onclick = () => {
    const partite = accoppiamenti.map(([a, b], i) => {
      const home = wrap.querySelector(`.ris-manuale-score[data-i="${i}"][data-lato="home"]`);
      const away = wrap.querySelector(`.ris-manuale-score[data-i="${i}"][data-lato="away"]`);
      const sqA = hv_risConfig.squadre.find((s) => s.id === a);
      const sqB = hv_risConfig.squadre.find((s) => s.id === b);
      return {
        homeNomeGrezzo: sqA.nomeFantasquadra,
        homeTeamId: sqA.id,
        homeNome: sqA.nomeFantasquadra,
        homeScore: home.value === "" ? null : parseFloat(home.value),
        awayNomeGrezzo: sqB.nomeFantasquadra,
        awayTeamId: sqB.id,
        awayNome: sqB.nomeFantasquadra,
        awayScore: away.value === "" ? null : parseFloat(away.value),
        confidenza: "esatta",
      };
    });
    hv_mostraAnteprimaRisultati(partite, "manual");
  };
}

// ===== Metodo testo =====
function hv_wireTestoRisultati() {
  document.getElementById("ris-analizza-testo").addEventListener("click", () => {
    const testo = document.getElementById("ris-textarea").value;
    hv_processaTestoRisultati(testo, "text");
  });
}

function hv_processaTestoRisultati(testo, metodo) {
  const { partite: grezze, righeNonRiconosciute } = hv_parseTestoRisultati(testo);
  const normalizzate = hv_normalizzaEValida(grezze, hv_risConfig.squadre);
  const stato = document.getElementById("ris-ocr-stato");
  stato.textContent = righeNonRiconosciute.length > 0 ? `${righeNonRiconosciute.length} riga/righe non nel formato atteso, ignorate.` : "";
  hv_mostraAnteprimaRisultati(normalizzate, metodo);
}

// ===== Metodo screenshot =====
function hv_wireScreenshotRisultati() {
  const dropzone = document.getElementById("ris-dropzone");
  const fileInput = document.getElementById("ris-file-input");

  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => { if (e.target.files[0]) hv_caricaImmagineRisultati(e.target.files[0]); });

  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("ris-dropzone-hover"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("ris-dropzone-hover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("ris-dropzone-hover");
    if (e.dataTransfer.files[0]) hv_caricaImmagineRisultati(e.dataTransfer.files[0]);
  });

  document.addEventListener("paste", (e) => {
    if (hv_risMetodoAttivo !== "screenshot" || hv_risImmagine) return;
    const items = (e.clipboardData || {}).items || [];
    for (const item of items) {
      if (item.type.startsWith("image/")) { hv_caricaImmagineRisultati(item.getAsFile()); break; }
    }
  });
}

function hv_caricaImmagineRisultati(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      hv_risImmagine = { dataUrl: reader.result, img };
      const anteprima = document.getElementById("ris-immagine-anteprima");
      anteprima.innerHTML = `
        <img src="${reader.result}" style="max-width:260px; border-radius:8px; margin-top:10px; display:block;">
        <button type="button" id="ris-rimuovi-img" style="margin-top:8px;">Rimuovi</button>
        <button type="button" id="ris-esegui-ocr" style="margin-top:8px; margin-left:8px;">Esegui OCR</button>
      `;
      document.getElementById("ris-rimuovi-img").onclick = () => { hv_risImmagine = null; anteprima.innerHTML = ""; };
      document.getElementById("ris-esegui-ocr").onclick = hv_avviaOCRRisultati;
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function hv_avviaOCRRisultati() {
  const stato = document.getElementById("ris-ocr-stato");
  stato.textContent = "Carico il motore OCR (solo la prima volta)...";
  try {
    const testoGrezzo = await hv_eseguiOCR(hv_risImmagine.img, (pct) => { stato.textContent = `Riconoscimento in corso... ${pct}%`; });
    stato.textContent = "OCR completato.";
    const testoCanonico = hv_ocrATestoCanonico(testoGrezzo, hv_risConfig.squadre);
    document.getElementById("ris-ocr-debug").innerHTML = `
      <button type="button" id="ris-mostra-ocr-debug">Mostra testo OCR (debug)</button>
      <pre id="ris-ocr-debug-testo" class="hidden" style="white-space:pre-wrap; font-size:11.5px; background:var(--bg-void); padding:10px; border-radius:6px;">${testoGrezzo.replace(/</g, "&lt;")}\n\n--- ricostruito ---\n${testoCanonico.replace(/</g, "&lt;")}</pre>
    `;
    document.getElementById("ris-mostra-ocr-debug").onclick = () => document.getElementById("ris-ocr-debug-testo").classList.toggle("hidden");
    hv_processaTestoRisultati(testoCanonico, "screenshot");
  } catch (err) {
    stato.textContent = "Errore OCR: " + err.message;
  }
}

// ===== Anteprima condivisa (i 3 metodi arrivano tutti qui) =====
function hv_iconaConfidenzaRis(c) {
  if (c === "esatta") return '<span style="color: var(--verde-prato);">✓ riconosciuto</span>';
  if (c === "fuzzy") return '<span style="color: var(--giallo-neon);">⚠ controlla</span>';
  return '<span style="color: var(--wine-bright);">✕ non riconosciuto</span>';
}

function hv_opzioniSquadreRis(selezionata) {
  return (
    '<option value="">— seleziona —</option>' +
    hv_risConfig.squadre.map((s) => `<option value="${s.id}"${s.id === selezionata ? " selected" : ""}>${s.nomeFantasquadra}</option>`).join("")
  );
}

function hv_mostraAnteprimaRisultati(partite, metodo) {
  hv_risAnteprima = { partite, metodo };
  hv_renderAnteprimaRisultati();
  const target = document.getElementById("ris-anteprima-wrap");
  if (target && typeof target.scrollIntoView === "function") target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hv_renderAnteprimaRisultati() {
  const wrap = document.getElementById("ris-anteprima-wrap");
  if (!hv_risAnteprima) { wrap.innerHTML = ""; return; }
  const matchday = hv_giornataSelezionata();
  const { partite } = hv_risAnteprima;

  if (!matchday) {
    wrap.innerHTML = '<p class="desc" style="color: var(--giallo-neon);">Scegli il numero di giornata prima di continuare.</p>';
    return;
  }

  const calendarioGiornata = hv_accoppiamentiGiornata(matchday);
  const problemi = hv_validaGiornata(partite, matchday, hv_risConfig.squadre, calendarioGiornata.length ? calendarioGiornata : null);
  const riconosciute = partite.filter((p) => p.homeTeamId && p.awayTeamId).length;

  wrap.innerHTML = `
    <div class="admin-box" style="background: var(--bg-void);">
      <p class="campo-titolo">Anteprima — Giornata ${matchday} (${riconosciute}/${partite.length} incontri riconosciuti)</p>
      ${partite
        .map(
          (p, i) => `
        <div class="campo-riga" style="align-items:center; margin-bottom:10px; flex-wrap:wrap;">
          <select data-i="${i}" data-lato="home" class="ris-select-squadra">${hv_opzioniSquadreRis(p.homeTeamId)}</select>
          <input type="number" step="0.5" value="${p.homeScore ?? ""}" data-i="${i}" data-lato="home" class="ris-input-punteggio" style="width:70px;">
          <span class="muted">vs</span>
          <input type="number" step="0.5" value="${p.awayScore ?? ""}" data-i="${i}" data-lato="away" class="ris-input-punteggio" style="width:70px;">
          <select data-i="${i}" data-lato="away" class="ris-select-squadra">${hv_opzioniSquadreRis(p.awayTeamId)}</select>
          ${hv_iconaConfidenzaRis(p.confidenza)}
        </div>`
        )
        .join("")}
      ${problemi.length > 0 ? problemi.map((m) => `<p class="csv-avviso">⚠ ${m}</p>`).join("") : ""}
      <button type="button" id="ris-annulla" style="margin-top: 10px;">Annulla</button>
      <button type="button" id="ris-salva-github" ${problemi.length > 0 ? "disabled" : ""} style="margin-top: 10px; margin-left: 8px; background: var(--giallo-neon); color: var(--bg-void);">Salva giornata su GitHub</button>
      <p id="ris-stato-github" style="font-size: 12px; margin-top: 8px;"></p>
    </div>
  `;

  wrap.querySelectorAll(".ris-select-squadra").forEach((sel) => {
    sel.addEventListener("change", () => {
      const i = Number(sel.dataset.i), lato = sel.dataset.lato;
      const sq = hv_risConfig.squadre.find((s) => s.id === sel.value);
      hv_risAnteprima.partite[i][lato + "TeamId"] = sq ? sq.id : null;
      hv_risAnteprima.partite[i][lato + "Nome"] = sq ? sq.nomeFantasquadra : "";
      hv_risAnteprima.partite[i].confidenza = "esatta";
      hv_renderAnteprimaRisultati();
    });
  });
  wrap.querySelectorAll(".ris-input-punteggio").forEach((inp) => {
    inp.addEventListener("input", () => {
      const i = Number(inp.dataset.i), lato = inp.dataset.lato;
      hv_risAnteprima.partite[i][lato + "Score"] = inp.value === "" ? null : parseFloat(inp.value);
    });
  });
  document.getElementById("ris-annulla").addEventListener("click", () => { hv_risAnteprima = null; hv_risImmagine = null; wrap.innerHTML = ""; document.getElementById("ris-immagine-anteprima").innerHTML = ""; });

  const salvaBtn = document.getElementById("ris-salva-github");
  if (salvaBtn) {
    salvaBtn.addEventListener("click", async () => {
      const stato = document.getElementById("ris-stato-github");
      stato.textContent = "Salvataggio in corso...";
      stato.style.color = "var(--text-muted)";
      try {
        const senzaGiornata = hv_risEsistenti.filter((r) => r.matchday !== matchday);
        const nuovi = hv_risAnteprima.partite.map((p) => ({
          matchday,
          homeTeamId: p.homeTeamId,
          homeScore: p.homeScore,
          awayTeamId: p.awayTeamId,
          awayScore: p.awayScore,
          importMethod: hv_risAnteprima.metodo,
          savedAt: new Date().toISOString(),
        }));
        hv_risEsistenti = [...senzaGiornata, ...nuovi];
        const output = {
          _leggimi: "Risultati di giornata della lega, confermati da admin.html sezione Aggiorna risultati. Da qui si calcolano automaticamente classifica lega, strisce, record e news.",
          risultati: hv_risEsistenti,
        };
        await hv_ghSalvaJSON("data/risultati.json", output, `Aggiorna risultati giornata ${matchday} da admin.html`, hv_risConfig);
        stato.textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
        stato.style.color = "var(--verde-prato)";
      } catch (err) {
        stato.textContent = "Errore: " + err.message;
        stato.style.color = "var(--wine-bright)";
      }
    });
  }
}
