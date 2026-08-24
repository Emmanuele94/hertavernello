async function hv_initPrevisioniForm() {
  const [configRes, previsioniRes, squadreRefRes] = await Promise.all([
    fetch("data/config.json"),
    fetch("data/previsioni.json"),
    fetch("data/squadre-serie-a.json"),
  ]);
  const config = await configRes.json();
  const { previsioni } = await previsioniRes.json();
  const squadreRef = await squadreRefRes.json();

  const wrap = document.getElementById("previsioni-form");
  wrap.innerHTML = "";

  config.squadre.forEach((squadra) => {
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

document.getElementById("previsioni-genera").addEventListener("click", () => {
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

  const output = { _leggimi: "Generato da admin.html — sostituisci data/previsioni.json", previsioni };
  const testo = JSON.stringify(output, null, 2);
  document.getElementById("previsioni-output").value = testo;
  document.getElementById("previsioni-output-wrap").classList.remove("hidden");

  const blob = new Blob([testo], { type: "application/json" });
  const link = document.getElementById("previsioni-download");
  link.href = URL.createObjectURL(blob);
  link.classList.remove("hidden");
});

hv_initPrevisioniForm();
