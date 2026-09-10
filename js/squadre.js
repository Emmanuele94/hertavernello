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

// ===== Torta "da dove arriva la rosa" — distribuzione per squadra reale, CSS puro =====
const HV_PALETTE_TORTA = [
  "#FF6B6B", "#4ECDC4", "#FFD93D", "#6C5CE7", "#00B8A9", "#FF9F1C",
  "#2E86DE", "#E84393", "#00CEC9", "#FAB1A0", "#A29BFE", "#55EFC4",
  "#FD79A8", "#74B9FF", "#FFA502",
];

const HV_DERBY = [
  ["MIL", "INT"], // Derby della Madonnina
  ["ROM", "LAZ"], // Derby della Capitale
  ["TOR", "JUV"], // Derby della Mole
];

function hv_distribuzioneSquadreReali(giocatori, squadreRef) {
  const conteggio = {};
  giocatori.forEach((g) => {
    const cod = hv_trovaCodice(g.squadraReale, squadreRef);
    if (!cod) return;
    conteggio[cod] = (conteggio[cod] || 0) + 1;
  });
  const totale = Object.values(conteggio).reduce((a, b) => a + b, 0);
  const fette = Object.entries(conteggio)
    .map(([codice, n]) => ({ codice, n, percentuale: totale ? (n / totale) * 100 : 0 }))
    .sort((a, b) => b.n - a.n);
  return { fette, totale };
}

function hv_nomeSquadraReale(codice, squadreRef) {
  const s = squadreRef.squadre.find((x) => x.codice === codice);
  return s ? s.nome : codice;
}

function hv_soprannomeRosa(fette, squadreRef) {
  if (fette.length === 0) return null;
  const top = fette[0];
  const nome = (cod) => hv_nomeSquadraReale(cod, squadreRef);

  if (top.percentuale >= 50) {
    return { titolo: `Il Fedelissimo del ${nome(top.codice)}`, sotto: `${Math.round(top.percentuale)}% della rosa da una squadra sola` };
  }

  for (const [a, b] of HV_DERBY) {
    const fa = fette.find((f) => f.codice === a);
    const fb = fette.find((f) => f.codice === b);
    if (fa && fb && fa.percentuale + fb.percentuale >= 35) {
      return { titolo: "Lo Sfascia-derby", sotto: `${nome(a)} + ${nome(b)} insieme fanno ${Math.round(fa.percentuale + fb.percentuale)}% della rosa` };
    }
  }

  if (fette.length >= 12) {
    return { titolo: "Il Turista", sotto: `Giocatori pescati da ${fette.length} squadre diverse` };
  }

  if (top.percentuale >= 35) {
    return { titolo: `Il Tifoso del ${nome(top.codice)}`, sotto: `${Math.round(top.percentuale)}% della rosa da lì` };
  }

  return { titolo: "Il Generalista", sotto: "Rosa equilibrata, senza preferenze evidenti" };
}

// Lista a due colonne (icona, nome, barra, percentuale) — sostituisce il
// grafico a torta: con tante fette piccole (es. 10+ nazionalità diverse)
// il conic-gradient diventava illeggibile, con etichette che si accavallavano.
function hv_renderDistribuzioneLista(wrap, fette, iconaCartella, nomeFn, soprannome) {
  const righe = fette
    .map(
      (f) => `
    <div class="distribuzione-riga">
      <img src="${iconaCartella}/${f.codice}.png" alt="" class="distribuzione-icona">
      <span class="distribuzione-nome" title="${nomeFn(f.codice)}">${nomeFn(f.codice)}</span>
      <span class="distribuzione-barra-track"><span class="distribuzione-barra-fill" style="width:${f.percentuale}%;"></span></span>
      <span class="distribuzione-percentuale">${Math.round(f.percentuale)}%</span>
      <span class="distribuzione-conteggio">${f.n}</span>
    </div>`
    )
    .join("");

  wrap.innerHTML = `
    <div class="distribuzione-lista">${righe}</div>
    ${
      soprannome
        ? `<div class="torta-soprannome">
             <p class="torta-soprannome-titolo">${soprannome.titolo}</p>
             <p class="torta-soprannome-sotto">${soprannome.sotto}</p>
           </div>`
        : ""
    }
  `;
}

function hv_renderTortaSquadre(giocatori, squadreRef) {
  const wrap = document.getElementById("torta-squadre-content");
  if (!giocatori || giocatori.length === 0) {
    wrap.innerHTML = '<p class="empty-state">Nessuna rosa caricata ancora.</p>';
    return;
  }

  const { fette, totale } = hv_distribuzioneSquadreReali(giocatori, squadreRef);
  if (totale === 0) {
    wrap.innerHTML = '<p class="empty-state">Nessun giocatore abbinato a una squadra reale riconosciuta.</p>';
    return;
  }

  const soprannome = hv_soprannomeRosa(fette, squadreRef);
  hv_renderDistribuzioneLista(wrap, fette, "assets/loghi", (cod) => hv_nomeSquadraReale(cod, squadreRef), soprannome);
}

// ===== Torta "da dove arrivano i tuoi calciatori" — distribuzione per
// nazionalità, stesso identico meccanismo (conic-gradient CSS) di sopra,
// ora possibile grazie a data/giocatori.json. =====

function hv_distribuzioneNazioni(giocatori, squadreRef, giocatoriDb) {
  const conteggio = {};
  giocatori.forEach((g) => {
    const codiceSquadra = hv_trovaCodice(g.squadraReale, squadreRef);
    const giocatoreDb = hv_trovaGiocatore(g.nome, codiceSquadra, giocatoriDb);
    const naz = giocatoreDb ? giocatoreDb.nazionalitaCodice : null;
    if (!naz) return;
    conteggio[naz] = (conteggio[naz] || 0) + 1;
  });
  const totale = Object.values(conteggio).reduce((a, b) => a + b, 0);
  const fette = Object.entries(conteggio)
    .map(([codice, n]) => ({ codice, n, percentuale: totale ? (n / totale) * 100 : 0 }))
    .sort((a, b) => b.n - a.n);
  return { fette, totale };
}

function hv_soprannomeNazioni(fette, nazioni) {
  if (fette.length === 0) return null;
  const top = fette[0];
  const nome = (cod) => (nazioni ? nazioni[cod] || cod : cod);

  if (top.codice === "it" && top.percentuale >= 70) {
    return { titolo: "Il Nazionalista", sotto: `${Math.round(top.percentuale)}% di italiani in rosa` };
  }
  if (top.percentuale >= 60) {
    return { titolo: `L'Ambasciatore del ${nome(top.codice)}`, sotto: `${Math.round(top.percentuale)}% della rosa da lì` };
  }
  if (fette.length >= 10) {
    return { titolo: "Il Cosmopolita", sotto: `Giocatori da ${fette.length} nazionalità diverse` };
  }
  if (top.codice !== "it" && top.percentuale >= 30) {
    return { titolo: `Lo Straniero (di cuore ${nome(top.codice)})`, sotto: `${Math.round(top.percentuale)}% della rosa da lì` };
  }
  return { titolo: "La Legione Straniera", sotto: "Rosa internazionale, senza una vera preferenza" };
}

function hv_renderTortaNazioni(giocatori, squadreRef, giocatoriDb, nazioni) {
  const wrap = document.getElementById("torta-nazioni-content");
  wrap.classList.remove("torta-wip");
  if (!giocatori || giocatori.length === 0) {
    wrap.innerHTML = '<p class="empty-state">Nessuna rosa caricata ancora.</p>';
    return;
  }

  const { fette, totale } = hv_distribuzioneNazioni(giocatori, squadreRef, giocatoriDb);
  if (totale === 0) {
    wrap.innerHTML = '<p class="empty-state">Nessun giocatore abbinato a una nazionalità riconosciuta.</p>';
    return;
  }

  const soprannome = hv_soprannomeNazioni(fette, nazioni);
  hv_renderDistribuzioneLista(wrap, fette, "assets/bandiere", (cod) => (nazioni ? nazioni[cod] || cod : cod), soprannome);
}

// ===== Info partita accanto a ogni giocatore (giorno/ora, avversario, già giocata o no) =====
const HV_GIORNI_ABBR = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function hv_formattaGiornoOra(utcDateStr) {
  const d = new Date(utcDateStr);
  const giorno = HV_GIORNI_ABBR[d.getDay()];
  const ore = String(d.getHours()).padStart(2, "0");
  const minuti = String(d.getMinutes()).padStart(2, "0");
  return `${giorno} ${ore}:${minuti}`;
}

function hv_determinaGiornataCorrente(partiteStagione) {
  const inCorso = partiteStagione.find((p) => p.status === "IN_PLAY" || p.status === "PAUSED");
  if (inCorso) return inCorso.matchday;

  const nonConcluse = partiteStagione.filter(
    (p) => p.status !== "FINISHED" && p.status !== "POSTPONED" && p.status !== "CANCELLED" && p.matchday
  );
  if (nonConcluse.length === 0) return null;
  return Math.min(...nonConcluse.map((p) => p.matchday));
}

function hv_partitaGiaIniziata(match) {
  if (match.status === "FINISHED" || match.status === "IN_PLAY" || match.status === "PAUSED") return true;
  return match.data ? new Date(match.data).getTime() <= Date.now() : false;
}

function hv_infoPartitaGiocatore(codiceSquadra, giornataCorrente, partiteStagione) {
  if (!codiceSquadra || giornataCorrente == null) return null;
  const match = partiteStagione.find(
    (p) => p.matchday === giornataCorrente && (p.casaCodice === codiceSquadra || p.trasfertaCodice === codiceSquadra)
  );
  if (!match || !match.data) return null;

  const avversario = match.casaCodice === codiceSquadra ? match.trasfertaNome : match.casaNome;
  const giaGiocata = hv_partitaGiaIniziata(match);
  const oraTesto = hv_formattaGiornoOra(match.data);

  return {
    testo: giaGiocata ? `Giocato ${oraTesto} vs ${avversario}` : `${oraTesto} vs ${avversario}`,
    classe: giaGiocata ? "info-match-giocato" : "info-match-daGiocare",
  };
}

function hv_renderRoster(giocatori, squadreRef, giornataCorrente, partiteStagione, giocatoriDb, nazioni) {
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
        const info = codice && partiteStagione ? hv_infoPartitaGiocatore(codice, giornataCorrente, partiteStagione) : null;
        const infoHtml = info ? ` <span class="info-match ${info.classe}">${info.testo}</span>` : "";

        const giocatoreDb = giocatoriDb ? hv_trovaGiocatore(g.nome, codice, giocatoriDb) : null;
        const fotoHtml = giocatoreDb && giocatoreDb.foto
          ? `<img src="${giocatoreDb.foto}" class="foto-giocatore-mini" alt="">`
          : `<span class="foto-giocatore-iniziali">${hv_inizialiGiocatore(g.nome)}</span>`;
        const nazioneCodice = giocatoreDb ? giocatoreDb.nazionalitaCodice : null;
        const nazioneNome = nazioneCodice && nazioni ? nazioni[nazioneCodice] : null;
        const bandieraHtml = nazioneCodice
          ? `<span class="bandiera-wrap" data-tooltip-nazione>
               <img src="assets/bandiere/${nazioneCodice}.png" class="bandiera-mini" alt="${nazioneNome || ""}">
               <span class="bandiera-tooltip">${nazioneNome || ""}</span>
             </span>`
          : "";

        return `
        <tr>
          <td><span class="badge-ruolo ${ruolo.toLowerCase()}">${ruolo[0]}</span>${fotoHtml}${g.nome}${bandieraHtml}${infoHtml}</td>
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
  card.innerHTML = `
    <div class="pagella-medaglia-wrap">
      <div class="pagella-medaglia">
        <span class="pagella-medaglia-voto">${pagella.voto}</span>
      </div>
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
    img.src = "assets/previsioni/" + previsione.immagine + "?v=" + Date.now();
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

function hv_renderUploadAdmin(squadraId, config) {
  const wrap = document.getElementById("previsione-upload-admin");
  if (window.hv_role !== "admin") {
    wrap.innerHTML = "";
    return;
  }

  const abilitato = config.lega.githubOwner && config.lega.githubRepo;
  if (!abilitato) {
    wrap.innerHTML = '<p class="muted" style="font-size:12px; margin-top:10px;">Upload da sito non attivo: manca githubOwner/githubRepo in config.json.</p>';
    return;
  }

  wrap.innerHTML = `
    <label class="upload-admin-btn">
      Carica/aggiorna screenshot
      <input type="file" accept="image/*" id="previsione-file-input" style="display:none;">
    </label>
    <p id="previsione-upload-stato" class="muted" style="font-size:12px; margin-top:8px;"></p>
  `;

  document.getElementById("previsione-file-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const stato = document.getElementById("previsione-upload-stato");
    stato.textContent = "Caricamento in corso...";
    stato.style.color = "var(--text-muted)";

    try {
      const percorso = await hv_caricaPrevisioneViaGitHub(squadraId, file, config);
      stato.textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
      stato.style.color = "var(--verde-prato)";

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = "Previsione Serie A";
      img.className = "previsione-clickable";
      img.addEventListener("click", () => hv_apriLightbox(img.src));
      const contentWrap = document.getElementById("previsione-content");
      contentWrap.innerHTML = "";
      contentWrap.appendChild(img);
    } catch (err) {
      stato.textContent = "Errore: " + err.message;
      stato.style.color = "var(--wine-bright)";
    }
  });
}

function hv_calcolaBadgeGolReali(marcatori, rose, giocatoriDb, squadre) {
  if (!marcatori || marcatori.length === 0) return null;
  const golPerSquadra = {};
  squadre.forEach((s) => (golPerSquadra[s.id] = 0));

  marcatori.forEach((m) => {
    const giocatoreDb = hv_trovaGiocatore(m.nome, m.squadraCodice, giocatoriDb);
    if (!giocatoreDb) return;
    rose.forEach((r) => {
      const inRosa = r.giocatori.some((g) => g.nome === giocatoreDb.nome && g.squadraReale === giocatoreDb.squadraCodice);
      if (inRosa) golPerSquadra[r.squadraId] = (golPerSquadra[r.squadraId] || 0) + m.gol;
    });
  });

  const entries = Object.entries(golPerSquadra)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const nome = (id) => (squadre.find((s) => s.id === id) || {}).nomeFantasquadra || id;
  return { icona: "⚽", titolo: "Bomber di Lega", descrizione: `${nome(entries[0][0])} — ${entries[0][1]} gol reali tra i suoi giocatori`, squadraId: entries[0][0] };
}

async function hv_renderBadge(squadraId, risultati, rose, giocatoriDb, config) {
  const wrap = document.getElementById("squadra-badge-wrap");
  const badgePerSquadra = hv_calcolaBadge(risultati, config.squadre);
  const badgeSquadra = badgePerSquadra[squadraId] || [];

  // Badge "gol reali", solo se la chiave API è configurata — non blocca il resto
  // se manca o se l'API non risponde (limite del piano gratuito già segnalato altrove).
  let badgeGol = null;
  const apiKey = config.lega.footballDataApiKey;
  if (apiKey && rose && rose.length > 0) {
    try {
      const squadreRef = await hv_caricaSquadreRef();
      const { dati: marcatori } = await hv_cacheOFetch("hv_cache_marcatori", 6 * 60 * 60 * 1000, () => hv_getTopScorers(apiKey, squadreRef));
      const b = hv_calcolaBadgeGolReali(marcatori, rose, giocatoriDb, config.squadre);
      if (b && b.squadraId === squadraId) badgeGol = b;
    } catch (e) {
      // silenzioso: il badge gol è un extra, non deve rompere il resto della pagina
    }
  }

  const tutti = [...badgeSquadra, ...(badgeGol ? [badgeGol] : [])];
  if (tutti.length === 0) {
    wrap.innerHTML = "";
    return;
  }

  wrap.innerHTML = tutti
    .map(
      (b) => `<div class="badge-pill" title="${b.descrizione}"><span class="badge-pill-icona">${b.icona}</span>${b.titolo}</div>`
    )
    .join("");
}

function hv_renderIntestazioneSquadra(squadra, logo, posizioneLega) {
  document.getElementById("squadra-nome-grande").textContent = squadra.nomeFantasquadra || squadra.nomeReale;

  // Logo piccolo (512x512 caricato) + posizione in classifica, insieme in un
  // riquadro a fianco del nome. 72px è un display sicuro: parte da un originale
  // di 512px, quindi a 72px resta nitido (è un forte rimpicciolimento, non un
  // ingrandimento — l'effetto "sgranato" scatterebbe solo mostrandolo più
  // grande dell'originale, qui siamo lontanissimi da quella soglia).
  const wrapPiccolo = document.getElementById("squadra-logo-piccolo-posizione-wrap");
  const logoPiccoloHtml =
    logo && logo.immaginePiccola
      ? `<img src="assets/stemmi-piccoli/${logo.immaginePiccola}?v=${Date.now()}" class="squadra-logo-piccolo-grande" alt="">`
      : `<div class="squadra-logo-piccolo-grande squadra-logo-piccolo-vuoto" title="Nessun logo piccolo caricato"></div>`;
  const posizioneHtml = posizioneLega
    ? `<span class="squadra-posizione-badge">${posizioneLega}° in classifica</span>`
    : `<span class="squadra-posizione-badge squadra-posizione-badge-vuoto">Posizione n.d.</span>`;
  wrapPiccolo.innerHTML = `${logoPiccoloHtml}${posizioneHtml}`;

  const wrapLogo = document.getElementById("squadra-logo-wrap");
  wrapLogo.innerHTML = "";

  if (logo && logo.immagine) {
    const img = document.createElement("img");
    img.src = "assets/stemmi/" + logo.immagine + "?v=" + Date.now();
    img.alt = "Logo " + squadra.nomeFantasquadra;
    img.className = "squadra-logo-img";
    img.addEventListener("click", () => hv_apriLightbox(img.src));
    wrapLogo.appendChild(img);
  } else {
    wrapLogo.innerHTML = '<div class="squadra-logo-placeholder">Logo da caricare</div>';
  }
}

// Stessa estrazione ID YouTube già usata in Archivio — duplicata qui perché
// squadre.html non carica js/archivio.js (pagine diverse, stessa piccola funzione).
function hv_estraiIdYoutubeSquadre(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Card embed di un video (miniatura a piena larghezza cliccabile, si
// trasforma nel player YouTube incorporato al click) — stessa identica idea
// usata per i video di stagione in Archivio.
function hv_creaVideoEmbedHtmlSquadre(v) {
  const id = hv_estraiIdYoutubeSquadre(v.url);
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

function hv_wireVideoEmbedSquadre(container) {
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

// I video di una fantasquadra sono legati alla STAGIONE in corso
// (data/loghi-fantasquadre.json, campo "video", un oggetto per anno): così
// gli highlights di un'asta non cancellano mai quelli dell'asta precedente.
function hv_renderHighlights(squadraId, logoEsistente, config) {
  const contenuto = document.getElementById("highlights-content");
  const stagioneAttuale = config.lega.stagione;
  const videoPerAnno = (logoEsistente && logoEsistente.video) || {};
  const videoArray = Array.isArray(videoPerAnno) ? [] : videoPerAnno[stagioneAttuale] || [];

  contenuto.innerHTML = videoArray.length
    ? `<div class="video-embed-lista">${videoArray.map((v) => hv_creaVideoEmbedHtmlSquadre(v)).join("")}</div>`
    : '<p class="empty-state">Nessun video ancora aggiunto per questa fantasquadra.</p>';
  hv_wireVideoEmbedSquadre(contenuto);

  const formWrap = document.getElementById("highlights-admin-form");
  if (window.hv_role !== "admin" || !(config.lega.githubOwner && config.lega.githubRepo)) {
    formWrap.innerHTML = "";
    return;
  }

  // Righe di partenza: quelle già salvate PER QUESTA STAGIONE, più una vuota
  // pronta da compilare.
  let righe = videoArray.map((v) => ({ titolo: v.titolo || "", url: v.url || "" }));
  righe.push({ titolo: "", url: "" });

  function disegna() {
    formWrap.innerHTML = `
      <div class="admin-box" style="background: var(--bg-void); margin-top: 14px; padding: 14px;">
        <p class="campo-titolo" style="margin: 0 0 10px;">Aggiungi/modifica i video di questa stagione (${stagioneAttuale}) — es. i momenti salienti dell'asta</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${righe
            .map(
              (r, i) => `
            <div class="campo-riga highlights-admin-riga" data-i="${i}" style="align-items:center; flex-wrap:wrap;">
              <input type="text" class="highlights-admin-titolo" data-i="${i}" placeholder="Titolo (es. Asta 2026 - i momenti migliori)" value="${r.titolo.replace(/"/g, "&quot;")}" style="flex:1; min-width:200px;">
              <input type="text" class="highlights-admin-url" data-i="${i}" placeholder="Link YouTube" value="${r.url.replace(/"/g, "&quot;")}" style="flex:1; min-width:200px;">
              ${righe.length > 1 ? `<button type="button" class="highlights-admin-rimuovi" data-i="${i}" title="Rimuovi questa riga">✕</button>` : ""}
            </div>`
            )
            .join("")}
        </div>
        <button type="button" id="highlights-admin-aggiungi" style="margin-top: 10px;">+ Aggiungi un altro video</button>
        <br>
        <button type="button" id="highlights-salva-btn" style="margin-top: 10px;">Salva</button>
        <p id="highlights-stato" class="muted" style="font-size: 12px; margin-top: 8px;"></p>
      </div>
    `;

    formWrap.querySelectorAll(".highlights-admin-titolo").forEach((el) => {
      el.addEventListener("input", () => (righe[Number(el.dataset.i)].titolo = el.value));
    });
    formWrap.querySelectorAll(".highlights-admin-url").forEach((el) => {
      el.addEventListener("input", () => (righe[Number(el.dataset.i)].url = el.value));
    });
    formWrap.querySelectorAll(".highlights-admin-rimuovi").forEach((el) => {
      el.addEventListener("click", () => {
        righe.splice(Number(el.dataset.i), 1);
        disegna();
      });
    });
    document.getElementById("highlights-admin-aggiungi").addEventListener("click", () => {
      righe.push({ titolo: "", url: "" });
      disegna();
    });
    document.getElementById("highlights-salva-btn").addEventListener("click", async () => {
      const stato = document.getElementById("highlights-stato");
      const daSalvare = righe.filter((r) => r.url.trim()).map((r) => ({ titolo: r.titolo.trim(), url: r.url.trim() }));
      stato.textContent = "Salvataggio in corso...";
      stato.style.color = "var(--text-muted)";
      try {
        await hv_salvaVideoHighlightViaGitHub(squadraId, stagioneAttuale, daSalvare, config);
        stato.textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
        stato.style.color = "var(--verde-prato)";
        const videoAggiornato = { ...videoPerAnno, [stagioneAttuale]: daSalvare };
        hv_renderHighlights(squadraId, { ...(logoEsistente || {}), video: videoAggiornato }, config);
      } catch (err) {
        stato.textContent = "Errore: " + err.message;
        stato.style.color = "var(--wine-bright)";
      }
    });
  }

  disegna();
}

// ===== Audio per fantasquadra (Squadre > Audio) =====
// Stesso player a onda di Archivio > Audio storici, duplicato qui perché
// squadre.html non carica js/archivio.js. Un solo audio alla volta.
let hv_audioContextSquadra = null;
let hv_audioAttivoSquadra = null;

function hv_ottieniAudioContextSquadra() {
  if (!hv_audioContextSquadra) hv_audioContextSquadra = new (window.AudioContext || window.webkitAudioContext)();
  return hv_audioContextSquadra;
}

function hv_fermaAudioSquadra() {
  if (!hv_audioAttivoSquadra) return;
  hv_audioAttivoSquadra.audio.pause();
  hv_audioAttivoSquadra.audio.currentTime = 0;
  cancelAnimationFrame(hv_audioAttivoSquadra.animId);
  hv_audioAttivoSquadra.tile.classList.remove("in-riproduzione");
  const ctx2d = hv_audioAttivoSquadra.canvas.getContext("2d");
  ctx2d.clearRect(0, 0, hv_audioAttivoSquadra.canvas.width, hv_audioAttivoSquadra.canvas.height);
  const icona = hv_audioAttivoSquadra.tile.querySelector(".audio-storico-icona");
  if (icona) icona.textContent = "▶";
  hv_audioAttivoSquadra = null;
}

function hv_disegnaOndaAudioSquadra(stato) {
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

function hv_avviaAudioSquadra(tile, url) {
  if (hv_audioAttivoSquadra && hv_audioAttivoSquadra.tile === tile) {
    hv_fermaAudioSquadra();
    return;
  }
  hv_fermaAudioSquadra();

  const audio = tile._audioEl || (tile._audioEl = new Audio());
  audio.src = url;
  audio.crossOrigin = "anonymous";

  const canvas = tile.querySelector(".audio-storico-onda");
  const ctxAudio = hv_ottieniAudioContextSquadra();
  if (ctxAudio.state === "suspended") ctxAudio.resume();

  if (!tile._analyser) {
    const sourceNode = ctxAudio.createMediaElementSource(audio);
    tile._analyser = ctxAudio.createAnalyser();
    tile._analyser.fftSize = 256;
    sourceNode.connect(tile._analyser);
    tile._analyser.connect(ctxAudio.destination);
  }

  hv_audioAttivoSquadra = { audio, tile, canvas, analyser: tile._analyser, animId: null };
  tile.classList.add("in-riproduzione");
  const icona = tile.querySelector(".audio-storico-icona");
  if (icona) icona.textContent = "❚❚";
  audio.play();
  hv_disegnaOndaAudioSquadra(hv_audioAttivoSquadra);

  audio.addEventListener(
    "ended",
    () => {
      if (hv_audioAttivoSquadra && hv_audioAttivoSquadra.tile === tile) hv_fermaAudioSquadra();
    },
    { once: true }
  );
}

// Titolo proposto di default: il nome del file senza estensione, con trattini
// e underscore trasformati in spazi — tu puoi sempre modificarlo prima di
// caricare.
function hv_titoloDaNomeFileAudio(nomeFile) {
  return nomeFile.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function hv_renderAudioSquadra(squadraId, logoEsistente, config) {
  const contenuto = document.getElementById("audio-squadra-content");
  const stagioneAttuale = config.lega.stagione;
  const audioPerAnno = (logoEsistente && logoEsistente.audio) || {};
  const audioArray = Array.isArray(audioPerAnno) ? [] : audioPerAnno[stagioneAttuale] || [];

  contenuto.innerHTML = audioArray.length
    ? `<div class="audio-storici-griglia">${audioArray
        .map(
          (a) => `
      <div class="audio-storico-tile" data-id="${a.id}" data-file="${a.file}">
        <span class="audio-storico-icona">▶</span>
        <canvas class="audio-storico-onda" width="120" height="28"></canvas>
        <p class="audio-storico-testo">${a.testo}</p>
        ${window.hv_role === "admin" ? `<button type="button" class="audio-squadra-rimuovi" data-id="${a.id}">Rimuovi</button>` : ""}
      </div>`
        )
        .join("")}</div>`
    : '<p class="empty-state">Nessun audio ancora aggiunto per questa fantasquadra.</p>';

  contenuto.querySelectorAll(".audio-storico-tile").forEach((tile) => {
    tile.addEventListener("click", (e) => {
      if (e.target.classList.contains("audio-squadra-rimuovi")) return;
      hv_avviaAudioSquadra(tile, tile.dataset.file);
    });
  });
  contenuto.querySelectorAll(".audio-squadra-rimuovi").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Rimuovere questo audio? Non si può annullare.")) return;
      try {
        const audioAggiornato = await hv_rimuoviAudioSquadraViaGitHub(squadraId, stagioneAttuale, btn.dataset.id, config);
        hv_renderAudioSquadra(squadraId, { ...(logoEsistente || {}), audio: { ...audioPerAnno, [stagioneAttuale]: audioAggiornato } }, config);
      } catch (err) {
        alert("Errore: " + err.message);
      }
    });
  });

  const formWrap = document.getElementById("audio-squadra-admin-form");
  if (window.hv_role !== "admin" || !(config.lega.githubOwner && config.lega.githubRepo)) {
    formWrap.innerHTML = "";
    return;
  }

  // File scelti ma non ancora caricati: puoi selezionarne più di uno insieme,
  // ognuno con un titolo modificabile (parte dal nome del file).
  let fileSelezionati = [];

  function disegnaForm() {
    formWrap.innerHTML = `
      <div class="admin-box" style="background: var(--bg-void); margin-top: 14px; padding: 14px;">
        <p class="campo-titolo" style="margin: 0 0 10px;">Aggiungi uno o più audio di questa stagione (${stagioneAttuale})</p>
        <input type="file" id="audio-squadra-file-input" accept="audio/*" multiple>
        <p class="muted" style="font-size:12px; margin: 6px 0 0;">Puoi selezionarne più di uno insieme. Il titolo parte dal nome del file, modificalo pure prima di caricare. Massimo 5 MB a file.</p>
        ${
          fileSelezionati.length
            ? `<div style="display:flex; flex-direction:column; gap:8px; margin-top: 12px;">
                ${fileSelezionati
                  .map(
                    (f, i) => `
                  <div class="campo-riga" data-i="${i}" style="align-items:center;">
                    <input type="text" class="audio-squadra-pending-titolo" data-i="${i}" value="${f.titolo.replace(/"/g, "&quot;")}" style="flex:1;">
                    <span class="muted" style="font-size:11px; white-space:nowrap;">${(f.file.size / 1024 / 1024).toFixed(1)} MB</span>
                    <button type="button" class="audio-squadra-pending-rimuovi" data-i="${i}" title="Togli dalla lista">✕</button>
                  </div>`
                  )
                  .join("")}
              </div>
              <button type="button" id="audio-squadra-carica-btn" style="margin-top: 10px;">Carica ${fileSelezionati.length > 1 ? `tutti (${fileSelezionati.length})` : ""}</button>`
            : ""
        }
        <p id="audio-squadra-stato" class="muted" style="font-size: 12px; margin-top: 8px;"></p>
      </div>
    `;

    document.getElementById("audio-squadra-file-input").addEventListener("change", (e) => {
      const nuovi = Array.from(e.target.files).map((file) => ({ file, titolo: hv_titoloDaNomeFileAudio(file.name) }));
      fileSelezionati = fileSelezionati.concat(nuovi);
      disegnaForm();
    });

    formWrap.querySelectorAll(".audio-squadra-pending-titolo").forEach((el) => {
      el.addEventListener("input", () => (fileSelezionati[Number(el.dataset.i)].titolo = el.value));
    });
    formWrap.querySelectorAll(".audio-squadra-pending-rimuovi").forEach((el) => {
      el.addEventListener("click", () => {
        fileSelezionati.splice(Number(el.dataset.i), 1);
        disegnaForm();
      });
    });

    const btnCarica = document.getElementById("audio-squadra-carica-btn");
    if (btnCarica) {
      btnCarica.addEventListener("click", async () => {
        const stato = document.getElementById("audio-squadra-stato");
        let audioAggiornato = audioArray;
        for (let i = 0; i < fileSelezionati.length; i++) {
          const { file, titolo } = fileSelezionati[i];
          stato.textContent = `Caricamento ${i + 1} di ${fileSelezionati.length} ("${titolo || file.name}")...`;
          stato.style.color = "var(--text-muted)";
          try {
            audioAggiornato = await hv_caricaAudioSquadraViaGitHub(squadraId, stagioneAttuale, titolo.trim() || file.name, file, config);
          } catch (err) {
            stato.textContent = `Caricati ${i} su ${fileSelezionati.length}, poi errore su "${titolo || file.name}": ${err.message}`;
            stato.style.color = "var(--wine-bright)";
            fileSelezionati = fileSelezionati.slice(i);
            hv_renderAudioSquadra(squadraId, { ...(logoEsistente || {}), audio: { ...audioPerAnno, [stagioneAttuale]: audioAggiornato } }, config);
            return;
          }
        }
        hv_renderAudioSquadra(squadraId, { ...(logoEsistente || {}), audio: { ...audioPerAnno, [stagioneAttuale]: audioAggiornato } }, config);
        document.getElementById("audio-squadra-stato").textContent = "Caricati ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
        document.getElementById("audio-squadra-stato").style.color = "var(--verde-prato)";
      });
    }
  }

  disegnaForm();
}

function hv_renderLogoUploadAdmin(squadraId, config, logoEsistente) {
  const wrap = document.getElementById("squadra-logo-upload-admin");
  if (window.hv_role !== "admin") {
    wrap.innerHTML = "";
    return;
  }

  const abilitato = config.lega.githubOwner && config.lega.githubRepo;
  if (!abilitato) {
    wrap.innerHTML = "";
    return;
  }

  const anteprimaEsistente =
    logoEsistente && logoEsistente.immaginePiccola
      ? `<img src="assets/stemmi-piccoli/${logoEsistente.immaginePiccola}?v=${Date.now()}" alt="" style="width:36px; height:36px; object-fit:cover; border-radius:6px;">`
      : "";

  wrap.innerHTML = `
    <label class="upload-admin-btn">
      Carica/aggiorna logo
      <input type="file" accept="image/*" id="squadra-logo-file-input" style="display:none;">
    </label>
    <p id="squadra-logo-upload-stato" class="muted" style="font-size:12px; margin-top:8px;"></p>

    <label class="upload-admin-btn" style="margin-top:10px;">
      Carica/aggiorna logo piccolo (512×512, per le classifiche)
      <input type="file" accept="image/*" id="squadra-logo-piccolo-file-input" style="display:none;">
    </label>
    <div id="squadra-logo-piccolo-anteprima" style="margin-top:8px;">${anteprimaEsistente}</div>
    <p id="squadra-logo-piccolo-stato" class="muted" style="font-size:12px; margin-top:4px;"></p>
  `;

  document.getElementById("squadra-logo-piccolo-file-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const stato = document.getElementById("squadra-logo-piccolo-stato");
    stato.textContent = "Ridimensiono e carico...";
    stato.style.color = "var(--text-muted)";

    try {
      await hv_caricaLogoPiccoloSquadraViaGitHub(squadraId, file, config);
      stato.textContent = "Salvato ✓ — comparirà in Classifica lega e Classifica previsioni tra circa un minuto.";
      stato.style.color = "var(--verde-prato)";

      const anteprima = document.getElementById("squadra-logo-piccolo-anteprima");
      anteprima.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="" style="width:36px; height:36px; object-fit:cover; border-radius:6px;">`;
    } catch (err) {
      stato.textContent = "Errore: " + err.message;
      stato.style.color = "var(--wine-bright)";
    }
  });

  document.getElementById("squadra-logo-file-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const stato = document.getElementById("squadra-logo-upload-stato");
    stato.textContent = "Caricamento in corso...";
    stato.style.color = "var(--text-muted)";

    try {
      await hv_caricaLogoSquadraViaGitHub(squadraId, file, config);
      stato.textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
      stato.style.color = "var(--verde-prato)";

      const wrapLogo = document.getElementById("squadra-logo-wrap");
      wrapLogo.innerHTML = "";
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.className = "squadra-logo-img";
      img.addEventListener("click", () => hv_apriLightbox(img.src));
      wrapLogo.appendChild(img);
    } catch (err) {
      stato.textContent = "Errore: " + err.message;
      stato.style.color = "var(--wine-bright)";
    }
  });
}

async function hv_initSquadre(config) {
  document.getElementById("lega-nome").textContent = config.lega.nome;

  const [roseRes, pagelleRes, previsioniRes, loghiRes, risultatiRes, squadreRef, giocatoriDb, nazioni] = await Promise.all([
    fetch("data/rose.json"),
    fetch("data/pagelle.json"),
    fetch("data/previsioni.json"),
    fetch("data/loghi-fantasquadre.json"),
    fetch("data/risultati.json"),
    hv_caricaSquadreRef(),
    hv_caricaGiocatoriDb(),
    hv_caricaNazioni(),
  ]);
  const { rose } = await roseRes.json();
  const { pagelle } = await pagelleRes.json();
  const { previsioni } = await previsioniRes.json();
  const { loghi } = await loghiRes.json();
  const { risultati } = await risultatiRes.json();
  const classificaLega = risultati && risultati.length > 0 ? hv_calcolaClassificaLega(risultati, config.squadre) : [];

  let partiteStagione = [];
  let partiteConOrario = [];
  let giornataCorrente = null;
  const apiKey = config.lega.footballDataApiKey;
  const statoInfo = window.hv_role === "admin" ? document.getElementById("info-match-stato") : null;

  if (!apiKey) {
    if (statoInfo) statoInfo.textContent = "Orari partite non disponibili: manca la chiave API in config.json.";
  } else {
    try {
      const [rispStagione, rispOrario] = await Promise.all([
        hv_cacheOFetch("hv_cache_partite_stagione_v2", HV_CACHE_DURATA, () => hv_getTutteLePartiteStagione(apiKey, squadreRef)),
        hv_cacheOFetch("hv_cache_partite_con_orario", HV_CACHE_DURATA, () => hv_getPartiteConOrario(apiKey, squadreRef)),
      ]);
      partiteStagione = rispStagione.dati;
      partiteConOrario = rispOrario.dati;
      giornataCorrente = hv_determinaGiornataCorrente(partiteStagione);
      if (statoInfo) {
        statoInfo.textContent = giornataCorrente
          ? `Giornata rilevata: ${giornataCorrente}`
          : "Nessuna giornata corrente rilevata nei dati ricevuti.";
      }
    } catch (e) {
      if (statoInfo) statoInfo.textContent = `Orari partite non disponibili: ${e.message}`;
    }
  }

  function mostraSquadra(squadra) {
    const roster = (rose || []).find((r) => r.squadraId === squadra.id);
    const pagella = (pagelle || []).find((p) => p.squadraId === squadra.id);
    const previsione = (previsioni || []).find((p) => p.squadraId === squadra.id);
    const logo = (loghi || []).find((l) => l.squadraId === squadra.id);
    const posizioneLega = classificaLega.find((r) => r.squadra.id === squadra.id)?.posizione || null;
    hv_renderIntestazioneSquadra(squadra, logo, posizioneLega);
    hv_renderBadge(squadra.id, risultati, rose, giocatoriDb, config);
    hv_renderLogoUploadAdmin(squadra.id, config, logo);
    hv_renderRoster(roster ? roster.giocatori : [], squadreRef, giornataCorrente, partiteConOrario, giocatoriDb, nazioni);
    hv_renderPagella(pagella);
    hv_renderPrevisione(previsione);
    hv_renderUploadAdmin(squadra.id, config);
    hv_renderTortaSquadre(roster ? roster.giocatori : [], squadreRef);
    hv_renderTortaNazioni(roster ? roster.giocatori : [], squadreRef, giocatoriDb, nazioni);
    hv_renderHighlights(squadra.id, logo, config);
    hv_renderAudioSquadra(squadra.id, logo, config);

    if (statoInfo && giornataCorrente) {
      const trovati = document.querySelectorAll("#roster-content .info-match").length;
      const totaliGiocatori = roster ? roster.giocatori.length : 0;
      statoInfo.textContent = `Giornata ${giornataCorrente} — orario disponibile per ${trovati} su ${totaliGiocatori} giocatori.`;
    }
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

const hv_toggleInfoBtn = document.getElementById("toggle-info-match");
if (hv_toggleInfoBtn) {
  hv_toggleInfoBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // non deve anche collassare/espandere il blocco Rosa
    document.body.classList.toggle("mostra-info-match");
    hv_toggleInfoBtn.classList.toggle("attivo");
  });
}

document.querySelectorAll(".sezione-toggle").forEach((titolo) => {
  titolo.addEventListener("click", () => {
    const contenuto = document.getElementById(titolo.dataset.target);
    if (!contenuto) return;
    titolo.classList.toggle("collassato");
    contenuto.classList.toggle("collassato");
  });
});
