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
}

// Estrae l'ID video da un URL YouTube in uno qualsiasi dei formati comuni
// (watch?v=, youtu.be/, /embed/, /shorts/) — serve per costruire la miniatura
// senza bisogno di chiamare nessuna API.
function hv_estraiIdYoutube(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
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

// Form admin per i video di una stagione: righe dinamiche (titolo+url), un
// pulsante "+" per aggiungerne altre, salvataggio diretto su GitHub — stesso
// principio del video di Squadre, ma con più righe invece di una sola.
function hv_renderVideoAdminForm(stagione) {
  const formWrap = document.getElementById("video-admin-form");
  const config = hv_archivioConfig;

  if (!formWrap || window.hv_role !== "admin" || !config || !(config.lega.githubOwner && config.lega.githubRepo)) {
    if (formWrap) formWrap.innerHTML = "";
    return;
  }

  // Righe di partenza: quelle già salvate, più una vuota pronta da compilare.
  let righe = (stagione.video || []).map((v) => ({ titolo: v.titolo || "", url: v.url || "" }));
  righe.push({ titolo: "", url: "" });

  function disegna() {
    formWrap.innerHTML = `
      <div class="admin-box" style="background: var(--bg-void); margin-top: 14px; padding: 14px;">
        <p class="campo-titolo" style="margin: 0 0 10px;">Aggiungi/modifica i video di questa stagione</p>
        <div id="video-admin-righe" style="display:flex; flex-direction:column; gap:10px;">
          ${righe
            .map(
              (r, i) => `
            <div class="campo-riga video-admin-riga" data-i="${i}" style="align-items:center; flex-wrap:wrap;">
              <input type="text" class="video-admin-titolo" data-i="${i}" placeholder="Titolo (es. Asta 2025 - i momenti migliori)" value="${r.titolo.replace(/"/g, "&quot;")}" style="flex:1; min-width:200px;">
              <input type="text" class="video-admin-url" data-i="${i}" placeholder="Link YouTube" value="${r.url.replace(/"/g, "&quot;")}" style="flex:1; min-width:200px;">
              ${righe.length > 1 ? `<button type="button" class="video-admin-rimuovi" data-i="${i}" title="Rimuovi questa riga">✕</button>` : ""}
            </div>`
            )
            .join("")}
        </div>
        <button type="button" id="video-admin-aggiungi" style="margin-top: 10px;">+ Aggiungi un altro video</button>
        <br>
        <button type="button" id="video-admin-salva" style="margin-top: 10px;">Salva</button>
        <p id="video-admin-stato" class="muted" style="font-size: 12px; margin-top: 8px;"></p>
      </div>
    `;

    formWrap.querySelectorAll(".video-admin-titolo").forEach((el) => {
      el.addEventListener("input", () => (righe[Number(el.dataset.i)].titolo = el.value));
    });
    formWrap.querySelectorAll(".video-admin-url").forEach((el) => {
      el.addEventListener("input", () => (righe[Number(el.dataset.i)].url = el.value));
    });
    formWrap.querySelectorAll(".video-admin-rimuovi").forEach((el) => {
      el.addEventListener("click", () => {
        righe.splice(Number(el.dataset.i), 1);
        disegna();
      });
    });
    document.getElementById("video-admin-aggiungi").addEventListener("click", () => {
      righe.push({ titolo: "", url: "" });
      disegna();
    });
    document.getElementById("video-admin-salva").addEventListener("click", async () => {
      const stato = document.getElementById("video-admin-stato");
      const daSalvare = righe.filter((r) => r.url.trim()).map((r) => ({ titolo: r.titolo.trim(), url: r.url.trim() }));
      stato.textContent = "Salvataggio in corso...";
      stato.style.color = "var(--text-muted)";
      try {
        await hv_salvaVideoStagioneViaGitHub(stagione.anno, daSalvare, config);
        stato.textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
        stato.style.color = "var(--verde-prato)";
        stagione.video = daSalvare;
        righe = daSalvare.map((v) => ({ titolo: v.titolo, url: v.url }));
        righe.push({ titolo: "", url: "" });
        disegna();

        // Aggiorno anche l'anteprima già visibile, senza dover ricaricare la pagina
        const listaWrap = document.getElementById("video-lista-wrap");
        listaWrap.innerHTML = daSalvare.length
          ? `<div class="video-lista">${daSalvare
              .map((v) => {
                const id = hv_estraiIdYoutube(v.url);
                const miniatura = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
                return `<a href="${v.url}" target="_blank" rel="noopener" class="video-card video-card-riga">
                  ${miniatura ? `<img src="${miniatura}" class="video-miniatura" alt="">` : `<div class="video-miniatura video-miniatura-vuota">▶</div>`}
                  <span class="video-titolo">${v.titolo || "Guarda su YouTube"}</span>
                </a>`;
              })
              .join("")}</div>`
          : "";
      } catch (err) {
        stato.textContent = "Errore: " + err.message;
        stato.style.color = "var(--wine-bright)";
      }
    });
  }

  disegna();
}

// Form admin per le pagelle di una stagione: stesso meccanismo del video
// (righe dinamiche + salva su GitHub), ma con nome sopra e testo (più lungo,
// quindi un'area di testo) sotto.
function hv_renderPagelleAdminForm(stagione) {
  const formWrap = document.getElementById("pagelle-admin-form");
  const config = hv_archivioConfig;

  if (!formWrap || window.hv_role !== "admin" || !config || !(config.lega.githubOwner && config.lega.githubRepo)) {
    if (formWrap) formWrap.innerHTML = "";
    return;
  }

  let righe = (stagione.pagelle || []).map((p) => ({ nome: p.nome || "", testo: p.testo || "" }));
  righe.push({ nome: "", testo: "" });

  function disegna() {
    formWrap.innerHTML = `
      <div class="admin-box" style="background: var(--bg-void); margin-top: 14px; padding: 14px;">
        <p class="campo-titolo" style="margin: 0 0 10px;">Aggiungi/modifica le pagelle di questa stagione</p>
        <div style="display:flex; flex-direction:column; gap:14px;">
          ${righe
            .map(
              (r, i) => `
            <div class="pagella-admin-riga" data-i="${i}">
              <div class="campo-riga" style="align-items:center;">
                <input type="text" class="pagella-admin-nome" data-i="${i}" placeholder="Nome fantallenatore" value="${r.nome.replace(/"/g, "&quot;")}" style="flex:1;">
                ${righe.length > 1 ? `<button type="button" class="pagella-admin-rimuovi" data-i="${i}" title="Rimuovi questa pagella">✕</button>` : ""}
              </div>
              <textarea class="pagella-admin-testo" data-i="${i}" rows="2" placeholder="Testo della pagella" style="margin-top: 6px;">${r.testo}</textarea>
            </div>`
            )
            .join("")}
        </div>
        <button type="button" id="pagelle-admin-aggiungi" style="margin-top: 10px;">+ Aggiungi persona</button>
        <br>
        <button type="button" id="pagelle-salva-btn" style="margin-top: 10px;">Salva</button>
        <p id="pagelle-stato" class="muted" style="font-size: 12px; margin-top: 8px;"></p>
      </div>
    `;

    formWrap.querySelectorAll(".pagella-admin-nome").forEach((el) => {
      el.addEventListener("input", () => (righe[Number(el.dataset.i)].nome = el.value));
    });
    formWrap.querySelectorAll(".pagella-admin-testo").forEach((el) => {
      el.addEventListener("input", () => (righe[Number(el.dataset.i)].testo = el.value));
    });
    formWrap.querySelectorAll(".pagella-admin-rimuovi").forEach((el) => {
      el.addEventListener("click", () => {
        righe.splice(Number(el.dataset.i), 1);
        disegna();
      });
    });
    document.getElementById("pagelle-admin-aggiungi").addEventListener("click", () => {
      righe.push({ nome: "", testo: "" });
      disegna();
    });
    document.getElementById("pagelle-salva-btn").addEventListener("click", async () => {
      const stato = document.getElementById("pagelle-stato");
      const daSalvare = righe.filter((r) => r.nome.trim() || r.testo.trim()).map((r) => ({ nome: r.nome.trim(), testo: r.testo.trim() }));
      stato.textContent = "Salvataggio in corso...";
      stato.style.color = "var(--text-muted)";
      try {
        await hv_salvaPagelleStagioneViaGitHub(stagione.anno, daSalvare, config);
        stato.textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
        stato.style.color = "var(--verde-prato)";
        stagione.pagelle = daSalvare;
        righe = daSalvare.map((p) => ({ nome: p.nome, testo: p.testo }));
        righe.push({ nome: "", testo: "" });
        disegna();

        const listaWrap = document.getElementById("pagelle-lista-wrap");
        listaWrap.innerHTML = daSalvare.length
          ? `<div class="pagelle-stagione-lista">${daSalvare
              .map((p) => `<div class="pagella-stagione-card"><p class="pagella-stagione-nome">${p.nome}</p><p class="pagella-stagione-testo">${p.testo}</p></div>`)
              .join("")}</div>`
          : "";
      } catch (err) {
        stato.textContent = "Errore: " + err.message;
        stato.style.color = "var(--wine-bright)";
      }
    });
  }

  disegna();
}

async function hv_mostraStagione(stagione) {
  const wrap = document.getElementById("lista-dettaglio");

  if (stagione.inCorso) {
    wrap.innerHTML = `
      <div class="torta-wip">
        <img src="assets/icone/icon-workinprogress.png" class="torta-wip-icona" alt="">
        <p class="torta-wip-testo">Stagione ${stagione.anno} in corso — qui troverai tutto a fine campionato.</p>
      </div>`;
    return;
  }

  wrap.innerHTML = '<p class="empty-state">Carico...</p>';
  const [squadreRef, giocatoriDb] = await Promise.all([hv_caricaSquadreRef(), hv_caricaGiocatoriDb()]);

  // Foto giocatore per una voce di marcatori/rosa storica. NOTA IMPORTANTE:
  // il database giocatori/foto è quello della stagione CORRENTE — per le
  // stagioni vecchie (giocatori ritirati, trasferiti, ecc.) è normale che la
  // maggior parte non trovi corrispondenza: in quel caso restano le iniziali,
  // mai un'immagine rotta o sbagliata.
  function hv_fotoStorica(nome, squadraRealeNome) {
    const codice = squadraRealeNome ? hv_trovaCodice(squadraRealeNome, squadreRef) : null;
    const giocatoreDb = hv_trovaGiocatore(nome, codice, giocatoriDb);
    if (giocatoreDb && giocatoreDb.foto) return `<img src="${giocatoreDb.foto}" class="foto-giocatore-mini" alt="">`;
    return `<span class="foto-giocatore-iniziali">${hv_inizialiGiocatore(nome)}</span>`;
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
          <td>${hv_fotoStorica(m.nome, m.squadra)}${m.nome} <span class="muted" style="font-size:11.5px;">(${m.squadra})</span></td>
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

  // Le rose storiche e i video sono FACOLTATIVI: appaiono solo se presenti per
  // questa stagione (vedi _leggimi in data/albo-oro.json per il formato). Ogni
  // giocatore può essere una semplice stringa "Nome", oppure un oggetto
  // { nome, squadraReale } se conosci anche la squadra reale di quell'anno —
  // con quella in più la foto si abbina meglio.
  const roseHtml =
    stagione.rose && stagione.rose.length
      ? `<div class="rose-storiche-griglia">${stagione.rose
          .map(
            (r) => `
        <div class="rosa-storica-card">
          <p class="rosa-storica-nome">${r.squadra}</p>
          <ul class="rosa-storica-lista">
            ${r.giocatori
              .map((g) => {
                const nome = typeof g === "string" ? g : g.nome;
                const squadraReale = typeof g === "object" ? g.squadraReale : null;
                return `<li>${hv_fotoStorica(nome, squadraReale)}${nome}</li>`;
              })
              .join("")}
          </ul>
        </div>`
          )
          .join("")}</div>`
      : '<p class="empty-state">Rose non ancora caricate per questa stagione.</p>';

  const videoHtml =
    stagione.video && stagione.video.length
      ? `<div class="video-lista">${stagione.video
          .map((v) => {
            const id = hv_estraiIdYoutube(v.url);
            const miniatura = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
            return `
          <a href="${v.url}" target="_blank" rel="noopener" class="video-card video-card-riga">
            ${miniatura ? `<img src="${miniatura}" class="video-miniatura" alt="">` : `<div class="video-miniatura video-miniatura-vuota">▶</div>`}
            <span class="video-titolo">${v.titolo || "Guarda su YouTube"}</span>
          </a>`;
          })
          .join("")}</div>`
      : "";

  const pagelleHtml =
    stagione.pagelle && stagione.pagelle.length
      ? `<div class="pagelle-stagione-lista">${stagione.pagelle
          .map((p) => `<div class="pagella-stagione-card"><p class="pagella-stagione-nome">${p.nome}</p><p class="pagella-stagione-testo">${p.testo}</p></div>`)
          .join("")}</div>`
      : "";

  const curiositaTabHtml = `
    ${hv_blocEspandibile("classifica-sa", "Classifica Serie A", "assets/icone/icon-raking.png", classificaHtml)}
    ${hv_blocEspandibile("top-marcatori", "Classifica migliori 10 marcatori", "assets/icone/icon-migliori10marcatori.png", marcatoriHtml)}
    ${hv_blocEspandibile("curiosita", `Curiosità dell'anno ${stagione.anno}`, "assets/icone/icon-curiosita.png", curiositaHtml)}
  `;

  const squadreTabHtml = `
    ${roseHtml}
    <h3 class="squadra-block-title" style="margin-top: 26px;"><img src="assets/icone/icon-pagella.png" class="icona-titolo" alt="">Pagelle</h3>
    <div id="pagelle-lista-wrap">${pagelleHtml}</div>
    <div id="pagelle-admin-form"></div>
  `;

  wrap.innerHTML = `
    <div class="sotto-tab-nav">
      <button type="button" class="sotto-tab-btn active" data-tab="home">Home</button>
      <button type="button" class="sotto-tab-btn" data-tab="curiosita">Curiosità</button>
      <button type="button" class="sotto-tab-btn" data-tab="squadre">Squadre</button>
    </div>
    <div id="sotto-tab-home" class="sotto-tab-contenuto">
      ${vincitoriHtml}
      <h3 class="squadra-block-title" style="margin-top: 22px;"><img src="assets/icone/icon-highlights.png" class="icona-titolo" alt="">Video</h3>
      <div id="video-lista-wrap">${videoHtml}</div>
      <div id="video-admin-form"></div>
    </div>
    <div id="sotto-tab-curiosita" class="sotto-tab-contenuto hidden">${curiositaTabHtml}</div>
    <div id="sotto-tab-squadre" class="sotto-tab-contenuto hidden">${squadreTabHtml}</div>
  `;

  wrap.querySelectorAll(".sotto-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".sotto-tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      wrap.querySelectorAll(".sotto-tab-contenuto").forEach((c) => c.classList.add("hidden"));
      document.getElementById("sotto-tab-" + btn.dataset.tab).classList.remove("hidden");
    });
  });

  wrap.querySelectorAll(".sezione-toggle").forEach((titolo) => {
    titolo.addEventListener("click", () => {
      const contenuto = document.getElementById(titolo.dataset.target);
      if (!contenuto) return;
      titolo.classList.toggle("collassato");
      contenuto.classList.toggle("collassato");
    });
  });

  hv_renderVideoAdminForm(stagione);
  hv_renderPagelleAdminForm(stagione);
}

// ===== Cambio vista: Albo d'oro <-> Lista =====
function hv_attivaVista(nome) {
  document.querySelectorAll(".archivio-nav-item").forEach((b) => b.classList.toggle("active", b.dataset.vista === nome));
  document.getElementById("vista-albo").classList.toggle("hidden", nome !== "albo");
  document.getElementById("vista-lista").classList.toggle("hidden", nome !== "lista");
}

// ===== Init =====
let hv_archivioConfig = null;

async function hv_initArchivio(config) {
  hv_archivioConfig = config;
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
