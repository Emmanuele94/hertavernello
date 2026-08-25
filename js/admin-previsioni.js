let hv_configPrevisioni = null;

async function hv_initPrevisioniForm() {
  const [configRes, previsioniRes, squadreRefRes] = await Promise.all([
    fetch("data/config.json"),
    fetch("data/previsioni.json"),
    fetch("data/squadre-serie-a.json"),
  ]);
  hv_configPrevisioni = await configRes.json();
  const { previsioni } = await previsioniRes.json();
  const squadreRef = await squadreRefRes.json();

  const wrap = document.getElementById("previsioni-form");
  wrap.innerHTML = "";

  hv_configPrevisioni.squadre.forEach((squadra) => {
    const esistente = (previsioni || []).find((p) => p.squadraId === squadra.id) || {};
    const fasceEsistenti = esistente.fasce || {};

    const selects = squadreRef.squadre
      .map((s) => {
        const opzioni = squadreRef.fasce
          .map(
            (f) =>
              `<option value="${f.id}" ${fasceEsistenti[s.codice] === f.id ? "selected" : ""}>${f.label}</option>`
          )
          .join("");
        return `
          <div class="previsione-riga">
            <label>${s.nome}</label>
            <select class="pv-fascia" data-codice="${s.codice}">
              <option value="">—</option>
              ${opzioni}
            </select>
          </div>`;
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
        <summary>Fasce previste (20 squadre)</summary>
        <div class="previsione-griglia">${selects}</div>
      </details>
    `;
    wrap.appendChild(div);
  });
}

function hv_costruisciPrevisioniOutput() {
  const campi = document.querySelectorAll(".previsione-field");
  const previsioni = [];

  campi.forEach((c) => {
    const fasce = {};
    c.querySelectorAll(".pv-fascia").forEach((sel) => {
      if (sel.value) fasce[sel.dataset.codice] = Number(sel.value);
    });
    previsioni.push({
      squadraId: c.dataset.squadraId,
      immagine: c.querySelector(".pv-immagine").value.trim(),
      linkEsterno: c.querySelector(".pv-link").value.trim(),
      fasce,
    });
  });

  return { _leggimi: "Generato da admin.html — sostituisci data/previsioni.json", previsioni };
}

document.getElementById("previsioni-genera").addEventListener("click", () => {
  const output = hv_costruisciPrevisioniOutput();
  const testo = JSON.stringify(output, null, 2);
  document.getElementById("previsioni-output").value = testo;
  document.getElementById("previsioni-output-wrap").classList.remove("hidden");

  const blob = new Blob([testo], { type: "application/json" });
  const link = document.getElementById("previsioni-download");
  link.href = URL.createObjectURL(blob);
  link.classList.remove("hidden");
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
    // screenshot caricato nel frattempo dalla pagina Squadre, tocco solo le fasce.
    const fileLive = await hv_ghGetFile(owner, repo, "data/previsioni.json", token);
    const liveObj = fileLive ? JSON.parse(hv_base64ToUtf8(fileLive.content)) : { previsioni: [] };
    if (!liveObj.previsioni) liveObj.previsioni = [];

    document.querySelectorAll(".previsione-field").forEach((c) => {
      const squadraId = c.dataset.squadraId;
      const fasce = {};
      c.querySelectorAll(".pv-fascia").forEach((sel) => {
        if (sel.value) fasce[sel.dataset.codice] = Number(sel.value);
      });
      const linkEsterno = c.querySelector(".pv-link").value.trim();

      let entry = liveObj.previsioni.find((p) => p.squadraId === squadraId);
      if (!entry) {
        entry = { squadraId, immagine: "", linkEsterno: "", fasce: {} };
        liveObj.previsioni.push(entry);
      }
      entry.fasce = fasce;
      if (linkEsterno) entry.linkEsterno = linkEsterno;
    });

    liveObj._leggimi = "Generato da admin.html — sostituisci data/previsioni.json";
    const contenuto = hv_utf8ToBase64(JSON.stringify(liveObj, null, 2));
    await hv_ghPutFile(owner, repo, "data/previsioni.json", token, contenuto, "Aggiorna fasce previsioni da admin.html", fileLive ? fileLive.sha : null);

    stato.textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
    stato.style.color = "var(--verde-prato)";
  } catch (err) {
    stato.textContent = "Errore: " + err.message;
    stato.style.color = "var(--wine-bright)";
  }
});
