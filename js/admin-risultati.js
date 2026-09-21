let hv_risConfig = null;
let hv_risCalendario = null;
let hv_risEsistenti = [];
let hv_risImmagine = null; // { dataUrl, img }
let hv_risAnteprima = null; // { partite, metodo }
let hv_risMetodoAttivo = "screenshot";

async function hv_initRisultatiForm() {
  const [configRes, calRes, risRes] = await Promise.all([
    fetch("data/config.json", { cache: "no-store" }),
    fetch("data/calendario.json", { cache: "no-store" }),
    fetch("data/risultati.json", { cache: "no-store" }),
  ]);
  hv_risConfig = await configRes.json();
  hv_risCalendario = (await calRes.json()).giornate || [];
  hv_risEsistenti = (await risRes.json()).risultati || [];

  hv_wireTabRisultati();
  hv_wireScreenshotRisultati();
  hv_wireTestoRisultati();

  document.getElementById("ris-giornata").addEventListener("change", () => {
    hv_risAnteprima = null;
    document.getElementById("ris-anteprima-wrap").innerHTML = "";
    hv_rigeneraFormManuale();
  });
  hv_rigeneraFormManuale();
}

function hv_giornataSelezionata() {
  return Number(document.getElementById("ris-giornata").value) || null;
}

function hv_accoppiamentiGiornata(matchday) {
  const g = hv_risCalendario.find((x) => Number(x.giornata) === Number(matchday));
  return g ? (g.incontri || []).filter((c) => c.length === 2) : [];
}

function hv_squadraRis(id) {
  return (hv_risConfig?.squadre || []).find((s) => s.id === id) || null;
}

function hv_nomeSquadraRis(id) {
  const s = hv_squadraRis(id);
  return s?.nomeFantasquadra || id;
}

function hv_invertiPartitaRis(p) {
  return {
    ...p,
    homeNomeGrezzo: p.awayNomeGrezzo,
    homeTeamId: p.awayTeamId,
    homeNome: p.awayNome,
    homeScore: p.awayScore,
    homeGoals: p.awayGoals,
    homeGoalsSource: p.awayGoalsSource,
    awayNomeGrezzo: p.homeNomeGrezzo,
    awayTeamId: p.homeTeamId,
    awayNome: p.homeNome,
    awayScore: p.homeScore,
    awayGoals: p.homeGoals,
    awayGoalsSource: p.homeGoalsSource,
  };
}

function hv_partiteEsistentiPerCalendario(matchday) {
  const accoppiamenti = hv_accoppiamentiGiornata(matchday);
  const esistenti = hv_risEsistenti.filter((r) => Number(r.matchday) === Number(matchday));
  return accoppiamenti.map(([a, b]) => {
    let r = esistenti.find((x) => x.homeTeamId === a && x.awayTeamId === b);
    let invertita = false;
    if (!r) {
      r = esistenti.find((x) => x.homeTeamId === b && x.awayTeamId === a);
      invertita = !!r;
    }
    const sqA = hv_squadraRis(a);
    const sqB = hv_squadraRis(b);
    const homeScore = r ? (invertita ? r.awayScore : r.homeScore) : null;
    const awayScore = r ? (invertita ? r.homeScore : r.awayScore) : null;
    const homeGoals = r ? (invertita ? hv_golRisultato(r, "away") : hv_golRisultato(r, "home")) : null;
    const awayGoals = r ? (invertita ? hv_golRisultato(r, "home") : hv_golRisultato(r, "away")) : null;
    return {
      homeNomeGrezzo: sqA?.nomeFantasquadra || a,
      homeTeamId: a,
      homeNome: sqA?.nomeFantasquadra || a,
      homeScore,
      homeGoals,
      homeGoalsSource: r?.homeGoals != null ? ((invertita ? r.awayGoalsSource : r.homeGoalsSource) || "salvato") : "calcolato",
      awayNomeGrezzo: sqB?.nomeFantasquadra || b,
      awayTeamId: b,
      awayNome: sqB?.nomeFantasquadra || b,
      awayScore,
      awayGoals,
      awayGoalsSource: r?.awayGoals != null ? ((invertita ? r.homeGoalsSource : r.awayGoalsSource) || "salvato") : "calcolato",
      confidenza: "esatta",
    };
  });
}

function hv_completaPartiteDaCalendario(partite, matchday) {
  const accoppiamenti = hv_accoppiamentiGiornata(matchday);
  if (accoppiamenti.length !== 6) return partite;

  const riconosciute = partite.filter((p) => p.homeTeamId && p.awayTeamId);
  // Se l'import ha già 6 scontri riconosciuti, li riallineiamo all'ordine del calendario.
  if (riconosciute.length === 6 && partite.length === 6) {
    return accoppiamenti.map(([a, b]) => {
      const diretta = partite.find((p) => p.homeTeamId === a && p.awayTeamId === b);
      if (diretta) return diretta;
      const inversa = partite.find((p) => p.homeTeamId === b && p.awayTeamId === a);
      return inversa ? hv_invertiPartitaRis(inversa) : null;
    }).filter(Boolean);
  }
  return partite;
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
  const btn = document.getElementById("ris-manuale-genera");
  if (!matchday) {
    wrap.innerHTML = '<p class="desc">Scegli prima la giornata di Serie A qui sopra.</p>';
    btn.disabled = true;
    return;
  }
  const accoppiamenti = hv_accoppiamentiGiornata(matchday);
  if (accoppiamenti.length !== 6) {
    wrap.innerHTML = `<p class="desc">Nel calendario risultano ${accoppiamenti.length} incontri per la giornata ${matchday}. Servono 6 accoppiamenti.</p>`;
    btn.disabled = true;
    return;
  }
  const giaSalvati = hv_risEsistenti.filter((r) => Number(r.matchday) === Number(matchday)).length;
  wrap.innerHTML = `
    <div class="ris-manuale-ready">
      <strong>6 scontri trovati nel calendario.</strong>
      <span>${giaSalvati ? `Ci sono già ${giaSalvati} risultati salvati: puoi modificarli.` : "Inserirai punti e gol direttamente nelle 6 schede."}</span>
    </div>`;
  btn.disabled = false;
  btn.textContent = giaSalvati ? "Apri / modifica le 6 schede" : "Apri le 6 schede";
  btn.onclick = () => hv_mostraAnteprimaRisultati(hv_partiteEsistentiPerCalendario(matchday), "manual");
}

// ===== Metodo testo =====
function hv_wireTestoRisultati() {
  document.getElementById("ris-analizza-testo").addEventListener("click", () => {
    const testo = document.getElementById("ris-textarea").value;
    hv_processaTestoRisultati(testo, "text");
  });
}

function hv_processaTestoRisultati(testo, metodo) {
  const matchday = hv_giornataSelezionata();
  if (!matchday) {
    const stato = document.getElementById("ris-ocr-stato");
    stato.textContent = "Scegli prima la giornata di Serie A.";
    return;
  }
  const { partite: grezze, righeNonRiconosciute } = hv_parseTestoRisultati(testo);
  let normalizzate = hv_normalizzaEValida(grezze, hv_risConfig.squadre);
  normalizzate = hv_completaPartiteDaCalendario(normalizzate, matchday);
  const stato = document.getElementById("ris-ocr-stato");
  stato.textContent = righeNonRiconosciute.length > 0
    ? `${righeNonRiconosciute.length} frammento/i non necessario/i o non riconosciuto/i sono stati ignorati. Controlla comunque le 6 schede.`
    : "Lettura completata: controlla punti e gol prima di salvare.";
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
        <img src="${reader.result}" class="ris-screenshot-preview" alt="Screenshot risultati da analizzare">
        <div class="ris-screenshot-actions">
          <button type="button" id="ris-rimuovi-img">Rimuovi</button>
          <button type="button" id="ris-esegui-ocr">Leggi screenshot</button>
        </div>`;
      document.getElementById("ris-rimuovi-img").onclick = () => { hv_risImmagine = null; anteprima.innerHTML = ""; };
      document.getElementById("ris-esegui-ocr").onclick = hv_avviaOCRRisultati;
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function hv_avviaOCRRisultati() {
  const stato = document.getElementById("ris-ocr-stato");
  stato.textContent = "Carico il motore OCR (solo la prima volta)…";
  try {
    const testoGrezzo = await hv_eseguiOCR(hv_risImmagine.img, (pct) => { stato.textContent = `Riconoscimento in corso… ${pct}%`; });
    const giornataLetta = typeof hv_estraiGiornataSerieA === "function" ? hv_estraiGiornataSerieA(testoGrezzo) : null;
    if (giornataLetta) {
      document.getElementById("ris-giornata").value = String(giornataLetta);
      hv_rigeneraFormManuale();
    }
    if (!hv_giornataSelezionata()) {
      stato.textContent = "Screenshot letto, ma non riesco a riconoscere la giornata di Serie A. Inseriscila nel campo Giornata e premi di nuovo Leggi screenshot.";
      return;
    }
    const testoPulito = hv_ocrATestoCanonico(testoGrezzo, hv_risConfig.squadre);
    document.getElementById("ris-ocr-debug").innerHTML = `
      <button type="button" id="ris-mostra-ocr-debug" class="ris-debug-btn">Mostra testo letto (debug)</button>
      <pre id="ris-ocr-debug-testo" class="hidden ris-debug-pre">${testoGrezzo.replace(/</g, "&lt;")}\n\n--- pulito ---\n${testoPulito.replace(/</g, "&lt;")}</pre>`;
    document.getElementById("ris-mostra-ocr-debug").onclick = () => document.getElementById("ris-ocr-debug-testo").classList.toggle("hidden");
    hv_processaTestoRisultati(testoPulito, "screenshot");
  } catch (err) {
    stato.textContent = "Errore OCR: " + err.message;
  }
}

// ===== Anteprima condivisa: 6 schede =====
function hv_iconaConfidenzaRis(c) {
  if (c === "esatta") return '<span class="ris-confidence ok">✓ riconosciuto</span>';
  if (c === "fuzzy") return '<span class="ris-confidence warn">⚠ controlla nome</span>';
  return '<span class="ris-confidence bad">✕ non riconosciuto</span>';
}

function hv_opzioniSquadreRis(selezionata) {
  return (
    '<option value="">— seleziona —</option>' +
    hv_risConfig.squadre.map((s) => `<option value="${s.id}"${s.id === selezionata ? " selected" : ""}>${s.nomeFantasquadra}</option>`).join("")
  );
}

function hv_normalizzaGolPartita(p) {
  ["home", "away"].forEach((lato) => {
    const scoreKey = lato + "Score";
    const goalsKey = lato + "Goals";
    const sourceKey = lato + "GoalsSource";
    const hasGoals = p[goalsKey] != null && p[goalsKey] !== "" && Number.isFinite(Number(p[goalsKey]));
    const hasScore = p[scoreKey] != null && p[scoreKey] !== "" && Number.isFinite(Number(p[scoreKey]));
    if (!hasGoals && hasScore) {
      p[goalsKey] = hv_calcolaGolDaPunteggio(p[scoreKey]);
      p[sourceKey] = "calcolato";
    }
    if (!p[sourceKey]) p[sourceKey] = "calcolato";
  });
  return p;
}

function hv_mostraAnteprimaRisultati(partite, metodo) {
  hv_risAnteprima = { partite: (partite || []).map((p) => hv_normalizzaGolPartita({ ...p })), metodo };
  hv_renderAnteprimaRisultati();
  const target = document.getElementById("ris-anteprima-wrap");
  if (target && typeof target.scrollIntoView === "function") target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hv_testoFonteGol(fonte) {
  if (fonte === "manuale") return "manuale";
  if (fonte === "importato") return "importato";
  if (fonte === "salvato") return "salvato";
  return "da punti";
}

function hv_cardMismatch(p) {
  const calcH = hv_calcolaGolDaPunteggio(p.homeScore);
  const calcA = hv_calcolaGolDaPunteggio(p.awayScore);
  if (calcH == null || calcA == null || !Number.isFinite(Number(p.homeGoals)) || !Number.isFinite(Number(p.awayGoals))) return "";
  if (Number(p.homeGoals) === calcH && Number(p.awayGoals) === calcA) return "";
  return `⚠ Dai punti il risultato sarebbe ${calcH}-${calcA}. Mantengo ${p.homeGoals}-${p.awayGoals} finché non premi “Ricalcola dai punti”.`;
}

function hv_renderAnteprimaRisultati() {
  const wrap = document.getElementById("ris-anteprima-wrap");
  if (!hv_risAnteprima) { wrap.innerHTML = ""; return; }
  const matchday = hv_giornataSelezionata();
  const { partite } = hv_risAnteprima;

  if (!matchday) {
    wrap.innerHTML = '<p class="desc ris-warning-text">Scegli il numero di giornata prima di continuare.</p>';
    return;
  }

  const calendarioGiornata = hv_accoppiamentiGiornata(matchday);
  const problemi = hv_validaGiornata(partite, matchday, hv_risConfig.squadre, calendarioGiornata.length ? calendarioGiornata : null);
  const riconosciute = partite.filter((p) => p.homeTeamId && p.awayTeamId).length;

  wrap.innerHTML = `
    <div class="ris-preview-shell">
      <div class="ris-preview-head">
        <div>
          <p class="campo-titolo">Giornata ${matchday} · controllo finale</p>
          <p class="desc">${riconosciute}/${partite.length} incontri riconosciuti. Puoi modificare sia fantapunti sia gol.</p>
        </div>
        <span class="ris-rule-chip">66 = 1 gol · +1 ogni 4 pt</span>
      </div>
      <div class="ris-match-grid">
        ${partite.map((p, i) => `
          <article class="ris-match-card" data-ris-card="${i}">
            <div class="ris-match-card-top"><span>Scontro ${i + 1}</span>${hv_iconaConfidenzaRis(p.confidenza)}</div>
            <div class="ris-match-card-body">
              <div class="ris-team-result ris-team-result-home">
                <select data-i="${i}" data-lato="home" class="ris-select-squadra" aria-label="Squadra casa">${hv_opzioniSquadreRis(p.homeTeamId)}</select>
                <div class="ris-values-row">
                  <label><span>Gol</span><input type="number" min="0" step="1" value="${p.homeGoals ?? ""}" data-i="${i}" data-lato="home" class="ris-input-gol"></label>
                  <label><span>Punti</span><input type="number" step="0.5" value="${p.homeScore ?? ""}" data-i="${i}" data-lato="home" class="ris-input-punteggio"></label>
                </div>
                <small class="ris-goal-source" data-source-i="${i}" data-source-lato="home">Gol: ${hv_testoFonteGol(p.homeGoalsSource)}</small>
              </div>
              <div class="ris-vs-column"><span>${p.homeGoals ?? "–"}</span><b>VS</b><span>${p.awayGoals ?? "–"}</span></div>
              <div class="ris-team-result ris-team-result-away">
                <select data-i="${i}" data-lato="away" class="ris-select-squadra" aria-label="Squadra trasferta">${hv_opzioniSquadreRis(p.awayTeamId)}</select>
                <div class="ris-values-row">
                  <label><span>Gol</span><input type="number" min="0" step="1" value="${p.awayGoals ?? ""}" data-i="${i}" data-lato="away" class="ris-input-gol"></label>
                  <label><span>Punti</span><input type="number" step="0.5" value="${p.awayScore ?? ""}" data-i="${i}" data-lato="away" class="ris-input-punteggio"></label>
                </div>
                <small class="ris-goal-source" data-source-i="${i}" data-source-lato="away">Gol: ${hv_testoFonteGol(p.awayGoalsSource)}</small>
              </div>
            </div>
            <div class="ris-match-card-footer">
              <p class="ris-card-warning" data-warning-i="${i}">${hv_cardMismatch(p)}</p>
              <button type="button" class="ris-recalc-btn" data-recalc-i="${i}">↻ Ricalcola gol dai punti</button>
            </div>
          </article>`).join("")}
      </div>
      <div id="ris-problemi-wrap">${problemi.length > 0 ? problemi.map((m) => `<p class="csv-avviso">⚠ ${m}</p>`).join("") : ""}</div>
      <div class="ris-preview-actions">
        <button type="button" id="ris-annulla">Annulla</button>
        <button type="button" id="ris-salva-github" ${problemi.length > 0 ? "disabled" : ""}>💾 Salva giornata</button>
      </div>
      <p id="ris-stato-github" class="ris-save-status" aria-live="polite"></p>
    </div>`;

  hv_wireAnteprimaRisultati();
}

function hv_aggiornaCardRisultato(i) {
  const p = hv_risAnteprima?.partite?.[i];
  const card = document.querySelector(`[data-ris-card="${i}"]`);
  if (!p || !card) return;
  const vs = card.querySelectorAll(".ris-vs-column span");
  if (vs[0]) vs[0].textContent = p.homeGoals ?? "–";
  if (vs[1]) vs[1].textContent = p.awayGoals ?? "–";
  ["home", "away"].forEach((lato) => {
    const src = card.querySelector(`[data-source-i="${i}"][data-source-lato="${lato}"]`);
    if (src) src.textContent = `Gol: ${hv_testoFonteGol(p[lato + "GoalsSource"])}`;
  });
  const warning = card.querySelector(`[data-warning-i="${i}"]`);
  if (warning) warning.textContent = hv_cardMismatch(p);
}

function hv_aggiornaValidazioneRisultati() {
  if (!hv_risAnteprima) return;
  const matchday = hv_giornataSelezionata();
  const calendarioGiornata = hv_accoppiamentiGiornata(matchday);
  const problemi = hv_validaGiornata(hv_risAnteprima.partite, matchday, hv_risConfig.squadre, calendarioGiornata.length ? calendarioGiornata : null);
  const box = document.getElementById("ris-problemi-wrap");
  if (box) box.innerHTML = problemi.map((m) => `<p class="csv-avviso">⚠ ${m}</p>`).join("");
  const save = document.getElementById("ris-salva-github");
  if (save) save.disabled = problemi.length > 0;
}

function hv_wireAnteprimaRisultati() {
  const wrap = document.getElementById("ris-anteprima-wrap");
  wrap.querySelectorAll(".ris-select-squadra").forEach((sel) => {
    sel.addEventListener("change", () => {
      const i = Number(sel.dataset.i), lato = sel.dataset.lato;
      const sq = hv_squadraRis(sel.value);
      const p = hv_risAnteprima.partite[i];
      p[lato + "TeamId"] = sq ? sq.id : null;
      p[lato + "Nome"] = sq ? sq.nomeFantasquadra : "";
      p[lato + "NomeGrezzo"] = sq ? sq.nomeFantasquadra : "";
      p.confidenza = sq ? "esatta" : "nessuna";
      hv_aggiornaValidazioneRisultati();
    });
  });

  wrap.querySelectorAll(".ris-input-punteggio").forEach((inp) => {
    inp.addEventListener("input", () => {
      const i = Number(inp.dataset.i), lato = inp.dataset.lato;
      const p = hv_risAnteprima.partite[i];
      const value = inp.value === "" ? null : parseFloat(inp.value);
      p[lato + "Score"] = value;
      if (p[lato + "GoalsSource"] === "calcolato") {
        p[lato + "Goals"] = hv_calcolaGolDaPunteggio(value);
        const goalInput = wrap.querySelector(`.ris-input-gol[data-i="${i}"][data-lato="${lato}"]`);
        if (goalInput) goalInput.value = p[lato + "Goals"] ?? "";
      }
      hv_aggiornaCardRisultato(i);
      hv_aggiornaValidazioneRisultati();
    });
  });

  wrap.querySelectorAll(".ris-input-gol").forEach((inp) => {
    inp.addEventListener("input", () => {
      const i = Number(inp.dataset.i), lato = inp.dataset.lato;
      const p = hv_risAnteprima.partite[i];
      p[lato + "Goals"] = inp.value === "" ? null : Math.max(0, Math.floor(Number(inp.value)));
      p[lato + "GoalsSource"] = "manuale";
      hv_aggiornaCardRisultato(i);
      hv_aggiornaValidazioneRisultati();
    });
  });

  wrap.querySelectorAll(".ris-recalc-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.recalcI);
      const p = hv_risAnteprima.partite[i];
      ["home", "away"].forEach((lato) => {
        p[lato + "Goals"] = hv_calcolaGolDaPunteggio(p[lato + "Score"]);
        p[lato + "GoalsSource"] = "calcolato";
        const goalInput = wrap.querySelector(`.ris-input-gol[data-i="${i}"][data-lato="${lato}"]`);
        if (goalInput) goalInput.value = p[lato + "Goals"] ?? "";
      });
      hv_aggiornaCardRisultato(i);
      hv_aggiornaValidazioneRisultati();
    });
  });

  document.getElementById("ris-annulla").addEventListener("click", () => {
    hv_risAnteprima = null;
    hv_risImmagine = null;
    wrap.innerHTML = "";
    document.getElementById("ris-immagine-anteprima").innerHTML = "";
  });

  const salvaBtn = document.getElementById("ris-salva-github");
  salvaBtn?.addEventListener("click", async () => {
    const matchday = hv_giornataSelezionata();
    const stato = document.getElementById("ris-stato-github");
    const calendarioGiornata = hv_accoppiamentiGiornata(matchday);
    const problemi = hv_validaGiornata(hv_risAnteprima.partite, matchday, hv_risConfig.squadre, calendarioGiornata.length ? calendarioGiornata : null);
    if (problemi.length) {
      stato.textContent = "Correggi prima gli errori indicati.";
      return;
    }

    const avvisi = hv_avvisiGolGiornata(hv_risAnteprima.partite);
    if (avvisi.length && !confirm(`${avvisi.join("\n")}\n\nVuoi salvare comunque i risultati inseriti?`)) return;

    stato.textContent = "Salvataggio in corso…";
    salvaBtn.disabled = true;
    try {
      const senzaGiornata = hv_risEsistenti.filter((r) => Number(r.matchday) !== Number(matchday));
      const savedAt = new Date().toISOString();
      const nuovi = hv_risAnteprima.partite.map((p) => ({
        matchday,
        homeTeamId: p.homeTeamId,
        homeScore: Number(p.homeScore),
        homeGoals: Number(p.homeGoals),
        homeGoalsSource: p.homeGoalsSource || "calcolato",
        awayTeamId: p.awayTeamId,
        awayScore: Number(p.awayScore),
        awayGoals: Number(p.awayGoals),
        awayGoalsSource: p.awayGoalsSource || "calcolato",
        importMethod: hv_risAnteprima.metodo,
        savedAt,
      }));
      hv_risEsistenti = [...senzaGiornata, ...nuovi].sort((a, b) => Number(a.matchday) - Number(b.matchday));
      const output = {
        _leggimi: "Risultati della lega confermati da Admin. Ogni incontro salva fantapunti e gol fantasy. Regola automatica: sotto 66 = 0 gol, 66 = 1, poi +1 gol ogni 4 punti. I gol possono essere corretti manualmente e, se differiscono dal calcolo, il valore manuale viene rispettato.",
        risultati: hv_risEsistenti,
      };
      await hv_ghSalvaJSON("data/risultati.json", output, `Aggiorna risultati giornata ${matchday} da admin.html`, hv_risConfig);
      stato.textContent = "Giornata salvata ✓ — classifica e news useranno subito i gol fantasy.";
      hv_rigeneraFormManuale();
    } catch (err) {
      stato.textContent = "Errore: " + err.message;
    } finally {
      salvaBtn.disabled = false;
    }
  });
}
