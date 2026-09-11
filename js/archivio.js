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

// Card di un singolo video in stile "embed": miniatura a piena larghezza,
// cliccabile. Il click sostituisce solo la miniatura con l'iframe YouTube
// (autoplay), senza cambiare scheda — vedi hv_wireVideoEmbed più sotto.
function hv_creaVideoEmbedHtml(v) {
  const id = hv_estraiIdYoutube(v.url);
  const titolo = (v.titolo || "Video").replace(/"/g, "&quot;");
  if (!id) {
    return `
      <div class="video-embed-card">
        <p class="video-embed-titolo">${titolo}</p>
        <div class="video-embed-player-wrap video-embed-vuoto">Link YouTube non riconosciuto</div>
      </div>`;
  }
  return `
    <div class="video-embed-card" data-video-id="${id}">
      <p class="video-embed-titolo">${titolo}</p>
      <div class="video-embed-player-wrap">
        <button type="button" class="video-embed-thumb" aria-label="Guarda: ${titolo}">
          <img src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">
          <span class="video-embed-play">▶</span>
        </button>
      </div>
    </div>`;
}

// Aggancia il click delle miniature dentro un contenitore: al primo click si
// sostituisce con l'iframe del player e si resta lì (non serve più cliccare).
function hv_wireVideoEmbed(container) {
  if (!container) return;
  container.querySelectorAll(".video-embed-thumb").forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        const card = btn.closest(".video-embed-card");
        const wrap = card.querySelector(".video-embed-player-wrap");
        const titoloEl = card.querySelector(".video-embed-titolo");
        const titoloAttr = titoloEl ? titoloEl.textContent.replace(/"/g, "&quot;") : "Video";
        wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${card.dataset.videoId}?autoplay=1&rel=0" title="${titoloAttr}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      },
      { once: true }
    );
  });
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

// Cache condivisa di squadre reali/giocatori/foto manuali, popolata da
// hv_mostraStagione: serve anche a hv_fotoStorica quando viene richiamata più
// tardi (es. dopo un salvataggio pagelle) senza dover ricaricare i JSON ogni
// volta.
let hv_archivioSquadreRef = null;
let hv_archivioGiocatoriDb = null;
let hv_archivioFotoStoriche = [];

// Carica data/foto-storiche.json. Se il file manca o non è ancora valido
// (es. prima volta che si usa questa funzione, repository non aggiornato)
// non blocca il resto della pagina: restituisce semplicemente un elenco
// vuoto, come se nessuna foto manuale fosse ancora stata caricata.
async function hv_caricaFotoStoricheArchivio() {
  try {
    const res = await fetch("data/foto-storiche.json");
    if (!res.ok) return [];
    const data = await res.json();
    return data.foto || [];
  } catch (err) {
    return [];
  }
}

// Cerca tra le foto caricate a mano (data/foto-storiche.json). Abbinamento
// per nome normalizzato (stessa normalizzazione usata per il database
// principale); se la voce manuale specifica anche una squadra reale, deve
// combaciare — serve a distinguere due giocatori diversi con lo stesso
// cognome caricati separatamente.
function hv_trovaFotoManualeStorica(nome, squadraRealeNome) {
  if (!hv_archivioFotoStoriche.length) return null;
  const norm = hv_normalizzaNomeGiocatore(nome);
  if (!norm) return null;
  return (
    hv_archivioFotoStoriche.find((f) => {
      if (hv_normalizzaNomeGiocatore(f.nome) !== norm) return false;
      if (!f.squadraReale) return true;
      return f.squadraReale.toLowerCase() === (squadraRealeNome || "").toLowerCase();
    }) || null
  );
}

// Foto giocatore per una voce di marcatori/rosa storica. Ordine di ricerca:
// 1) una foto caricata a mano per questo giocatore, 2) il database della
// stagione CORRENTE (per chi gioca ancora), 3) iniziali. Per le stagioni
// vecchie è normale che molti non trovino corrispondenza al punto 2 — è
// voluto, non un difetto. Con consentiCaricamento=true (solo dalle rose,
// solo per admin con GitHub configurato) le iniziali diventano cliccabili
// per caricare una foto al volo.
function hv_fotoStorica(nome, squadraRealeNome, consentiCaricamento) {
  const manuale = hv_trovaFotoManualeStorica(nome, squadraRealeNome);
  if (manuale) return `<img src="${manuale.immagine}?v=${Date.now()}" class="foto-giocatore-mini" alt="">`;

  const codice = squadraRealeNome ? hv_trovaCodice(squadraRealeNome, hv_archivioSquadreRef) : null;
  const giocatoreDb = hv_trovaGiocatore(nome, codice, hv_archivioGiocatoriDb);
  if (giocatoreDb && giocatoreDb.foto) return `<img src="${giocatoreDb.foto}" class="foto-giocatore-mini" alt="">`;

  const iniziali = hv_inizialiGiocatore(nome);
  const puoCaricare =
    consentiCaricamento && window.hv_role === "admin" && hv_archivioConfig && hv_archivioConfig.lega.githubOwner && hv_archivioConfig.lega.githubRepo;
  if (puoCaricare) {
    const nomeAttr = (nome || "").replace(/"/g, "&quot;");
    const squadraAttr = (squadraRealeNome || "").replace(/"/g, "&quot;");
    return `
      <label class="foto-giocatore-carica" title="Carica una foto per ${nomeAttr}" data-nome="${nomeAttr}" data-squadra-reale="${squadraAttr}">
        <span class="foto-giocatore-iniziali">${iniziali}</span>
        <span class="foto-giocatore-carica-badge">+</span>
        <input type="file" accept="image/*" class="foto-giocatore-carica-input" style="display:none;">
      </label>`;
  }
  return `<span class="foto-giocatore-iniziali">${iniziali}</span>`;
}

// Aggancia il caricamento foto: al cambio del file, carica su GitHub,
// aggiorna la cache locale e ridisegna la scheda del fantallenatore corrente
// così la nuova foto compare subito, senza ricaricare la pagina.
function hv_wireCaricaFotoStorica(container, stagione) {
  container.querySelectorAll(".foto-giocatore-carica-input").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      const label = input.closest(".foto-giocatore-carica");
      const nome = label.dataset.nome;
      const squadraReale = label.dataset.squadraReale;
      const badge = label.querySelector(".foto-giocatore-carica-badge");
      badge.textContent = "…";
      try {
        const entry = await hv_caricaFotoStoricaViaGitHub(nome, squadraReale, file, hv_archivioConfig);
        hv_archivioFotoStoriche = hv_archivioFotoStoriche.filter(
          (f) => !(hv_normalizzaNomeGiocatore(f.nome) === hv_normalizzaNomeGiocatore(entry.nome) && (f.squadraReale || "") === (entry.squadraReale || ""))
        );
        hv_archivioFotoStoriche.push(entry);
        const tabAttivo = document.querySelector(".squadra-persona-tab.active");
        hv_renderSquadreTab(stagione, tabAttivo ? tabAttivo.textContent : null);
      } catch (err) {
        badge.textContent = "+";
        label.title = "Errore: " + err.message;
      }
    });
  });
}

// Elenco dei nomi delle fantasquadre di una stagione, per i bottoni della tab
// "Squadre" dell'Archivio: prima i nomi che hanno una rosa storica (nell'ordine
// in cui compaiono in stagione.rose), poi eventuali nomi che hanno SOLO la
// pagella e nessuna rosa — senza doppioni.
function hv_elencoNomiSquadreStoriche(stagione) {
  const nomi = [];
  (stagione.rose || []).forEach((r) => {
    if (r.squadra && !nomi.includes(r.squadra)) nomi.push(r.squadra);
  });
  (stagione.pagelle || []).forEach((p) => {
    if (p.nome && !nomi.includes(p.nome)) nomi.push(p.nome);
  });
  return nomi;
}

// Colore della card pagella storica (stessa soglia della pagella asta attuale
// in js/squadre.js, duplicata qui per lo stesso motivo delle altre funzioni:
// archivio.html non carica squadre.js).
function hv_statoVotoStorico(voto) {
  if (voto >= 7) return "promosso";
  if (voto >= 5.5) return "medio";
  return "bocciato";
}

// Emoji automatica in base al voto, scelta da Claude come richiesto — 5
// fasce, dalla più bassa alla più alta. Nessun campo manuale: cambia
// automaticamente insieme al voto, sia in anteprima admin sia nella card.
function hv_emojiAutomaticaStorica(voto) {
  if (voto == null || voto === "") return "";
  const v = Number(voto);
  if (v >= 9) return "👑";
  if (v >= 7) return "🔥";
  if (v >= 5.5) return "🙂";
  if (v >= 4) return "😬";
  return "🤦";
}

// Effetto "lucido" della medaglia al passaggio del mouse — stessa idea di
// hv_medagliaShine in js/squadre.js, duplicata per lo stesso motivo.
function hv_medagliaShineArchivio(el) {
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

// Etichetta della fase mostrata sopra la rosa, solo quando per questo
// partecipante ce n'è più di una (asta iniziale + dopo la riparazione).
const HV_ETICHETTA_FASE_ROSA = { iniziale: "Rosa — asta iniziale", riparazione: "Rosa — dopo la riparazione" };

// Contenuto per UN solo fantallenatore selezionato: la sua rosa storica (se
// c'è, anche più di una se ci sono sia l'asta iniziale che la riparazione)
// e la sua pagella (se c'è). Se manca qualcosa, si mostra solo quello che è
// disponibile, senza scrivere "non disponibile" ecc.
function hv_contenutoSquadraStorica(stagione, nome) {
  const roseTrovate = (stagione.rose || [])
    .filter((r) => r.squadra === nome)
    .sort((a, b) => (a.fase === "riparazione" ? 1 : 0) - (b.fase === "riparazione" ? 1 : 0));
  const pagella = (stagione.pagelle || []).find((p) => p.nome === nome);

  if (!roseTrovate.length && !pagella) {
    return '<p class="empty-state">Nessun dato ancora disponibile per questo partecipante in questa stagione.</p>';
  }

  const rosaHtml = roseTrovate
    .map((rosa) => {
      const etichetta = roseTrovate.length > 1 ? HV_ETICHETTA_FASE_ROSA[rosa.fase] || "Rosa" : null;
      const stemmaHtml = rosa.stemmaPiccolo || rosa.stemma ? `<img src="${rosa.stemmaPiccolo || rosa.stemma}" class="rosa-storica-stemma" alt="">` : "";
      const videoRosaHtml =
        rosa.video && rosa.video.length
          ? `<div class="video-embed-lista" style="margin-top: 14px;">${rosa.video.map((v) => hv_creaVideoEmbedHtml(v)).join("")}</div>`
          : "";
      return `
        ${etichetta ? `<p class="rosa-storica-fase-label">${etichetta}</p>` : ""}
        <div class="rosa-storica-card"${roseTrovate.length > 1 ? ' style="margin-bottom: 14px;"' : ""}>
          <p class="rosa-storica-nome">${stemmaHtml}${rosa.squadra}</p>
          <ul class="rosa-storica-lista">
            ${rosa.giocatori
              .map((g) => {
                const nomeG = typeof g === "string" ? g : g.nome;
                const squadraReale = typeof g === "object" ? g.squadraReale : null;
                return `<li>${hv_fotoStorica(nomeG, squadraReale, true)}${nomeG}</li>`;
              })
              .join("")}
          </ul>
          ${videoRosaHtml}
        </div>`;
    })
    .join("");

  const pagellaHtml = pagella
    ? pagella.voto != null && pagella.voto !== ""
      ? `<div class="pagella-card ${hv_statoVotoStorico(Number(pagella.voto))} pagella-storica-card">
          <div class="pagella-medaglia-wrap">
            <div class="pagella-medaglia">
              <span class="pagella-medaglia-voto">${pagella.voto}</span>
            </div>
            <span class="pagella-medaglia-charm">${hv_emojiAutomaticaStorica(pagella.voto)}</span>
          </div>
          <p class="pagella-commento pagella-commento-storica">${pagella.testo || ""}</p>
        </div>`
      : `<div class="pagella-stagione-card"><p class="pagella-stagione-nome">${pagella.nome}</p><p class="pagella-stagione-testo">${pagella.testo}</p></div>`
    : "";

  return `
    ${rosaHtml}
    ${pagellaHtml ? `<h3 class="squadra-block-title" style="margin-top: ${rosaHtml ? "18px" : "0"};"><img src="assets/icone/icon-pagella.png" class="icona-titolo" alt="">Pagella</h3>${pagellaHtml}` : ""}
  `;
}

// Aggancia l'effetto "lucido" alla medaglia, se presente nel contenuto appena
// disegnato (le pagelle senza voto non hanno medaglia, quindi non fa nulla).
function hv_wirePagellaStorica(container) {
  const medaglia = container.querySelector(".pagella-medaglia");
  if (medaglia) hv_medagliaShineArchivio(medaglia);
}

// Costruisce la tab "Squadre" (bottoni orizzontali scrollabili, stile
// identico alla barra anni, + il contenuto del fantallenatore selezionato) e
// aggancia i click. Richiamata sia al primo caricamento della stagione, sia
// dopo ogni salvataggio pagelle, così i bottoni restano sempre aggiornati.
function hv_renderSquadreTab(stagione, nomeDaSelezionare) {
  const navWrap = document.getElementById("squadre-persona-tabs");
  const contentWrap = document.getElementById("squadra-persona-content");
  if (!navWrap || !contentWrap) return;

  const nomi = hv_elencoNomiSquadreStoriche(stagione);

  if (!nomi.length) {
    navWrap.innerHTML = "";
    contentWrap.innerHTML = '<p class="empty-state">Rose e pagelle non ancora caricate per questa stagione.</p>';
    return;
  }

  let indiceIniziale = nomeDaSelezionare ? nomi.indexOf(nomeDaSelezionare) : 0;
  if (indiceIniziale < 0) indiceIniziale = 0;

  navWrap.innerHTML = nomi
    .map((n, i) => `<button type="button" class="anno-tab squadra-persona-tab${i === indiceIniziale ? " active" : ""}" data-i="${i}">${n}</button>`)
    .join("");
  contentWrap.innerHTML = hv_contenutoSquadraStorica(stagione, nomi[indiceIniziale]);
  hv_wirePagellaStorica(contentWrap);
  hv_wireCaricaFotoStorica(contentWrap, stagione);
  hv_wireVideoEmbed(contentWrap);

  navWrap.querySelectorAll(".squadra-persona-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      navWrap.querySelectorAll(".squadra-persona-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      contentWrap.innerHTML = hv_contenutoSquadraStorica(stagione, nomi[Number(btn.dataset.i)]);
      hv_wirePagellaStorica(contentWrap);
      hv_wireCaricaFotoStorica(contentWrap, stagione);
      hv_wireVideoEmbed(contentWrap);
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  });
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
        stagione.video = daSalvare;
        righe = daSalvare.map((v) => ({ titolo: v.titolo, url: v.url }));
        righe.push({ titolo: "", url: "" });
        disegna();
        document.getElementById("video-admin-stato").textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
        document.getElementById("video-admin-stato").style.color = "var(--verde-prato)";

        // Aggiorno anche l'anteprima già visibile, senza dover ricaricare la pagina
        const listaWrap = document.getElementById("video-lista-wrap");
        listaWrap.innerHTML = daSalvare.length ? `<div class="video-embed-lista">${daSalvare.map((v) => hv_creaVideoEmbedHtml(v)).join("")}</div>` : "";
        hv_wireVideoEmbed(listaWrap);
      } catch (err) {
        stato.textContent = "Errore: " + err.message;
        stato.style.color = "var(--wine-bright)";
      }
    });
  }

  disegna();
}

// Form admin per le pagelle di una stagione: righe dinamiche come il video,
// più un voto (facoltativo, 0-10) con emoji automatica in anteprima — la
// stessa scala di colori/soglie della pagella dell'asta in corso.
function hv_renderPagelleAdminForm(stagione) {
  const formWrap = document.getElementById("pagelle-admin-form");
  const config = hv_archivioConfig;

  if (!formWrap || window.hv_role !== "admin" || !config || !(config.lega.githubOwner && config.lega.githubRepo)) {
    if (formWrap) formWrap.innerHTML = "";
    return;
  }

  let righe = (stagione.pagelle || []).map((p) => ({ nome: p.nome || "", testo: p.testo || "", voto: p.voto ?? "" }));
  righe.push({ nome: "", testo: "", voto: "" });

  function disegna() {
    formWrap.innerHTML = `
      <div class="admin-box" style="background: var(--bg-void); margin-top: 14px; padding: 14px;">
        <p class="campo-titolo" style="margin: 0 0 10px;">Aggiungi/modifica le pagelle di questa stagione</p>
        <p class="muted" style="font-size:12px; margin: 0 0 10px;">Il voto è facoltativo: se lo metti, l'emoji si sceglie da sola (👑 9-10, 🔥 7-8.9, 🙂 5.5-6.9, 😬 4-5.4, 🤦 sotto 4) e compare la medaglia sul sito. Senza voto resta una semplice card di testo.</p>
        <div style="display:flex; flex-direction:column; gap:14px;">
          ${righe
            .map(
              (r, i) => `
            <div class="pagella-admin-riga" data-i="${i}">
              <div class="campo-riga" style="align-items:center; flex-wrap:wrap;">
                <input type="text" class="pagella-admin-nome" data-i="${i}" placeholder="Nome fantallenatore" value="${r.nome.replace(/"/g, "&quot;")}" style="flex:1; min-width:160px;">
                <input type="number" class="pagella-admin-voto" data-i="${i}" placeholder="Voto" step="0.5" min="0" max="10" value="${r.voto}" style="width:80px;">
                <span class="pagella-admin-emoji-anteprima" data-i="${i}" style="font-size:20px; width:26px; text-align:center;">${hv_emojiAutomaticaStorica(r.voto)}</span>
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
    formWrap.querySelectorAll(".pagella-admin-voto").forEach((el) => {
      el.addEventListener("input", () => {
        const i = Number(el.dataset.i);
        righe[i].voto = el.value;
        const anteprima = formWrap.querySelector(`.pagella-admin-emoji-anteprima[data-i="${i}"]`);
        if (anteprima) anteprima.textContent = hv_emojiAutomaticaStorica(el.value);
      });
    });
    formWrap.querySelectorAll(".pagella-admin-rimuovi").forEach((el) => {
      el.addEventListener("click", () => {
        righe.splice(Number(el.dataset.i), 1);
        disegna();
      });
    });
    document.getElementById("pagelle-admin-aggiungi").addEventListener("click", () => {
      righe.push({ nome: "", testo: "", voto: "" });
      disegna();
    });
    document.getElementById("pagelle-salva-btn").addEventListener("click", async () => {
      const stato = document.getElementById("pagelle-stato");
      const daSalvare = righe
        .filter((r) => r.nome.trim() || r.testo.trim())
        .map((r) => {
          const voce = { nome: r.nome.trim(), testo: r.testo.trim() };
          if (r.voto !== "" && r.voto != null) voce.voto = Number(r.voto);
          return voce;
        });
      stato.textContent = "Salvataggio in corso...";
      stato.style.color = "var(--text-muted)";
      try {
        await hv_salvaPagelleStagioneViaGitHub(stagione.anno, daSalvare, config);
        stagione.pagelle = daSalvare;
        righe = daSalvare.map((p) => ({ nome: p.nome, testo: p.testo, voto: p.voto ?? "" }));
        righe.push({ nome: "", testo: "", voto: "" });
        disegna();
        document.getElementById("pagelle-stato").textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
        document.getElementById("pagelle-stato").style.color = "var(--verde-prato)";

        // Riaggiorno i bottoni della tab "Squadre" (potrebbe essere comparso
        // o sparito un nome), cercando di restare sullo stesso partecipante
        // selezionato se è ancora tra le opzioni.
        const tabAttivo = document.querySelector(".squadra-persona-tab.active");
        hv_renderSquadreTab(stagione, tabAttivo ? tabAttivo.textContent : null);
      } catch (err) {
        stato.textContent = "Errore: " + err.message;
        stato.style.color = "var(--wine-bright)";
      }
    });
  }

  disegna();
}

// Trasforma il testo incollato (una colonna, o due colonne di Excel separate
// da tabulazione: nome + squadra reale) in un elenco di giocatori. Righe
// vuote ignorate. Se c'è solo il nome resta una stringa semplice (come già
// previsto dal formato); se c'è anche la squadra reale diventa un oggetto
// {nome, squadraReale}, che serve poi ad abbinare meglio la foto storica.
function hv_parsaIncollaRosa(testo) {
  return (testo || "")
    .split(/\r?\n/)
    .map((riga) => riga.trim())
    .filter((riga) => riga.length > 0)
    .map((riga) => {
      const parti = riga
        .split("\t")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      if (parti.length >= 2) return { nome: parti[0], squadraReale: parti[1] };
      return parti[0];
    });
}

// L'inverso: da un elenco giocatori già salvato al testo da rimettere nella
// casella (per poterlo ricontrollare/modificare e reincollare).
function hv_rosaComeTesto(giocatori) {
  return (giocatori || [])
    .map((g) => (typeof g === "string" ? g : g.squadraReale ? `${g.nome}\t${g.squadraReale}` : g.nome))
    .join("\n");
}

// Editor delle rose storiche: scegli una fantasquadra già presente in questa
// stagione (o scrivine una nuova), incolla la colonna (o le due colonne)
// copiate da Excel, vedi subito un'anteprima di quanti giocatori ho letto,
// poi salvi. Stessa filosofia degli altri form admin di questa pagina.
function hv_renderRoseAdminForm(stagione) {
  const formWrap = document.getElementById("rose-admin-form");
  const config = hv_archivioConfig;

  if (!formWrap || window.hv_role !== "admin" || !config || !(config.lega.githubOwner && config.lega.githubRepo)) {
    if (formWrap) formWrap.innerHTML = "";
    return;
  }

  const NUOVA = "__nuova__";
  let squadraSelezionata = NUOVA;
  let faseSelezionata = "iniziale";
  let testoIncolla = "";

  // La stessa fantasquadra può avere due rose nella stessa stagione (prima e
  // dopo l'asta di riparazione): l'abbinamento per trovare/salvare/rimuovere
  // è sempre sulla COPPIA nome+fase, mai sul nome da solo.
  function entryCorrente() {
    return (stagione.rose || []).find((r) => r.squadra === squadraSelezionata && (r.fase || "iniziale") === faseSelezionata);
  }

  function disegna() {
    const nomiEsistenti = [...new Set((stagione.rose || []).map((r) => r.squadra))];
    const giocatoriLetti = hv_parsaIncollaRosa(testoIncolla);
    const selettoreFase = `
      <select id="rose-admin-fase" style="min-width:180px;">
        <option value="iniziale"${faseSelezionata === "iniziale" ? " selected" : ""}>Asta iniziale</option>
        <option value="riparazione"${faseSelezionata === "riparazione" ? " selected" : ""}>Dopo la riparazione</option>
      </select>`;

    formWrap.innerHTML = `
      <div class="admin-box" style="background: var(--bg-void); padding: 14px;">
        <p class="campo-titolo" style="margin: 0 0 10px;">Aggiungi/modifica una rosa storica</p>
        <p class="muted" style="font-size:12px; margin: 0 0 10px;">Se questa fantasquadra ha avuto sia l'asta iniziale che una di riparazione nella stessa stagione, salvale come due voci separate scegliendo la fase giusta qui sotto: restano entrambe visibili, una sotto l'altra.</p>
        <div class="campo-riga" style="align-items:center; flex-wrap:wrap; margin-bottom: 10px;">
          <select id="rose-admin-select" style="flex:1; min-width:200px;">
            <option value="${NUOVA}"${squadraSelezionata === NUOVA ? " selected" : ""}>+ Nuova fantasquadra</option>
            ${nomiEsistenti
              .map((n) => `<option value="${n.replace(/"/g, "&quot;")}"${n === squadraSelezionata ? " selected" : ""}>Modifica: ${n}</option>`)
              .join("")}
          </select>
          ${selettoreFase}
        </div>
        ${
          squadraSelezionata === NUOVA
            ? `<input type="text" id="rose-admin-nome-nuova" placeholder="Nome della fantasquadra di quella stagione" style="margin-bottom: 10px;">`
            : `<p class="muted" style="font-size:12px; margin: 0 0 10px;">Stai modificando: <strong>${squadraSelezionata}</strong> (${faseSelezionata === "riparazione" ? "dopo la riparazione" : "asta iniziale"}). Il testo qui sotto è già precompilato se questa fase esiste già: correggilo e salva, oppure sostituiscilo del tutto reincollando da Excel.</p>`
        }
        <p class="muted" style="font-size:12px; margin: 0 0 6px;">Incolla qui la colonna dei nomi copiata da Excel (un giocatore per riga). Se copi ANCHE la colonna della squadra reale accanto, Excel la incolla già separata: la leggo da sola e la uso per abbinare meglio la foto.</p>
        <textarea id="rose-admin-incolla" rows="8" placeholder="Osimhen&#10;Lautaro&#10;Vlahovic	Juventus" style="font-family: var(--font-mono); font-size:12.5px;">${testoIncolla.replace(/</g, "&lt;")}</textarea>
        <p id="rose-admin-conteggio" class="muted" style="font-size:12px; margin: 8px 0;">
          ${giocatoriLetti.length ? `Ho letto <strong>${giocatoriLetti.length}</strong> giocatore${giocatoriLetti.length === 1 ? "" : "i"}.` : "Ancora nessun giocatore incollato."}
        </p>
        ${
          giocatoriLetti.length
            ? `<div id="rose-admin-anteprima" style="max-height:160px; overflow-y:auto; border:1px solid var(--border-hairline); border-radius:8px; padding:8px 10px; margin-bottom:10px;">
                ${giocatoriLetti
                  .map((g) => {
                    const nome = typeof g === "string" ? g : g.nome;
                    const sq = typeof g === "object" ? g.squadraReale : null;
                    return `<div style="font-size:12.5px; padding:2px 0; display:flex; justify-content:space-between; gap:8px;"><span>${nome}</span>${sq ? `<span class="muted">${sq}</span>` : ""}</div>`;
                  })
                  .join("")}
              </div>`
            : ""
        }
        <button type="button" id="rose-admin-salva">Salva questa rosa</button>
        ${
          squadraSelezionata !== NUOVA && entryCorrente()
            ? `<button type="button" id="rose-admin-rimuovi" style="margin-left:8px; background: var(--wine); color: var(--text-primary);">Rimuovi questa rosa</button>`
            : ""
        }
        <p id="rose-admin-stato" class="muted" style="font-size: 12px; margin-top: 8px;"></p>
      </div>
    `;

    document.getElementById("rose-admin-select").addEventListener("change", (e) => {
      squadraSelezionata = e.target.value;
      const esistente = entryCorrente();
      testoIncolla = esistente ? hv_rosaComeTesto(esistente.giocatori) : "";
      disegna();
    });

    document.getElementById("rose-admin-fase").addEventListener("change", (e) => {
      faseSelezionata = e.target.value;
      const esistente = entryCorrente();
      testoIncolla = esistente ? hv_rosaComeTesto(esistente.giocatori) : "";
      disegna();
    });

    document.getElementById("rose-admin-incolla").addEventListener("input", (e) => {
      testoIncolla = e.target.value;
      const contatore = document.getElementById("rose-admin-conteggio");
      const n = hv_parsaIncollaRosa(testoIncolla).length;
      contatore.innerHTML = n ? `Ho letto <strong>${n}</strong> giocatore${n === 1 ? "" : "i"}.` : "Ancora nessun giocatore incollato.";
      // L'anteprima elenco sotto si ridisegna solo al prossimo giro (blur/salva),
      // per non ridisegnare l'intero form a ogni tasto premuto e perdere il focus.
    });

    document.getElementById("rose-admin-incolla").addEventListener("blur", () => disegna());

    document.getElementById("rose-admin-salva").addEventListener("click", async () => {
      const stato = document.getElementById("rose-admin-stato");
      const nomeNuovaInput = document.getElementById("rose-admin-nome-nuova");
      const nomeSquadra = squadraSelezionata === NUOVA ? (nomeNuovaInput ? nomeNuovaInput.value.trim() : "") : squadraSelezionata;
      const fase = faseSelezionata;
      const giocatori = hv_parsaIncollaRosa(testoIncolla);

      if (!nomeSquadra) {
        stato.textContent = "Serve il nome della fantasquadra.";
        stato.style.color = "var(--wine-bright)";
        return;
      }
      if (!giocatori.length) {
        stato.textContent = "Incolla almeno un giocatore prima di salvare.";
        stato.style.color = "var(--wine-bright)";
        return;
      }

      stato.textContent = "Salvataggio in corso...";
      stato.style.color = "var(--text-muted)";
      try {
        const roseAggiornate = (stagione.rose || []).filter((r) => !(r.squadra === nomeSquadra && (r.fase || "iniziale") === fase));
        roseAggiornate.push({ squadra: nomeSquadra, fase, giocatori });
        await hv_salvaRoseStagioneViaGitHub(stagione.anno, roseAggiornate, config);
        stagione.rose = roseAggiornate;
        squadraSelezionata = nomeSquadra;
        disegna();
        document.getElementById("rose-admin-stato").textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
        document.getElementById("rose-admin-stato").style.color = "var(--verde-prato)";

        const tabAttivo = document.querySelector(".squadra-persona-tab.active");
        hv_renderSquadreTab(stagione, tabAttivo ? tabAttivo.textContent : nomeSquadra);
      } catch (err) {
        stato.textContent = "Errore: " + err.message;
        stato.style.color = "var(--wine-bright)";
      }
    });

    const btnRimuovi = document.getElementById("rose-admin-rimuovi");
    if (btnRimuovi) {
      btnRimuovi.addEventListener("click", async () => {
        const stato = document.getElementById("rose-admin-stato");
        stato.textContent = "Rimozione in corso...";
        stato.style.color = "var(--text-muted)";
        try {
          const roseAggiornate = (stagione.rose || []).filter(
            (r) => !(r.squadra === squadraSelezionata && (r.fase || "iniziale") === faseSelezionata)
          );
          await hv_salvaRoseStagioneViaGitHub(stagione.anno, roseAggiornate, config);
          stagione.rose = roseAggiornate;
          squadraSelezionata = NUOVA;
          faseSelezionata = "iniziale";
          testoIncolla = "";
          disegna();
          document.getElementById("rose-admin-stato").textContent = "Rimossa ✓";
          document.getElementById("rose-admin-stato").style.color = "var(--verde-prato)";
          hv_renderSquadreTab(stagione);
        } catch (err) {
          stato.textContent = "Errore: " + err.message;
          stato.style.color = "var(--wine-bright)";
        }
      });
    }
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
  const [squadreRef, giocatoriDb, fotoStoriche] = await Promise.all([hv_caricaSquadreRef(), hv_caricaGiocatoriDb(), hv_caricaFotoStoricheArchivio()]);
  hv_archivioSquadreRef = squadreRef;
  hv_archivioGiocatoriDb = giocatoriDb;
  hv_archivioFotoStoriche = fotoStoriche;

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
  const videoHtml =
    stagione.video && stagione.video.length
      ? `<div class="video-embed-lista">${stagione.video.map((v) => hv_creaVideoEmbedHtml(v)).join("")}</div>`
      : "";

  const curiositaTabHtml = `
    ${hv_blocEspandibile("classifica-sa", "Classifica Serie A", "assets/icone/icon-raking.png", classificaHtml)}
    ${hv_blocEspandibile("top-marcatori", "Classifica migliori 10 marcatori", "assets/icone/icon-migliori10marcatori.png", marcatoriHtml)}
    ${hv_blocEspandibile("curiosita", `Curiosità dell'anno ${stagione.anno}`, "assets/icone/icon-curiosita.png", curiositaHtml)}
  `;

  const squadreTabHtml = `
    <div id="squadre-persona-tabs" class="tabs"></div>
    <div id="squadra-persona-content"></div>
    <div id="pagelle-admin-form" style="margin-top: 22px;"></div>
    <div id="rose-admin-form" style="margin-top: 22px;"></div>
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
  hv_renderRoseAdminForm(stagione);
  hv_renderSquadreTab(stagione);
  hv_wireVideoEmbed(document.getElementById("video-lista-wrap"));
}

// ===== Audio storici (Archivio) =====
// Un solo player alla volta: se ne parte un altro, quello prima si ferma.
// L'onda è disegnata leggendo i campioni AUDIO VERI con l'AnalyserNode della
// Web Audio API — non è un'animazione finta, reagisce davvero al volume.
let hv_audioContext = null;
let hv_audioAttivo = null;

function hv_ottieniAudioContext() {
  if (!hv_audioContext) hv_audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return hv_audioContext;
}

function hv_fermaAudioStorico() {
  if (!hv_audioAttivo) return;
  hv_audioAttivo.audio.pause();
  hv_audioAttivo.audio.currentTime = 0;
  cancelAnimationFrame(hv_audioAttivo.animId);
  hv_audioAttivo.tile.classList.remove("in-riproduzione");
  const ctx2d = hv_audioAttivo.canvas.getContext("2d");
  ctx2d.clearRect(0, 0, hv_audioAttivo.canvas.width, hv_audioAttivo.canvas.height);
  const icona = hv_audioAttivo.tile.querySelector(".audio-storico-icona");
  if (icona) icona.textContent = "▶";
  hv_audioAttivo = null;
}

function hv_disegnaOndaAudio(stato) {
  const ctx2d = stato.canvas.getContext("2d");
  const dataArray = new Uint8Array(stato.analyser.frequencyBinCount);

  function loop() {
    stato.analyser.getByteTimeDomainData(dataArray);
    ctx2d.clearRect(0, 0, stato.canvas.width, stato.canvas.height);
    ctx2d.beginPath();
    const slice = stato.canvas.width / dataArray.length;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * stato.canvas.height) / 2;
      if (i === 0) ctx2d.moveTo(x, y);
      else ctx2d.lineTo(x, y);
      x += slice;
    }
    ctx2d.strokeStyle = "#39ff14";
    ctx2d.lineWidth = 2;
    ctx2d.stroke();
    stato.animId = requestAnimationFrame(loop);
  }
  loop();
}

// Fa partire (o ferma, se era già in riproduzione) l'audio di un riquadro.
// Il nodo audio va creato UNA SOLA VOLTA per elemento <audio> (limite della
// Web Audio API), quindi lo tengo agganciato al riquadro stesso.
function hv_avviaAudioStorico(tile, url) {
  if (hv_audioAttivo && hv_audioAttivo.tile === tile) {
    hv_fermaAudioStorico();
    return;
  }
  hv_fermaAudioStorico();

  const audio = tile._audioEl || (tile._audioEl = new Audio());
  audio.src = url;
  audio.crossOrigin = "anonymous";

  const canvas = tile.querySelector(".audio-storico-onda");
  const ctxAudio = hv_ottieniAudioContext();
  if (ctxAudio.state === "suspended") ctxAudio.resume();

  if (!tile._analyser) {
    const sourceNode = ctxAudio.createMediaElementSource(audio);
    tile._analyser = ctxAudio.createAnalyser();
    tile._analyser.fftSize = 256;
    sourceNode.connect(tile._analyser);
    tile._analyser.connect(ctxAudio.destination);
  }

  hv_audioAttivo = { audio, tile, canvas, analyser: tile._analyser, animId: null };
  tile.classList.add("in-riproduzione");
  const icona = tile.querySelector(".audio-storico-icona");
  if (icona) icona.textContent = "❚❚";
  audio.play();
  hv_disegnaOndaAudio(hv_audioAttivo);

  audio.addEventListener(
    "ended",
    () => {
      if (hv_audioAttivo && hv_audioAttivo.tile === tile) hv_fermaAudioStorico();
    },
    { once: true }
  );
}

async function hv_renderAudioStorici(messaggioIniziale, fileSelezionatiIniziali) {
  const griglia = document.getElementById("audio-storici-griglia");
  griglia.innerHTML = '<p class="empty-state">Carico...</p>';

  let audioLista = [];
  try {
    const res = await fetch("data/audio-storici.json");
    const data = await res.json();
    audioLista = data.audio || [];
  } catch (err) {
    griglia.innerHTML = `<p class="empty-state">Non riesco a caricare gli audio (${err.message}).</p>`;
    hv_renderAudioStoriciAdminForm(messaggioIniziale, fileSelezionatiIniziali);
    return;
  }

  if (!audioLista.length) {
    griglia.innerHTML = '<p class="empty-state">Nessun audio ancora caricato.</p>';
  } else {
    griglia.innerHTML = audioLista
      .map(
        (a) => `
      <div class="audio-storico-tile" data-id="${a.id}" data-file="${a.file}">
        <span class="audio-storico-icona">▶</span>
        <canvas class="audio-storico-onda" width="120" height="28"></canvas>
        <p class="audio-storico-testo">${a.testo}</p>
        ${window.hv_role === "admin" ? `<button type="button" class="audio-storico-rimuovi" data-id="${a.id}">Rimuovi</button>` : ""}
      </div>`
      )
      .join("");

    griglia.querySelectorAll(".audio-storico-tile").forEach((tile) => {
      tile.addEventListener("click", (e) => {
        if (e.target.classList.contains("audio-storico-rimuovi")) return;
        hv_avviaAudioStorico(tile, tile.dataset.file);
      });
    });
    griglia.querySelectorAll(".audio-storico-rimuovi").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm("Rimuovere questo audio? Non si può annullare.")) return;
        try {
          await hv_rimuoviAudioStoricoViaGitHub(btn.dataset.id, hv_archivioConfig);
          hv_renderAudioStorici();
        } catch (err) {
          alert("Errore: " + err.message);
        }
      });
    });
  }

  // Il messaggio (e gli eventuali file ancora da caricare dopo un errore a
  // metà lista) vanno passati QUI, dentro il form appena ricostruito — mai
  // scritti "dopo" su un pezzo di pagina che stiamo per sostituire, altrimenti
  // spariscono subito (bug corretto: prima capitava sempre, anche con 1 file).
  hv_renderAudioStoriciAdminForm(messaggioIniziale, fileSelezionatiIniziali);
}

// Titolo proposto di default: il nome del file senza estensione, con
// trattini/underscore trasformati in spazi — modificabile prima di caricare.
function hv_titoloDaNomeFileAudioStorico(nomeFile) {
  return nomeFile.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function hv_renderAudioStoriciAdminForm(messaggioIniziale, fileSelezionatiIniziali) {
  const formWrap = document.getElementById("audio-storici-admin-form");
  const config = hv_archivioConfig;
  if (!formWrap || window.hv_role !== "admin" || !config || !(config.lega.githubOwner && config.lega.githubRepo)) {
    if (formWrap) formWrap.innerHTML = "";
    return;
  }

  // File scelti ma non ancora caricati: puoi selezionarne più di uno insieme,
  // ognuno con un titolo modificabile (parte dal nome del file). Se arriviamo
  // qui dopo un errore a metà lista, quelli non ancora caricati restano qui
  // (non serve riselezionarli).
  let fileSelezionati = fileSelezionatiIniziali || [];

  function disegna() {
    formWrap.innerHTML = `
      <div class="admin-box" style="background: var(--bg-void); padding: 14px;">
        <p class="campo-titolo" style="margin: 0 0 10px;">Aggiungi uno o più audio storici</p>
        <input type="file" id="audio-storico-file" accept="audio/*" multiple>
        <p class="muted" style="font-size:12px; margin: 6px 0 0;">Puoi selezionarne più di uno insieme. Formati supportati: mp3, ogg, wav, m4a e altri audio del browser. Il titolo parte dal nome del file, modificalo pure prima di caricare. Massimo 5 MB a file.</p>
        ${
          fileSelezionati.length
            ? `<div style="display:flex; flex-direction:column; gap:8px; margin-top: 12px;">
                ${fileSelezionati
                  .map(
                    (f, i) => `
                  <div class="campo-riga" data-i="${i}" style="align-items:center;">
                    <input type="text" class="audio-storico-pending-titolo" data-i="${i}" value="${f.titolo.replace(/"/g, "&quot;")}" style="flex:1;">
                    <span class="muted" style="font-size:11px; white-space:nowrap;">${(f.file.size / 1024 / 1024).toFixed(1)} MB</span>
                    <button type="button" class="audio-storico-pending-rimuovi" data-i="${i}" title="Togli dalla lista">✕</button>
                  </div>`
                  )
                  .join("")}
              </div>
              <button type="button" id="audio-storico-carica-btn" style="margin-top: 10px;">Carica ${fileSelezionati.length > 1 ? `tutti (${fileSelezionati.length})` : ""}</button>`
            : ""
        }
        <p id="audio-storico-stato" class="muted" style="font-size: 12px; margin-top: 8px; color: ${messaggioIniziale ? messaggioIniziale.colore : "var(--text-muted)"};">${messaggioIniziale ? messaggioIniziale.testo : ""}</p>
      </div>
    `;

    document.getElementById("audio-storico-file").addEventListener("change", (e) => {
      const nuovi = Array.from(e.target.files).map((file) => ({ file, titolo: hv_titoloDaNomeFileAudioStorico(file.name) }));
      fileSelezionati = fileSelezionati.concat(nuovi);
      messaggioIniziale = null;
      disegna();
    });

    formWrap.querySelectorAll(".audio-storico-pending-titolo").forEach((el) => {
      el.addEventListener("input", () => (fileSelezionati[Number(el.dataset.i)].titolo = el.value));
    });
    formWrap.querySelectorAll(".audio-storico-pending-rimuovi").forEach((el) => {
      el.addEventListener("click", () => {
        fileSelezionati.splice(Number(el.dataset.i), 1);
        disegna();
      });
    });

    const btnCarica = document.getElementById("audio-storico-carica-btn");
    if (btnCarica) {
      btnCarica.addEventListener("click", async () => {
        const stato = document.getElementById("audio-storico-stato");
        for (let i = 0; i < fileSelezionati.length; i++) {
          const { file, titolo } = fileSelezionati[i];
          stato.textContent = `Caricamento ${i + 1} di ${fileSelezionati.length} ("${titolo || file.name}")...`;
          stato.style.color = "var(--text-muted)";
          try {
            await hv_caricaAudioStoricoViaGitHub(titolo.trim() || file.name, file, config);
          } catch (err) {
            const rimanenti = fileSelezionati.slice(i);
            await hv_renderAudioStorici(
              {
                testo: `Caricati ${i} su ${fileSelezionati.length}, poi errore su "${titolo || file.name}": ${err.message}. Gli altri ${rimanenti.length} sono rimasti nella lista, pronti per riprovare.`,
                colore: "var(--wine-bright)",
              },
              rimanenti
            );
            return;
          }
        }
        await hv_renderAudioStorici({ testo: "Caricati ✓ — il sito pubblico si aggiornerà tra circa un minuto.", colore: "var(--verde-prato)" });
      });
    }
  }

  disegna();
}

// ===== Cambio vista: Albo d'oro <-> Lista <-> Audio storici =====
let hv_audioStoriciCaricati = false;

function hv_attivaVista(nome) {
  document.querySelectorAll(".archivio-nav-item").forEach((b) => b.classList.toggle("active", b.dataset.vista === nome));
  document.getElementById("vista-albo").classList.toggle("hidden", nome !== "albo");
  document.getElementById("vista-lista").classList.toggle("hidden", nome !== "lista");
  document.getElementById("vista-audio").classList.toggle("hidden", nome !== "audio");
  if (nome !== "audio") hv_fermaAudioStorico();
  if (nome === "audio" && !hv_audioStoriciCaricati) {
    hv_audioStoriciCaricati = true;
    hv_renderAudioStorici();
  }
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
