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

function hv_costruisciConicGradient(fette) {
  let cursore = 0;
  const segmenti = fette.map((f, i) => {
    const inizio = cursore;
    const fine = cursore + f.percentuale;
    cursore = fine;
    const colore = HV_PALETTE_TORTA[i % HV_PALETTE_TORTA.length];
    return `${colore} ${inizio}% ${fine}%`;
  });
  return `conic-gradient(${segmenti.join(", ")})`;
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

  const gradiente = hv_costruisciConicGradient(fette);
  const soprannome = hv_soprannomeRosa(fette, squadreRef);

  const DIAMETRO = 240;
  const RAGGIO_LABEL = DIAMETRO * 0.33;
  const SOGLIA_ETICHETTA = 5; // % minima per meritare un'etichetta dentro la fetta

  let cursore = 0;
  const etichette = [];
  const piccole = [];

  fette.forEach((f) => {
    const inizio = cursore;
    const fine = cursore + f.percentuale;
    const metaAngolo = ((inizio + fine) / 2 / 100) * 360; // gradi, 0° = ore 12, orario
    cursore = fine;

    if (f.percentuale < SOGLIA_ETICHETTA) {
      piccole.push(f);
      return;
    }

    const rad = (metaAngolo * Math.PI) / 180;
    const x = DIAMETRO / 2 + RAGGIO_LABEL * Math.sin(rad);
    const y = DIAMETRO / 2 - RAGGIO_LABEL * Math.cos(rad);

    etichette.push(`
      <div class="torta-fetta-label" style="left:${x.toFixed(1)}px; top:${y.toFixed(1)}px;">
        <img src="assets/loghi/${f.codice}.png" alt="" class="torta-fetta-logo">
        <span class="torta-fetta-testo">${Math.round(f.percentuale)}%<br>${f.n}</span>
      </div>`);
  });

  const notaPiccole =
    piccole.length > 0
      ? `<p class="torta-piccole-nota">+ ${piccole.map((f) => `${hv_nomeSquadraReale(f.codice, squadreRef)} ${Math.round(f.percentuale)}%`).join(", ")}</p>`
      : "";

  wrap.innerHTML = `
    <div class="torta-grafico-wrap" style="width:${DIAMETRO}px; height:${DIAMETRO}px;">
      <div class="torta-grafico" style="background:${gradiente}; width:${DIAMETRO}px; height:${DIAMETRO}px;"></div>
      ${etichette.join("")}
    </div>
    ${notaPiccole}
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

function hv_renderRoster(giocatori, squadreRef, giornataCorrente, partiteStagione) {
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
        return `
        <tr>
          <td><span class="badge-ruolo ${ruolo.toLowerCase()}">${ruolo[0]}</span>${g.nome}${infoHtml}</td>
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

function hv_renderIntestazioneSquadra(squadra, logo) {
  document.getElementById("squadra-nome-grande").textContent = squadra.nomeFantasquadra || squadra.nomeReale;

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

function hv_renderLogoUploadAdmin(squadraId, config) {
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

  wrap.innerHTML = `
    <label class="upload-admin-btn">
      Carica/aggiorna logo
      <input type="file" accept="image/*" id="squadra-logo-file-input" style="display:none;">
    </label>
    <p id="squadra-logo-upload-stato" class="muted" style="font-size:12px; margin-top:8px;"></p>
  `;

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

  const [roseRes, pagelleRes, previsioniRes, loghiRes, squadreRef] = await Promise.all([
    fetch("data/rose.json"),
    fetch("data/pagelle.json"),
    fetch("data/previsioni.json"),
    fetch("data/loghi-fantasquadre.json"),
    hv_caricaSquadreRef(),
  ]);
  const { rose } = await roseRes.json();
  const { pagelle } = await pagelleRes.json();
  const { previsioni } = await previsioniRes.json();
  const { loghi } = await loghiRes.json();

  let partiteStagione = [];
  let giornataCorrente = null;
  const apiKey = config.lega.footballDataApiKey;
  const statoInfo = document.getElementById("info-match-stato");

  if (!apiKey) {
    if (statoInfo) statoInfo.textContent = "Orari partite non disponibili: manca la chiave API in config.json.";
  } else {
    try {
      const { dati } = await hv_cacheOFetch("hv_cache_partite_stagione_v2", HV_CACHE_DURATA, () =>
        hv_getTutteLePartiteStagione(apiKey, squadreRef)
      );
      partiteStagione = dati;
      giornataCorrente = hv_determinaGiornataCorrente(partiteStagione);
      if (statoInfo) {
        statoInfo.textContent = giornataCorrente
          ? `Giornata rilevata: ${giornataCorrente} (${partiteStagione.filter((p) => p.matchday === giornataCorrente).length} partite)`
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
    hv_renderIntestazioneSquadra(squadra, logo);
    hv_renderLogoUploadAdmin(squadra.id, config);
    hv_renderRoster(roster ? roster.giocatori : [], squadreRef, giornataCorrente, partiteStagione);
    hv_renderPagella(pagella);
    hv_renderPrevisione(previsione);
    hv_renderUploadAdmin(squadra.id, config);
    hv_renderTortaSquadre(roster ? roster.giocatori : [], squadreRef);

    if (statoInfo && giornataCorrente) {
      const trovati = document.querySelectorAll("#roster-content .info-match").length;
      const totaliGiocatori = roster ? roster.giocatori.length : 0;
      const campione = partiteStagione
        .filter((p) => p.matchday === giornataCorrente)
        .slice(0, 3)
        .map((p) => `${p.casaCodice ?? "NULL"}-${p.trasfertaCodice ?? "NULL"} [data:${p.data ?? "MANCANTE"}] [status:${p.status}]`)
        .join(" · ");
      const testDiretto = hv_infoPartitaGiocatore("MON", giornataCorrente, partiteStagione);
      const testoTest = testDiretto ? JSON.stringify(testDiretto) : "NULL";
      statoInfo.textContent = `Giornata: ${giornataCorrente} — trovati ${trovati}/${totaliGiocatori}. Test MON: ${testoTest}. Campione: ${campione}`;
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
  hv_toggleInfoBtn.addEventListener("click", () => {
    document.body.classList.toggle("mostra-info-match");
    hv_toggleInfoBtn.classList.toggle("attivo");
  });
}
