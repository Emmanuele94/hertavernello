async function hv_initPagelleForm() {
  const [configRes, pagelleRes] = await Promise.all([
    fetch("data/config.json"),
    fetch("data/pagelle.json"),
  ]);
  const config = await configRes.json();
  const { pagelle } = await pagelleRes.json();

  const wrap = document.getElementById("pagelle-form");
  wrap.innerHTML = "";

  config.squadre.forEach((squadra) => {
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

document.getElementById("pagelle-genera").addEventListener("click", () => {
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

  const output = { _leggimi: "Generato da admin.html — sostituisci data/pagelle.json", pagelle };
  const testo = JSON.stringify(output, null, 2);
  document.getElementById("pagelle-output").value = testo;
  document.getElementById("pagelle-output-wrap").classList.remove("hidden");

  const blob = new Blob([testo], { type: "application/json" });
  const link = document.getElementById("pagelle-download");
  link.href = URL.createObjectURL(blob);
  link.classList.remove("hidden");
});

hv_initPagelleForm();
