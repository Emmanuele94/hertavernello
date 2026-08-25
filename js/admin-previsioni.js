let hv_configPrevisioni = null;
let hv_squadreRefPrevisioni = null;

async function hv_initPrevisioniForm() {
  const [configRes, previsioniRes, squadreRefRes] = await Promise.all([
    fetch("data/config.json"),
    fetch("data/previsioni.json"),
    fetch("data/squadre-serie-a.json"),
  ]);
  hv_configPrevisioni = await configRes.json();
  const { previsioni } = await previsioniRes.json();
  hv_squadreRefPrevisioni = await squadreRefRes.json();

  const wrap = document.getElementById("previsioni-form");
  wrap.innerHTML = "";

  hv_configPrevisioni.squadre.forEach((squadra) => {
    const esistente = (previsioni || []).find((p) => p.squadraId === squadra.id) || {};
    const ordineEsistente = esistente.ordine || [];

    const opzioniSquadre = (selezionata) =>
      `<option value="">—</option>` +
      hv_squadreRefPrevisioni.squadre
        .map((s) => `<option value="${s.codice}" ${s.codice === selezionata ? "selected" : ""}>${s.nome}</option>`)
        .join("");

    const gruppiFasce = hv_squadreRefPrevisioni.fasce
      .map((f) => {
        const posizioni = [];
        for (let p = f.posMin; p <= f.posMax; p++) posizioni.push(p);
        const righe = posizioni
          .map(
            (pos) => `
            <div class="previsione-riga">
              <label>${pos}°</label>
              <select class="pv-posizione" data-pos="${pos}">${opzioniSquadre(ordineEsistente[pos - 1] || "")}</select>
            </div>`
          )
          .join("");
        return `<div class="fascia-gruppo"><h5>${f.label}</h5>${righe}</div>`;
      })
      .join("");

    const div = document.createElement("div");
    div.className = "previsione-field";
    div.dataset.squadraId = squadra.id;
    div.innerHTML = `
      <p class="campo-titolo">${squadra.nomeReale}</p>
      <div class="campo-riga">
        <input type="text" class="pv-immagine" placeholder="nome-file.png (dentro assets/previsioni/)" value="${esistente.immagine ?? ""}">
        <input type="text" class="pv-link" placeholder="oppure link esterno" value="${esistente.linkEsterno ?? ""}">
      </div>
      <details class="previsione-dettagli">
        <summary>Ordine previsto, posizione per posizione (20 squadre)</summary>
        <p class="muted" style="font-size:12px; margin: 8px 0;">Per ogni fascia, indica quale squadra hai messo in quale posizione ESATTA guardando l'ordine sinistra→destra nel tuo tiermaker.</p>
        ${gruppiFasce}
      </details>
    `;
    wrap.appendChild(div);
  });
}

function hv_costruisciOrdine(campo) {
  const ordine = new Array(20).fill(null);
  campo.querySelectorAll(".pv-posizione").forEach((sel) => {
    const pos = Number(sel.dataset.pos);
    if (sel.value) ordine[pos - 1] = sel.value;
  });
  return ordine;
}

function hv_avvisoDuplicati(ordine) {
  const presenti = ordine.filter(Boolean);
  const unici = new Set(presenti);
  return presenti.length !== unici.size;
}

function hv_costruisciPrevisioniOutput() {
  const campi = document.querySelectorAll(".previsione-field");
  const previsioni = [];
  let duplicatiTrovati = false;

  campi.forEach((c) => {
    const ordine = hv_costruisciOrdine(c);
    if (hv_avvisoDuplicati(ordine)) duplicatiTrovati = true;
    previsioni.push({
      squadraId: c.dataset.squadraId,
      immagine: c.querySelector(".pv-immagine").value.trim(),
      linkEsterno: c.querySelector(".pv-link").value.trim(),
      ordine,
    });
  });

  return { output: { _leggimi: "Generato da admin.html — sostituisci data/previsioni.json", previsioni }, duplicatiTrovati };
}

document.getElementById("previsioni-genera").addEventListener("click", () => {
  const { output, duplicatiTrovati } = hv_costruisciPrevisioniOutput();
  const testo = JSON.stringify(output, null, 2);
  document.getElementById("previsioni-output").value = testo;
  document.getElementById("previsioni-output-wrap").classList.remove("hidden");

  const blob = new Blob([testo], { type: "application/json" });
  const link = document.getElementById("previsioni-download");
  link.href = URL.createObjectURL(blob);
  link.classList.remove("hidden");

  if (duplicatiTrovati) {
    alert("Attenzione: alcune squadre reali risultano assegnate a più di una posizione. Controlla prima di caricare il file.");
  }
});

document.getElementById("previsioni-salva-github").addEventListener("click", async () => {
  const stato = document.getElementById("previsioni-stato-github");
  stato.textContent = "Salvataggio in corso...";
  stato.style.color = "var(--text-muted)";
  try {
    const { githubOwner: owner, githubRepo: repo } = hv_configPrevisioni.lega;
    const token = hv_getGithubToken();
    if (!token || !owner || !repo) throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");

    // rileggo sempre la versione più recente: così non sovrascrivo un eventuale
    // screenshot caricato nel frattempo dalla pagina Squadre, tocco solo l'ordine.
    const fileLive = await hv_ghGetFile(owner, repo, "data/previsioni.json", token);
    const liveObj = fileLive ? JSON.parse(hv_base64ToUtf8(fileLive.content)) : { previsioni: [] };
    if (!liveObj.previsioni) liveObj.previsioni = [];

    let duplicatiTrovati = false;
    document.querySelectorAll(".previsione-field").forEach((c) => {
      const squadraId = c.dataset.squadraId;
      const ordine = hv_costruisciOrdine(c);
      if (hv_avvisoDuplicati(ordine)) duplicatiTrovati = true;
      const linkEsterno = c.querySelector(".pv-link").value.trim();

      let entry = liveObj.previsioni.find((p) => p.squadraId === squadraId);
      if (!entry) {
        entry = { squadraId, immagine: "", linkEsterno: "", ordine: [] };
        liveObj.previsioni.push(entry);
      }
      entry.ordine = ordine;
      if (linkEsterno) entry.linkEsterno = linkEsterno;
    });

    liveObj._leggimi = "Generato da admin.html — sostituisci data/previsioni.json";
    const contenuto = hv_utf8ToBase64(JSON.stringify(liveObj, null, 2));
    await hv_ghPutFile(owner, repo, "data/previsioni.json", token, contenuto, "Aggiorna ordine previsioni da admin.html", fileLive ? fileLive.sha : null);

    stato.textContent = duplicatiTrovati
      ? "Salvato ✓ ma occhio: alcune squadre risultano in più posizioni contemporaneamente."
      : "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
    stato.style.color = duplicatiTrovati ? "var(--giallo-neon)" : "var(--verde-prato)";
  } catch (err) {
    stato.textContent = "Errore: " + err.message;
    stato.style.color = "var(--wine-bright)";
  }
});
