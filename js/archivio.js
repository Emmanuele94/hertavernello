// ===== Albo d'oro: aggregazione campionato/coppa/generale da tutte le stagioni =====
function hv_calcolaAlboOro(stagioni) {
  const campionato = {};
  const coppa = {};

  stagioni.forEach((s) => {
    (s.campionato || []).forEach((n) => {
      if (!campionato[n]) campionato[n] = [];
      campionato[n].push(s.anno);
    });
    (s.coppa || []).forEach((n) => {
      if (!coppa[n]) coppa[n] = [];
      coppa[n].push(s.anno);
    });
  });

  const generale = {};
  Object.entries(campionato).forEach(([n, anni]) => {
    if (!generale[n]) generale[n] = [];
    anni.forEach((a) => generale[n].push({ anno: a, tipo: "campionato" }));
  });
  Object.entries(coppa).forEach(([n, anni]) => {
    if (!generale[n]) generale[n] = [];
    anni.forEach((a) => generale[n].push({ anno: a, tipo: "coppa" }));
  });

  return { campionato, coppa, generale };
}

// Disegna una lista di nomi ordinata per numero di vittorie. Gli anni di
// ciascuno stanno sempre visibili sotto il nome, in piccolo: niente click,
// niente accordion, niente chevron.
function hv_renderListaAlbo(containerId, mappa, prefissoId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const voci = Object.entries(mappa)
    .map(([nome, dettagli]) => {
      const elenco = dettagli[0] && typeof dettagli[0] === "object" ? dettagli : dettagli.map((a) => ({ anno: a, tipo: null }));
      return { nome, count: elenco.length, elenco };
    })
    .sort((a, b) => b.count - a.count || a.nome.localeCompare(b.nome));

  if (voci.length === 0) {
    container.innerHTML = '<p class="empty-state">Nessun dato ancora inserito.</p>';
    return;
  }

  let posizione = 0;
  let ultimoCount = null;

  container.innerHTML = voci
    .map((v, i) => {
      if (v.count !== ultimoCount) {
        posizione = i + 1;
        ultimoCount = v.count;
      }
      const dettaglioHtml = v.elenco
        .slice()
        .sort((a, b) => b.anno.localeCompare(a.anno))
        .map(
          (d) => `<div class="albo-anno-riga">${d.anno}${d.tipo ? ` <span class="albo-anno-tipo">(${d.tipo === "campionato" ? "Campionato" : "Coppa"})</span>` : ""}</div>`
        )
        .join("");

      return `
      <div class="albo-voce">
        <div class="albo-voce-riga">
          <span class="albo-posizione">${posizione}°</span>
          <span class="albo-nome">${v.nome}</span>
          <span class="albo-count">${v.count}</span>
        </div>
        <div class="albo-dettaglio">${dettaglioHtml}</div>
      </div>`;
    })
    .join("");
}

function hv_renderVistaAlboOro(stagioni) {
  const concluse = stagioni.filter((s) => !s.inCorso);
  const { campionato, coppa, generale } = hv_calcolaAlboOro(concluse);
  hv_renderListaAlbo("albo-campionato", campionato, "camp");
  hv_renderListaAlbo("albo-coppa", coppa, "coppa");
  hv_renderListaAlbo("albo-generale", generale, "gen");
}

// ===== Lista: tabs per anno + dettaglio stagione =====
function hv_renderAnnoTabs(stagioni) {
  const wrap = document.getElementById("lista-anni-tabs");
  wrap.innerHTML = stagioni
    .map((s, i) => `<button type="button" class="anno-tab${i === 0 ? " active" : ""}" data-i="${i}">${s.anno}</button>`)
    .join("");

  wrap.querySelectorAll(".anno-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".anno-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      hv_mostraStagione(stagioni[Number(btn.dataset.i)]);
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  });

  hv_initFrecceAnniTabs(wrap);
}

// Frecce ‹ › per scorrere i tab anno (uguali su mobile e desktop) + dissolvenza
// ai bordi quando c'è altro contenuto nascosto da quel lato.
function hv_initFrecceAnniTabs(wrap) {
  const scroller = wrap.closest(".anno-tabs-scroller");
  const prevBtn = document.getElementById("anno-tabs-prev");
  const nextBtn = document.getElementById("anno-tabs-next");
  if (!scroller || !prevBtn || !nextBtn) return;

  const passo = () => Math.round(wrap.clientWidth * 0.7) || 160;

  const aggiornaStato = () => {
    const maxScroll = wrap.scrollWidth - wrap.clientWidth;
    scroller.classList.toggle("puo-scorrere-sx", wrap.scrollLeft > 4);
    scroller.classList.toggle("puo-scorrere-dx", wrap.scrollLeft < maxScroll - 4);
  };

  prevBtn.addEventListener("click", () => wrap.scrollBy({ left: -passo(), behavior: "smooth" }));
  nextBtn.addEventListener("click", () => wrap.scrollBy({ left: passo(), behavior: "smooth" }));
  wrap.addEventListener("scroll", aggiornaStato);
  window.addEventListener("resize", aggiornaStato);

  aggiornaStato();
}

function hv_blocEspandibile(idBase, titolo, iconaSrc, contenutoHtml) {
  return `
    <div class="squadra-block" style="margin: 0 0 20px;">
      <h3 class="squadra-block-title sezione-toggle" data-target="${idBase}-content">
        <img src="${iconaSrc}" class="icona-titolo" alt="">${titolo}
        <span class="toggle-chevron">▾</span>
      </h3>
      <div id="${idBase}-content" class="sezione-contenuto">${contenutoHtml}</div>
    </div>`;
}

function hv_mostraStagione(stagione) {
  const wrap = document.getElementById("lista-dettaglio");

  if (stagione.inCorso) {
    wrap.innerHTML = `
      <div class="torta-wip">
        <img src="assets/icone/icon-workinprogress.png" class="torta-wip-icona" alt="">
        <p class="torta-wip-testo">Stagione ${stagione.anno} in corso — qui troverai tutto a fine campionato.</p>
      </div>`;
    return;
  }

  const vincitoriHtml = `
    <div class="albo-vincitori-riga">
      <div>
        <span class="albo-vincitori-etichetta">🏆 Vincitore del campionato</span>
        <span class="albo-vincitori-nomi">${stagione.campionato.length ? stagione.campionato.join(", ") : "Nessuna informazione"}</span>
      </div>
      <div>
        <span class="albo-vincitori-etichetta">🏅 Vincitore/i della coppa</span>
        <span class="albo-vincitori-nomi">${stagione.coppa.length ? stagione.coppa.join(", ") : "Nessuna informazione"}</span>
      </div>
    </div>`;

  const classificaHtml = stagione.classificaSerieA.length
    ? `<table class="roster-table"><tbody>${stagione.classificaSerieA
        .map(
          (r, i) => `
        <tr>
          <td style="width:26px; font-family:var(--font-mono); color:var(--text-muted);">${i + 1}</td>
          <td>${r.codice ? `<img src="assets/loghi/${r.codice}.png" class="logo-squadra-mini" alt="">` : ""}${r.nome}</td>
          <td class="costo">${r.punti != null ? r.punti + " pt" : ""}</td>
        </tr>`
        )
        .join("")}</tbody></table>`
    : '<p class="empty-state">Non disponibile.</p>';

  const marcatoriHtml = stagione.topMarcatori.length
    ? `<table class="roster-table"><tbody>${stagione.topMarcatori
        .map(
          (m, i) => `
        <tr>
          <td style="width:26px; font-family:var(--font-mono); color:var(--giallo-neon);">${i + 1}°</td>
          <td>${m.nome} <span class="muted" style="font-size:11.5px;">(${m.squadra})</span></td>
          <td class="costo">${m.gol} gol</td>
        </tr>`
        )
        .join("")}</tbody></table>`
    : '<p class="empty-state">Non disponibile.</p>';

  const curiositaHtml = stagione.curiosita
    ? `
      <p class="curiosita-titolo">${stagione.curiosita.titolo}</p>
      <p class="curiosita-sottotitolo">⚽ Nel mondo del calcio (Serie A e non solo)</p>
      <ul class="curiosita-lista">${stagione.curiosita.calcio.map((c) => `<li>${c}</li>`).join("")}</ul>
      <p class="curiosita-sottotitolo">🌍 Al di fuori del calcio (attualità e costume)</p>
      <ul class="curiosita-lista">${stagione.curiosita.mondo.map((c) => `<li>${c}</li>`).join("")}</ul>
    `
    : '<p class="empty-state">Non disponibile.</p>';

  wrap.innerHTML = `
    ${vincitoriHtml}
    ${hv_blocEspandibile("classifica-sa", "Classifica Serie A", "assets/icone/icon-raking.png", classificaHtml)}
    ${hv_blocEspandibile("top-marcatori", "Classifica migliori 10 marcatori", "assets/icone/icon-migliori10marcatori.png", marcatoriHtml)}
    ${hv_blocEspandibile("curiosita", `Curiosità dell'anno ${stagione.anno}`, "assets/icone/icon-curiosita.png", curiositaHtml)}
  `;

  wrap.querySelectorAll(".sezione-toggle").forEach((titolo) => {
    titolo.addEventListener("click", () => {
      const contenuto = document.getElementById(titolo.dataset.target);
      if (!contenuto) return;
      titolo.classList.toggle("collassato");
      contenuto.classList.toggle("collassato");
    });
  });
}

// ===== Cambio vista: Albo d'oro <-> Lista =====
function hv_attivaVista(nome) {
  document.querySelectorAll(".archivio-nav-item").forEach((b) => b.classList.toggle("active", b.dataset.vista === nome));
  document.getElementById("vista-albo").classList.toggle("hidden", nome !== "albo");
  document.getElementById("vista-lista").classList.toggle("hidden", nome !== "lista");
}

// ===== Init =====
async function hv_initArchivio(config) {
  document.getElementById("lega-nome").textContent = config.lega.nome;

  const wrap = document.getElementById("vista-albo");
  try {
    const res = await fetch("data/albo-oro.json");
    const { stagioni } = await res.json();

    hv_renderVistaAlboOro(stagioni);
    hv_renderAnnoTabs(stagioni);
    hv_mostraStagione(stagioni[0]);

    document.querySelectorAll(".archivio-nav-item").forEach((btn) => {
      btn.addEventListener("click", () => hv_attivaVista(btn.dataset.vista));
    });
  } catch (err) {
    wrap.innerHTML = `<p class="empty-state">Non riesco a caricare l'archivio (${err.message}).</p>`;
  }
}

hv_checkGate().then((data) => {
  if (data) hv_initArchivio(data);
});
document.addEventListener("hv:unlocked", (e) => hv_initArchivio(e.detail));
