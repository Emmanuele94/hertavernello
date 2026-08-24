const HV_ORDINE_RUOLI = ["POR", "DIF", "CEN", "ATT"];
const HV_NOME_RUOLI = { POR: "Portieri", DIF: "Difensori", CEN: "Centrocampisti", ATT: "Attaccanti" };

function hv_renderRoster(squadra, giocatori) {
  const wrap = document.getElementById("roster-content");
  wrap.innerHTML = "";

  if (!giocatori || giocatori.length === 0) {
    wrap.innerHTML = '<p class="empty-state">Rosa non ancora caricata. Usa lo strumento admin dopo l\'asta.</p>';
    return;
  }

  HV_ORDINE_RUOLI.forEach((ruolo) => {
    const lista = giocatori.filter((g) => g.ruolo === ruolo);
    if (lista.length === 0) return;

    const group = document.createElement("div");
    group.className = "roster-group";
    const righe = lista
      .map(
        (g) => `
        <tr>
          <td>${g.nome}</td>
          <td class="squadra-reale">${g.squadraReale || ""}</td>
          <td class="costo">${g.costo ?? ""}</td>
        </tr>`
      )
      .join("");

    group.innerHTML = `
      <h3>${HV_NOME_RUOLI[ruolo]}</h3>
      <table class="roster-table"><tbody>${righe}</tbody></table>
    `;
    wrap.appendChild(group);
  });
}

async function hv_initRose(config) {
  document.getElementById("lega-nome").textContent = config.lega.nome;

  const roseRes = await fetch("data/rose.json");
  const { rose } = await roseRes.json();

  const tabsEl = document.getElementById("tabs");
  tabsEl.innerHTML = "";

  config.squadre.forEach((squadra, i) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (i === 0 ? " active" : "");
    btn.textContent = squadra.nomeReale;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const entry = (rose || []).find((r) => r.squadraId === squadra.id);
      hv_renderRoster(squadra, entry ? entry.giocatori : []);
    });
    tabsEl.appendChild(btn);
  });

  if (config.squadre.length > 0) {
    const primaEntry = (rose || []).find((r) => r.squadraId === config.squadre[0].id);
    hv_renderRoster(config.squadre[0], primaEntry ? primaEntry.giocatori : []);
  }
}

hv_checkGate().then((data) => {
  if (data) hv_initRose(data);
});
document.addEventListener("hv:unlocked", (e) => hv_initRose(e.detail));
