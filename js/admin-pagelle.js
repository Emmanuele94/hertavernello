let hv_configPagelle = null;
let hv_ultimoPagelleOutput = null;

async function hv_initPagelleForm() {
  const [configRes, pagelleRes] = await Promise.all([
    fetch("data/config.json"),
    fetch("data/pagelle.json"),
  ]);
  hv_configPagelle = await configRes.json();
  const { pagelle } = await pagelleRes.json();

  const wrap = document.getElementById("pagelle-form");
  wrap.innerHTML = "";

  hv_configPagelle.squadre.forEach((squadra) => {
    const esistente = (pagelle || []).find((p) => p.squadraId === squadra.id) || {};
    const div = document.createElement("div");
    div.className = "pagella-field";
    div.dataset.squadraId = squadra.id;
    div.innerHTML = `
      <p class="campo-titolo">${squadra.nomeReale} <span class="muted">(${squadra.nomeFantasquadra})</span></p>
      <div class="campo-riga">
        <input type="number" class="pf-voto" step="0.5" min="0" max="10" placeholder="Voto" value="${esistente.voto ?? ""}">
        <input type="text" class="pf-badge" placeholder="Emoji" value="${esistente.badge ?? ""}">
      </div>
      <textarea class="pf-commento" placeholder="Commento ignorante...">${esistente.commento ?? ""}</textarea>
    `;
    wrap.appendChild(div);
  });
}

function hv_costruisciPagelleOutput() {
  const campi = document.querySelectorAll(".pagella-field");
  const pagelle = [];
  campi.forEach((c) => {
    const voto = c.querySelector(".pf-voto").value;
    if (voto === "") return;
    pagelle.push({
      squadraId: c.dataset.squadraId,
      voto: Number(voto),
      badge: c.querySelector(".pf-badge").value.trim(),
      commento: c.querySelector(".pf-commento").value.trim(),
    });
  });
  return { _leggimi: "Generato da admin.html — sostituisci data/pagelle.json", pagelle };
}

document.getElementById("pagelle-genera").addEventListener("click", () => {
  const output = hv_costruisciPagelleOutput();
  hv_ultimoPagelleOutput = output;
  const testo = JSON.stringify(output, null, 2);
  document.getElementById("pagelle-output").value = testo;
  document.getElementById("pagelle-output-wrap").classList.remove("hidden");

  const blob = new Blob([testo], { type: "application/json" });
  const link = document.getElementById("pagelle-download");
  link.href = URL.createObjectURL(blob);
  link.classList.remove("hidden");
});

document.getElementById("pagelle-salva-github").addEventListener("click", async () => {
  const stato = document.getElementById("pagelle-stato-github");
  stato.textContent = "Salvataggio in corso...";
  stato.style.color = "var(--text-muted)";
  try {
    const output = hv_costruisciPagelleOutput();
    await hv_ghSalvaJSON("data/pagelle.json", output, "Aggiorna pagelle.json da admin.html", hv_configPagelle);
    stato.textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
    stato.style.color = "var(--verde-prato)";
  } catch (err) {
    stato.textContent = "Errore: " + err.message;
    stato.style.color = "var(--wine-bright)";
  }
});
