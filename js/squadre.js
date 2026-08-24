const HV_ORDINE_RUOLI = ["POR", "DIF", "CEN", "ATT"];
const HV_NOME_RUOLI = { POR: "Portieri", DIF: "Difensori", CEN: "Centrocampisti", ATT: "Attaccanti" };

function hv_statoVoto(voto) {
  if (voto >= 7) return "promosso";
  if (voto >= 5.5) return "medio";
  return "bocciato";
}

function hv_apriLightbox(src) {
  const overlay = document.getElementById("lightbox");
  document.getElementById("lightbox-img").src = src;
  overlay.classList.remove("hidden");
}

function hv_renderRoster(giocatori, squadreRef) {
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
      .map((g) => {
        const codice = squadreRef ? hv_trovaCodice(g.squadraReale, squadreRef) : null;
        const cellaSquadra = codice
          ? `<img src="assets/loghi/${codice}.png" alt="${codice}" title="${codice}" class="logo-squadra-mini"><span>${codice}</span>`
          : `${g.squadraReale || ""}`;
        return `
        <tr>
          <td>${g.nome}</td>
          <td class="squadra-reale">${cellaSquadra}</td>
          <td class="costo">${g.costo ?? ""}</td>
        </tr>`;
      })
      .join("");

    group.innerHTML = `<h3>${HV_NOME_RUOLI[ruolo]}</h3><table class="roster-table"><tbody>${righe}</tbody></table>`;
    wrap.appendChild(group);
  });
}

function hv_medagliaShine(el) {
  el.addEventListener("mousemove", (e) => {
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty("--sx", x + "%");
    el.style.setProperty("--sy", y + "%");
  });
  el.addEventListener("mouseleave", () => {
    el.style.setProperty("--sx", "35%");
    el.style.setProperty("--sy", "28%");
  });
}

function hv_renderPagella(pagella) {
  const wrap = document.getElementById("pagella-content");
  wrap.innerHTML = "";

  if (!pagella) {
    wrap.innerHTML = '<p class="empty-state">Pagella non ancora inserita. Usa admin.html dopo l\'asta.</p>';
    return;
  }

  const stato = hv_statoVoto(pagella.voto);
  const card = document.createElement("div");
  card.className = `pagella-card ${stato}`;
  card.style.maxWidth = "320px";
  card.innerHTML = `
    <div class="pagella-medaglia">
      <span class="pagella-medaglia-voto">${pagella.voto}</span>
      ${pagella.badge ? `<span class="pagella-medaglia-charm">${pagella.badge}</span>` : ""}
    </div>
    <p class="pagella-commento">${pagella.commento || ""}</p>
  `;
  wrap.appendChild(card);
  hv_medagliaShine(card.querySelector(".pagella-medaglia"));
}

function hv_renderPrevisione(previsione) {
  const wrap = document.getElementById("previsione-content");
  wrap.innerHTML = "";

  if (previsione && previsione.immagine) {
    const img = document.createElement("img");
    img.src = "assets/previsioni/" + previsione.immagine;
    img.alt = "Previsione Serie A";
    img.className = "previsione-clickable";
    img.addEventListener("click", () => hv_apriLightbox(img.src));
    wrap.appendChild(img);
  } else if (previsione && previsione.linkEsterno) {
    wrap.innerHTML = `<a href="${previsione.linkEsterno}" target="_blank" rel="noopener">Vedi previsione ↗</a>`;
  } else {
    wrap.innerHTML = '<p class="empty-state">Previsione non ancora caricata.</p>';
  }
}

async function hv_initSquadre(config) {
  document.getElementById("lega-nome").textContent = config.lega.nome;

  const [roseRes, pagelleRes, previsioniRes, squadreRef] = await Promise.all([
    fetch("data/rose.json"),
    fetch("data/pagelle.json"),
    fetch("data/previsioni.json"),
    hv_caricaSquadreRef(),
  ]);
  const { rose } = await roseRes.json();
  const { pagelle } = await pagelleRes.json();
  const { previsioni } = await previsioniRes.json();

  function mostraSquadra(squadra) {
    const roster = (rose || []).find((r) => r.squadraId === squadra.id);
    const pagella = (pagelle || []).find((p) => p.squadraId === squadra.id);
    const previsione = (previsioni || []).find((p) => p.squadraId === squadra.id);
    hv_renderRoster(roster ? roster.giocatori : [], squadreRef);
    hv_renderPagella(pagella);
    hv_renderPrevisione(previsione);
  }

  const tabsEl = document.getElementById("tabs");
  tabsEl.innerHTML = "";

  config.squadre.forEach((squadra, i) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (i === 0 ? " active" : "");
    btn.textContent = squadra.nomeReale;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mostraSquadra(squadra);
    });
    tabsEl.appendChild(btn);
  });

  if (config.squadre.length > 0) mostraSquadra(config.squadre[0]);
}

hv_checkGate().then((data) => {
  if (data) hv_initSquadre(data);
});
document.addEventListener("hv:unlocked", (e) => hv_initSquadre(e.detail));
