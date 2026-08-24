function hv_statoVoto(voto) {
  if (voto >= 7) return "promosso";
  if (voto >= 5.5) return "medio";
  return "bocciato";
}

function hv_countdown(dataAstaISO) {
  const el = document.getElementById("countdown");
  if (!el) return;

  function aggiorna() {
    const diff = new Date(dataAstaISO).getTime() - Date.now();
    if (diff <= 0) {
      el.textContent = "Asta conclusa — stagione " + (window.hv_stagione || "") + " in corso";
      clearInterval(timer);
      return;
    }
    const g = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    el.textContent = `Asta tra ${g}g ${h}h ${m}m`;
  }

  aggiorna();
  const timer = setInterval(aggiorna, 60000);
}

function hv_applyTilt(card) {
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(600px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) scale(1.02)`;
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "perspective(600px) rotateX(0) rotateY(0) scale(1)";
  });
}

async function hv_renderPagelle(config) {
  const [pagelleRes] = await Promise.all([fetch("data/pagelle.json")]);
  const { pagelle } = await pagelleRes.json();

  const grid = document.getElementById("pagelle-grid");
  grid.innerHTML = "";

  if (!pagelle || pagelle.length === 0) {
    grid.innerHTML = '<p class="empty-state">Le pagelle compariranno qui dopo l\'asta.</p>';
    return;
  }

  pagelle
    .slice()
    .sort((a, b) => b.voto - a.voto)
    .forEach((p) => {
      const squadra = config.squadre.find((s) => s.id === p.squadraId);
      if (!squadra) return;

      const stato = hv_statoVoto(p.voto);
      const card = document.createElement("div");
      card.className = `pagella-card ${stato}`;
      card.innerHTML = `
        <span class="pagella-badge">${p.badge || ""}</span>
        <p class="pagella-squadra">${squadra.nomeFantasquadra}</p>
        <p class="pagella-nome">${squadra.nomeReale}</p>
        <p class="pagella-voto">${p.voto}</p>
        <p class="pagella-commento">${p.commento || ""}</p>
      `;
      grid.appendChild(card);
      hv_applyTilt(card);
    });
}

async function hv_renderPrevisioni(config) {
  const res = await fetch("data/previsioni.json");
  const { previsioni } = await res.json();

  const grid = document.getElementById("previsioni-grid");
  grid.innerHTML = "";

  config.squadre.forEach((squadra) => {
    const p = (previsioni || []).find((x) => x.squadraId === squadra.id);
    const card = document.createElement("div");
    card.className = "previsione-card";

    let corpo;
    if (p && p.immagine) {
      corpo = `<img src="assets/previsioni/${p.immagine}" alt="Previsione ${squadra.nomeReale}">`;
    } else if (p && p.linkEsterno) {
      corpo = `<a href="${p.linkEsterno}" target="_blank" rel="noopener" class="placeholder">Vedi previsione ↗</a>`;
    } else {
      corpo = '<div class="placeholder">Nessuna previsione caricata</div>';
    }

    card.innerHTML = corpo + `<div class="previsione-nome">${squadra.nomeReale}</div>`;
    grid.appendChild(card);
  });
}

async function hv_initHome(config) {
  document.getElementById("lega-nome").textContent = config.lega.nome;
  document.getElementById("lega-stagione").textContent = "Stagione " + config.lega.stagione;
  window.hv_stagione = config.lega.stagione;
  hv_countdown(config.lega.dataAsta);
  await hv_renderPagelle(config);
  await hv_renderPrevisioni(config);
}

hv_checkGate().then((data) => {
  if (data) hv_initHome(data);
});
document.addEventListener("hv:unlocked", (e) => hv_initHome(e.detail));
