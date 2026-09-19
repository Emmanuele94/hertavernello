const HV_MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

function hv_formattaDataAsta(dataAstaISO) {
  const d = new Date(dataAstaISO);
  const giorno = d.getDate();
  const mese = HV_MESI[d.getMonth()];
  const ore = String(d.getHours()).padStart(2, "0");
  const minuti = String(d.getMinutes()).padStart(2, "0");
  return `${giorno} ${mese} alle ore ${ore}:${minuti}`;
}

function hv_countdown(dataAstaISO, elementId, etichetta) {
  const el = document.getElementById(elementId || "countdown");
  if (!el) return;
  const prefisso = etichetta || "Asta";
  let timer;

  function aggiorna() {
    const diff = new Date(dataAstaISO).getTime() - Date.now();
    if (diff <= 0) {
      el.textContent = `${prefisso} fatta il ${hv_formattaDataAsta(dataAstaISO)} ora italiana`;
      if (timer) clearInterval(timer);
      return;
    }
    const g = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `${prefisso} tra ${g}g ${h}h ${m}m ${s}s`;
  }

  // Il timer va creato PRIMA della prima chiamata ad aggiorna(): se la data è
  // già passata al caricamento, aggiorna() prova subito a fermarlo, quindi
  // deve già esistere (altrimenti errore su una variabile non ancora pronta).
  timer = setInterval(aggiorna, 1000);
  aggiorna();
}

// ===== Incrocio: schede sfida per ogni scontro di fantalega coinvolto nella partita reale =====
function hv_giocatoriRilevanti(squadraId, match, roseData, squadreRef, giocatoriDb = []) {
  const entry = (roseData.rose || []).find((r) => r.squadraId === squadraId);
  if (!entry) return [];
  return (entry.giocatori || [])
    .map((g) => {
      const codice = hv_trovaCodice(g.squadraReale, squadreRef);
      const db = typeof hv_trovaGiocatore === "function"
        ? hv_trovaGiocatore(g.nome, codice, giocatoriDb, g.fantacalcioId)
        : null;
      return {
        nome: g.nome,
        codice,
        fotoUrl: db?.foto || "",
        squadraReale: g.squadraReale || db?.squadraReale || "",
        logoRealeUrl: codice ? `assets/loghi/${codice}.png` : "",
      };
    })
    .filter((g) => g.codice === match.casaCodice || g.codice === match.trasfertaCodice);
}

function hv_costruisciSchedeSfida(match, roseData, config, squadreRef, calendarioData, loghiFantasquadre = [], squadraFiltroId = "", giocatoriDb = []) {
  if (!match.matchday) return [];
  const giornataCal = (calendarioData.giornate || []).find((g) => Number(g.giornata) === Number(match.matchday));
  if (!giornataCal) return [];

  const schede = [];
  giornataCal.incontri.forEach((coppia) => {
    if (coppia.length < 2) return;
    const [idA, idB] = coppia;
    if (squadraFiltroId && idA !== squadraFiltroId && idB !== squadraFiltroId) return;

    const squadraA = config.squadre.find((s) => s.id === idA);
    const squadraB = config.squadre.find((s) => s.id === idB);
    if (!squadraA || !squadraB) return;

    const giocatoriA = hv_giocatoriRilevanti(idA, match, roseData, squadreRef, giocatoriDb);
    const giocatoriB = hv_giocatoriRilevanti(idB, match, roseData, squadreRef, giocatoriDb);
    if (giocatoriA.length === 0 && giocatoriB.length === 0) return;

    const logoA = (loghiFantasquadre || []).find((l) => l.squadraId === idA && l.immaginePiccola);
    const logoB = (loghiFantasquadre || []).find((l) => l.squadraId === idB && l.immaginePiccola);
    schede.push({
      idA, idB,
      nomeA: squadraA.nomeReale, nomeB: squadraB.nomeReale,
      fantasquadraA: squadraA.nomeFantasquadra || squadraA.nomeReale,
      fantasquadraB: squadraB.nomeFantasquadra || squadraB.nomeReale,
      logoAUrl: logoA ? `assets/stemmi-piccoli/${logoA.immaginePiccola}` : "",
      logoBUrl: logoB ? `assets/stemmi-piccoli/${logoB.immaginePiccola}` : "",
      giocatoriA, giocatoriB
    });
  });
  return schede;
}

const HV_GIORNI_BREVI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function hv_giornoOrarioBreve(iso) {
  const d = new Date(iso);
  return HV_GIORNI_BREVI[d.getDay()] + " " + hv_orarioBreve(d.getTime());
}

function hv_renderIncrocioMatch(match, roseData, config, squadreRef, calendarioData, loghiFantasquadre, punteggioPrecedente, squadraFiltroId = "", giocatoriDb = []) {
  const schede = hv_costruisciSchedeSfida(match, roseData, config, squadreRef, calendarioData, loghiFantasquadre, squadraFiltroId, giocatoriDb);
  if (squadraFiltroId && schede.length === 0) return null;

  const listaGiocatori = (giocatori) =>
    giocatori.length === 0
      ? '<p class="sfida-vuoto">Nessun giocatore qui</p>'
      : giocatori.map((g) => `<p><img src="assets/loghi/${g.codice}.png" class="logo-squadra-mini" alt="">${g.nome}</p>`).join("");

  let corpo;
  if (schede.length === 0) {
    corpo = match.matchday
      ? '<p class="muted" style="font-size:12.5px; padding:14px 16px;">Nessuno scontro di fantalega coinvolge queste due squadre</p>'
      : '<p class="muted" style="font-size:12.5px; padding:14px 16px;">Calendario di lega non disponibile per questa partita.</p>';
  } else {
    corpo = `<div class="sfide-lista">${schede.map((s, index) => `
      <div class="sfida-card" data-sfida-share-index="${index}">
        <div class="sfida-testata">
          <span class="sfida-team-name">${s.nomeA}</span>
          <span class="sfida-vs">vs</span>
          <span class="sfida-team-name sfida-team-name-right">${s.nomeB}</span>
        </div>
        <div class="sfida-body">
          <div class="sfida-lato">${listaGiocatori(s.giocatoriA)}</div>
          <div class="sfida-lato">${listaGiocatori(s.giocatoriB)}</div>
        </div>
        <div class="sfida-share-actions">
          <button type="button" class="sfida-share-btn hv-share-mobile" data-share-action="share" data-share-index="${index}">📤 Condividi</button>
          <button type="button" class="sfida-share-btn hv-share-desktop" data-share-action="copy" data-share-index="${index}">📋 Copia immagine</button>
          <button type="button" class="sfida-share-btn hv-share-desktop" data-share-action="download" data-share-index="${index}">⬇ PNG</button>
        </div>
        <p class="sfida-share-status" data-share-status="${index}" aria-live="polite"></p>
      </div>`).join("")}</div>`;
  }

  let etichettaStato;
  if (match.live) {
    etichettaStato = `<span class="incrocio-live">● LIVE${match.minuto ? " " + match.minuto + "'" : ""}</span>`;
  } else if (match.finita) {
    etichettaStato = '<span class="incrocio-finale">● FINALE</span>';
  } else {
    etichettaStato = `<span class="incrocio-orario">${hv_giornoOrarioBreve(match.data)}</span>`;
  }

  let punteggioHtml = "";
  if (match.golCasa != null && match.golTrasferta != null) {
    punteggioHtml = `<div class="incrocio-punteggio">${match.golCasa} - ${match.golTrasferta}</div>`;
  }

  let golFlashHtml = "";
  if (match.live && punteggioPrecedente) {
    const golNotizie = [];
    if (match.golCasa != null && punteggioPrecedente.golCasa != null && match.golCasa > punteggioPrecedente.golCasa) {
      golNotizie.push(`⚽ Ha segnato il ${match.casaNome}!`);
    }
    if (match.golTrasferta != null && punteggioPrecedente.golTrasferta != null && match.golTrasferta > punteggioPrecedente.golTrasferta) {
      golNotizie.push(`⚽ Ha segnato il ${match.trasfertaNome}!`);
    }
    if (golNotizie.length > 0) golFlashHtml = `<div class="incrocio-gol-flash">${golNotizie.join(" · ")}</div>`;
  }

  const div = document.createElement("article");
  div.className = "incrocio-match incrocio-match-collassabile";
  div.innerHTML = `
    <button type="button" class="incrocio-testata incrocio-toggle-match" aria-expanded="false">
      <span class="incrocio-duello">
        <span class="incrocio-team incrocio-team-casa">
          <img src="assets/loghi/${match.casaCodice}.png" alt="${match.casaCodice}" class="logo-squadra-mini">
          <span class="incrocio-team-name">${match.casaNome}</span>
        </span>
        <span class="incrocio-centro">
          ${punteggioHtml || '<span class="incrocio-vs-label">VS</span>'}
          ${etichettaStato}
        </span>
        <span class="incrocio-team incrocio-team-trasferta">
          <span class="incrocio-team-name">${match.trasfertaNome}</span>
          <img src="assets/loghi/${match.trasfertaCodice}.png" alt="${match.trasfertaCodice}" class="logo-squadra-mini">
        </span>
      </span>
      <span class="incrocio-match-chevron" aria-hidden="true">▾</span>
    </button>
    <div class="incrocio-match-dettagli" hidden>
      ${golFlashHtml}
      ${corpo}
    </div>
  `;
  const toggle = div.querySelector('.incrocio-toggle-match');
  const dettagli = div.querySelector('.incrocio-match-dettagli');
  toggle.addEventListener('click', () => {
    const aperto = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!aperto));
    dettagli.hidden = aperto;
    div.classList.toggle('is-open', !aperto);
  });

  const statoCondivisione = match.live
    ? `LIVE${match.minuto ? ` ${match.minuto}'` : ""}${match.golCasa != null && match.golTrasferta != null ? ` · ${match.golCasa}-${match.golTrasferta}` : ""}`
    : match.finita
      ? `FINALE${match.golCasa != null && match.golTrasferta != null ? ` · ${match.golCasa}-${match.golTrasferta}` : ""}`
      : hv_giornoOrarioBreve(match.data);

  div.querySelectorAll('[data-share-action]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const btn = event.currentTarget;
      const index = Number(btn.dataset.shareIndex);
      const sfida = schede[index];
      if (!sfida || !window.HVShareCards) return;
      const status = div.querySelector(`[data-share-status="${index}"]`);
      const original = btn.dataset.originalLabel || btn.textContent;
      btn.dataset.originalLabel = original;
      btn.disabled = true;
      if (status) status.textContent = 'Creo l’immagine…';
      try {
        const canvas = await window.HVShareCards.renderSfida({
          partitaReale: `${match.casaNome} vs ${match.trasfertaNome}`,
          casaNome: match.casaNome,
          trasfertaNome: match.trasfertaNome,
          logoCasaRealeUrl: match.casaCodice ? `assets/loghi/${match.casaCodice}.png` : "",
          logoTrasfertaRealeUrl: match.trasfertaCodice ? `assets/loghi/${match.trasfertaCodice}.png` : "",
          statoPartita: statoCondivisione,
          fantasquadraA: sfida.fantasquadraA,
          fantasquadraB: sfida.fantasquadraB,
          nomeA: sfida.nomeA,
          nomeB: sfida.nomeB,
          logoAUrl: sfida.logoAUrl,
          logoBUrl: sfida.logoBUrl,
          giocatoriA: sfida.giocatoriA,
          giocatoriB: sfida.giocatoriB,
        });
        const baseName = window.HVShareCards.safeFileName(`${sfida.fantasquadraA}-vs-${sfida.fantasquadraB}`);
        if (btn.dataset.shareAction === 'share') {
          const result = await window.HVShareCards.shareCanvas(canvas, {
            filename: `${baseName}.png`,
            title: `${sfida.fantasquadraA} vs ${sfida.fantasquadraB}`,
            text: 'Chi gioca contro chi · Hertavernello',
          });
          if (status) status.textContent = result.mode === 'copy' ? 'Immagine copiata negli appunti.' : result.mode === 'download' ? 'PNG scaricato.' : '';
        } else if (btn.dataset.shareAction === 'copy') {
          await window.HVShareCards.copyCanvas(canvas);
          btn.textContent = '✓ Copiata';
          if (status) status.textContent = 'Immagine copiata: incollala direttamente su WhatsApp Web.';
        } else {
          await window.HVShareCards.downloadCanvas(canvas, `${baseName}.png`);
          btn.textContent = '✓ PNG creato';
          if (status) status.textContent = 'PNG pronto.';
        }
      } catch (err) {
        if (err?.name !== 'AbortError' && status) status.textContent = `Condivisione non riuscita: ${err.message}`;
      } finally {
        btn.disabled = false;
        if (btn.textContent !== original) setTimeout(() => { btn.textContent = original; }, 1700);
      }
    });
  });
  return div;
}

async function hv_renderIncrocio(config) {
  const wrap = document.getElementById("incrocio-wrap");
  const apiKey = config.lega.footballDataApiKey;

  if (!apiKey) {
    wrap.innerHTML = '<p class="empty-state">Aggiungi una chiave gratuita di football-data.org in config.json (campo footballDataApiKey) per attivare questa sezione.</p>';
    return;
  }

  wrap.innerHTML = '<p class="empty-state">Carico le partite...</p>';

  try {
    const [squadreRef, roseRes, calendarioRes, loghiFantasquadre, giocatoriDb] = await Promise.all([
      hv_caricaSquadreRef(),
      fetch("data/rose.json", { cache: "no-store" }),
      fetch("data/calendario.json", { cache: "no-store" }),
      hv_caricaLoghiFantasquadre(),
      typeof hv_caricaGiocatoriDb === "function" ? hv_caricaGiocatoriDb() : Promise.resolve([]),
    ]);
    const roseData = await roseRes.json();
    const calendarioData = await calendarioRes.json();
    const giornateLega = (calendarioData.giornate || []).map((g) => Number(g.giornata)).filter(Number.isFinite).sort((a,b)=>a-b);
    if (!giornateLega.length) {
      wrap.innerHTML = '<p class="empty-state">Calendario di lega non ancora disponibile.</p>';
      return;
    }

    const cachePrecedente = hv_cacheLeggiGrezzo("hv_cache_partite_lega_home_v2");
    const tuttePrecedenti = cachePrecedente?.v || [];
    const ttl = hv_prossimoTTLPartite(tuttePrecedenti, Date.now());
    const { dati: tutte, scaduta } = await hv_cacheOFetch(
      "hv_cache_partite_lega_home_v2",
      ttl,
      () => hv_getTutteLePartiteStagione(apiKey, squadreRef)
    );

    const giornataRealeAttiva = hv_calcolaGiornataAttiva(tutte, Date.now());
    let giornata = giornateLega[0];
    if (giornataRealeAttiva != null) {
      if (giornateLega.includes(giornataRealeAttiva)) giornata = giornataRealeAttiva;
      else {
        const prossima = giornateLega.find((g) => g > giornataRealeAttiva);
        giornata = prossima ?? [...giornateLega].reverse().find((g) => g < giornataRealeAttiva) ?? giornateLega[0];
      }
    }
    const partite = tutte.filter((p) => Number(p.matchday) === Number(giornata)).sort((a,b)=>new Date(a.data)-new Date(b.data));
    const punteggiPrecedenti = {};
    tuttePrecedenti.forEach((p) => { if (p?.id) punteggiPrecedenti[p.id] = { golCasa:p.golCasa, golTrasferta:p.golTrasferta }; });

    if (!partite.length) {
      wrap.innerHTML = `<p class="empty-state">Nessuna partita di Serie A trovata per la giornata ${giornata}.</p>`;
      return;
    }

    const anteprima = giornataRealeAttiva == null || giornata > giornataRealeAttiva;
    const squadreOrdinate = [...(config.squadre || [])].sort((a,b) => (a.nomeFantasquadra || a.nomeReale).localeCompare(b.nomeFantasquadra || b.nomeReale, 'it'));

    const renderVista = (squadraFiltroId = "") => {
      wrap.innerHTML = '';
      const toolbar = document.createElement('div');
      toolbar.className = 'incrocio-toolbar';
      toolbar.innerHTML = `
        <label for="incrocio-filtro-squadra">Scegli la tua squadra</label>
        <select id="incrocio-filtro-squadra" aria-label="Filtra Chi gioca contro chi per fantasquadra">
          <option value="">Tutte le squadre</option>
          ${squadreOrdinate.map((s) => `<option value="${s.id}"${s.id === squadraFiltroId ? ' selected' : ''}>${s.nomeFantasquadra || s.nomeReale}${s.nomeFantasquadra && s.nomeReale ? ` · ${s.nomeReale}` : ''}</option>`).join('')}
        </select>
        <span class="incrocio-toolbar-note">Apri una partita per vedere i giocatori coinvolti.</span>`;
      wrap.appendChild(toolbar);

      const label = document.createElement('p');
      label.className = 'incrocio-giornata-label';
      label.textContent = `Giornata ${giornata}${anteprima ? ' · Anteprima' : ''}`;
      wrap.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'incrocio-match-grid';
      let visibili = 0;
      partite.forEach((match) => {
        if (!match.casaCodice || !match.trasfertaCodice) return;
        const card = hv_renderIncrocioMatch(match, roseData, config, squadreRef, calendarioData, loghiFantasquadre, punteggiPrecedenti[match.id], squadraFiltroId, giocatoriDb);
        if (!card) return;
        grid.appendChild(card);
        visibili += 1;
      });
      if (visibili) wrap.appendChild(grid);
      else wrap.insertAdjacentHTML('beforeend', '<p class="empty-state">Nessuna partita reale coinvolge giocatori di questo scontro fantasy nella giornata selezionata.</p>');
      if (scaduta) wrap.insertAdjacentHTML("beforeend", hv_avvisoDatiVecchi(true));

      wrap.querySelector('#incrocio-filtro-squadra')?.addEventListener('change', (e) => renderVista(e.target.value));
    };

    renderVista('');
  } catch (err) {
    wrap.innerHTML = `<p class="empty-state">Non riesco a contattare l'API (${err.message}).</p>`;
  }
}

// TTL dinamico per classifica/marcatori/previsioni: guarda le partite già in
// cache (stessa lista di "chi gioca contro chi", nessuna chiamata in più) e la
// data dell'ultimo aggiornamento di QUESTO dato, per capire se nel frattempo una
// partita è arrivata al checkpoint dei ~100 minuti dal calcio d'inizio.
function hv_ttlClassificaDinamico(chiaveCacheDati) {
  const cachePartite = hv_cacheLeggiGrezzo("hv_cache_partite");
  const partite = cachePartite && cachePartite.v && cachePartite.v.partite ? cachePartite.v.partite : [];
  const cacheDati = hv_cacheLeggiGrezzo(chiaveCacheDati);
  const ultimoAggiornamento = cacheDati ? cacheDati.t : 0;
  return hv_prossimoTTLClassifica(partite, Date.now(), ultimoAggiornamento);
}

// ===== Classifica generale previsioni =====
async function hv_renderLeaderboard(config) {
  const wrap = document.getElementById("leaderboard-wrap");
  const apiKey = config.lega.footballDataApiKey;

  if (!apiKey) {
    wrap.innerHTML = '<p class="empty-state">Aggiungi una chiave gratuita di football-data.org in config.json per attivare la classifica.</p>';
    return;
  }

  wrap.innerHTML = '<p class="empty-state">Calcolo la classifica...</p>';

  try {
    const [squadreRef, previsioniRes] = await Promise.all([hv_caricaSquadreRef(), fetch("data/previsioni.json")]);
    const { previsioni } = await previsioniRes.json();

    // Stessa cache/chiamata della "Classifica Serie A" qui sotto (unico endpoint
    // /standings condiviso): qui ci serve solo la posizione per codice squadra.
    const { dati: classificaCompleta, scaduta } = await hv_cacheOFetch("hv_cache_classifica", hv_ttlClassificaDinamico("hv_cache_classifica"), () =>
      hv_getClassificaCompleta(apiKey, squadreRef)
    );
    const classificaReale = {};
    classificaCompleta.forEach((r) => {
      if (r.codice) classificaReale[r.codice] = r.posizione;
    });

    const loghi = await hv_caricaLoghiFantasquadre();
    const righe = [];
    (previsioni || []).forEach((p) => {
      const squadra = config.squadre.find((s) => s.id === p.squadraId);
      if (!squadra || !p.ordine || p.ordine.every((x) => !x)) return;

      let punteggio = 0;
      let conteggiate = 0;
      p.ordine.forEach((codice, idx) => {
        if (!codice) return;
        const posizionePrevista = idx + 1;
        const posizioneReale = classificaReale[codice];
        if (posizioneReale) {
          punteggio += Math.abs(posizionePrevista - posizioneReale);
          conteggiate++;
        }
      });

      if (conteggiate > 0) righe.push({ nomeReale: squadra.nomeReale, punteggio, logoHtml: hv_logoPiccoloHtml(squadra.id, loghi) });
    });

    righe.sort((a, b) => a.punteggio - b.punteggio);

    if (righe.length === 0) {
      wrap.innerHTML = '<p class="empty-state">Nessuna previsione ancora compilata (usa admin.html).</p>';
      return;
    }

    wrap.innerHTML = `
      <table class="roster-table">
        <tbody>
          ${righe
            .map(
              (r, i) => `
            <tr>
              <td style="width:30px; font-family:var(--font-mono); color:var(--giallo-neon);">${i + 1}°</td>
              <td>${r.logoHtml}${r.nomeReale}</td>
              <td class="costo">${r.punteggio} pt</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
      <p class="muted" style="font-size:12px; margin-top:8px;">Punteggio più basso = previsione più azzeccata (somma delle distanze tra posizione prevista e posizione reale attuale, squadra per squadra).</p>
      ${hv_avvisoDatiVecchi(scaduta)}
    `;
  } catch (err) {
    wrap.innerHTML = `<p class="empty-state">Non riesco a contattare l'API (${err.message}).</p>`;
  }
}

// ===== Classifica Serie A completa =====
async function hv_renderClassificaSerieA(config) {
  const wrap = document.getElementById("classifica-wrap");
  const apiKey = config.lega.footballDataApiKey;

  if (!apiKey) {
    wrap.innerHTML = '<p class="empty-state">Aggiungi una chiave gratuita di football-data.org in config.json per attivare questa sezione.</p>';
    return;
  }

  wrap.innerHTML = '<p class="empty-state">Carico la classifica...</p>';

  let risultato;
  let ttl;
  try {
    const squadreRef = await hv_caricaSquadreRef();
    ttl = hv_ttlClassificaDinamico("hv_cache_classifica");
    risultato = await hv_cacheOFetch("hv_cache_classifica", ttl, () => hv_getClassificaCompleta(apiKey, squadreRef));
  } catch (err) {
    wrap.innerHTML = `<p class="empty-state">Non riesco a contattare l'API (${err.message}).</p>`;
    return;
  }

  const { dati: righe, orario, scaduta } = risultato;
  wrap.innerHTML = `
    <table class="roster-table">
      <tbody>
        ${righe
          .map(
            (r) => `
          <tr>
            <td style="width:26px; font-family:var(--font-mono); color:var(--text-muted);">${r.posizione}</td>
            <td>${r.codice ? `<img src="assets/loghi/${r.codice}.png" class="logo-squadra-mini" alt="">` : ""}${r.nome}</td>
            <td class="costo">${r.punti} pt</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
    <p class="muted" style="font-size:11px; margin-top:8px;">Aggiornato alle ${hv_orarioBreve(orario)} — prossimo controllo verso le ${hv_orarioBreve(orario + ttl)} (si aggiorna a fine partita, non a orario fisso).</p>
    ${hv_avvisoDatiVecchi(scaduta)}
  `;
}

// ===== Top marcatori =====
async function hv_renderTopScorers(config) {
  const wrap = document.getElementById("marcatori-wrap");
  const apiKey = config.lega.footballDataApiKey;

  if (!apiKey) {
    wrap.innerHTML = '<p class="empty-state">Aggiungi una chiave gratuita di football-data.org in config.json per attivare questa sezione.</p>';
    return;
  }

  wrap.innerHTML = '<p class="empty-state">Carico i marcatori...</p>';

  let risultato;
  let ttl;
  try {
    const squadreRef = await hv_caricaSquadreRef();
    ttl = hv_ttlClassificaDinamico("hv_cache_marcatori");
    risultato = await hv_cacheOFetch("hv_cache_marcatori", ttl, () => hv_getTopScorers(apiKey, squadreRef));
  } catch (err) {
    wrap.innerHTML = `<p class="empty-state">Non riesco a contattare l'API (${err.message}).</p>`;
    return;
  }

  const { dati: marcatori, orario, scaduta } = risultato;

  if (marcatori.length === 0) {
    wrap.innerHTML = '<p class="empty-state">Nessun dato disponibile al momento.</p>';
    return;
  }

  const [giocatoriDb, nazioni] = await Promise.all([hv_caricaGiocatoriDb(), hv_caricaNazioni()]);

  wrap.innerHTML = `
    <table class="tabella-marcatori">
      <colgroup>
        <col class="col-pos"><col class="col-sq"><col><col class="col-naz"><col class="col-gol"><col class="col-ass">
      </colgroup>
      <thead>
        <tr>
          <th>Pos</th><th>Sq</th><th class="col-nome-th">Nome</th><th>Naz</th><th>Gol</th><th>Ass</th>
        </tr>
      </thead>
      <tbody>
        ${marcatori
          .map((m, i) => {
            const g = hv_trovaGiocatore(m.nome, m.squadraCodice, giocatoriDb);
            const fotoHtml = g && g.foto
              ? `<img src="${g.foto}" class="foto-giocatore-mini" alt="">`
              : `<span class="foto-giocatore-iniziali">${hv_inizialiGiocatore(m.nome)}</span>`;
            const nazioneCodice = g ? g.nazionalitaCodice : null;
            const nazioneNome = nazioneCodice ? nazioni[nazioneCodice] : null;
            const bandieraHtml = nazioneCodice
              ? `<span class="bandiera-wrap" data-tooltip-nazione>
                   <img src="assets/bandiere/${nazioneCodice}.png" class="bandiera-mini" alt="${nazioneNome || ""}">
                   <span class="bandiera-tooltip">${nazioneNome || ""}</span>
                 </span>`
              : "";
            return `
          <tr>
            <td class="col-pos">${i + 1}°</td>
            <td class="col-sq">${m.squadraCodice ? `<img src="assets/loghi/${m.squadraCodice}.png" class="logo-squadra-mini" alt="" title="${m.squadraCodice}">` : ""}</td>
            <td>
              <div class="cella-nome-marcatore">
                ${fotoHtml}
                <span class="nome-marcatore" title="${m.nome}">${m.nome}</span>
              </div>
            </td>
            <td class="col-naz">${bandieraHtml}</td>
            <td class="col-gol">${m.gol}</td>
            <td class="col-ass">${m.assist ?? "–"}</td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>
    <p class="muted" style="font-size:11px; margin-top:8px;">Aggiornato alle ${hv_orarioBreve(orario)} — prossimo controllo verso le ${hv_orarioBreve(orario + ttl)}. Copre solo i migliori marcatori del campionato (limite del piano gratuito), non tutti i giocatori.</p>
    ${hv_avvisoDatiVecchi(scaduta)}
  `;
}

// ===== Classifica della lega — calcolata da data/risultati.json, niente
// inserimento manuale oltre ai risultati caricati da Admin =====
// ===== Logo piccolo delle fantasquadre (512x512, caricato da Squadre) — usato
// nelle classifiche, sempre con fallback alle iniziali se non ancora caricato =====
let hv_loghiFantasquadreCache = null;

async function hv_caricaLoghiFantasquadre() {
  if (hv_loghiFantasquadreCache) return hv_loghiFantasquadreCache;
  try {
    const res = await fetch("data/loghi-fantasquadre.json");
    const data = await res.json();
    hv_loghiFantasquadreCache = data.loghi || [];
  } catch (e) {
    hv_loghiFantasquadreCache = [];
  }
  return hv_loghiFantasquadreCache;
}

function hv_logoPiccoloHtml(squadraId, loghi) {
  const entry = (loghi || []).find((l) => l.squadraId === squadraId && l.immaginePiccola);
  if (entry) {
    return `<img src="assets/stemmi-piccoli/${entry.immaginePiccola}" alt="" class="logo-fantasquadra-mini">`;
  }
  return `<span class="logo-fantasquadra-mini logo-fantasquadra-mini-vuoto"></span>`;
}

async function hv_caricaRisultatiLega() {
  const res = await fetch("data/risultati.json");
  const data = await res.json();
  return data.risultati || [];
}

async function hv_renderClassificaLega(config) {
  const wrap = document.getElementById("classifica-lega-wrap");
  const risultati = await hv_caricaRisultatiLega();

  if (risultati.length === 0) {
    wrap.innerHTML = '<p class="empty-state">Nessun risultato ancora caricato — si popola da sola man mano che carichi le giornate da Admin → Aggiorna risultati.</p>';
    return;
  }

  const classifica = hv_calcolaClassificaLega(risultati, config.squadre);
  const loghi = await hv_caricaLoghiFantasquadre();
  wrap.innerHTML = `
    <table class="roster-table">
      <thead>
        <tr>
          <th style="text-align:left; font-size:11px; color:var(--text-muted); padding-bottom:6px;"></th>
          <th style="text-align:left; font-size:11px; color:var(--text-muted); padding-bottom:6px;">Fantasquadra</th>
          <th style="font-size:11px; color:var(--text-muted); padding-bottom:6px;">G</th>
          <th style="font-size:11px; color:var(--text-muted); padding-bottom:6px;">V</th>
          <th style="font-size:11px; color:var(--text-muted); padding-bottom:6px;">P</th>
          <th style="font-size:11px; color:var(--text-muted); padding-bottom:6px;">S</th>
          <th style="font-size:11px; color:var(--text-muted); padding-bottom:6px;">Pt</th>
        </tr>
      </thead>
      <tbody>
        ${classifica
          .map(
            (r) => `<tr>
          <td class="mono" style="color:var(--text-muted); width:22px;">${r.posizione}</td>
          <td>${hv_logoPiccoloHtml(r.squadra.id, loghi)}${r.squadra.nomeFantasquadra}</td>
          <td class="mono" style="text-align:center;">${r.giocate}</td>
          <td class="mono" style="text-align:center;">${r.vinte}</td>
          <td class="mono" style="text-align:center;">${r.pareggiate}</td>
          <td class="mono" style="text-align:center;">${r.perse}</td>
          <td class="mono" style="text-align:center; color:var(--verde-prato); font-weight:700;">${r.punti}</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// ===== Highlights della settimana =====
async function hv_renderHighlightsSettimana(config) {
  const wrap = document.getElementById("highlights-settimana-wrap");
  const risultati = await hv_caricaRisultatiLega();

  if (risultati.length === 0) {
    wrap.innerHTML = '<p class="empty-state">Vuoto per ora — appena carichi la prima giornata da Admin, qui compaiono automaticamente il punteggio più alto, chi segna di più e le altre curiosità.</p>';
    return;
  }

  const classifica = hv_calcolaClassificaLega(risultati, config.squadre);
  const record = hv_calcolaRecord(risultati, config.squadre);
  const news = hv_generaNews(risultati, config.squadre, classifica);

  // Quante giornate consecutive (dall'ultima a ritroso) l'attuale leader è stato primo
  const leaderId = classifica[0].squadra.id;
  const giornateDisponibili = [...new Set(risultati.map((r) => r.matchday))].sort((a, b) => a - b);
  let strisciaPrimo = 0;
  for (let i = giornateDisponibili.length - 1; i >= 0; i--) {
    const parziale = hv_calcolaClassificaLega(risultati.filter((r) => r.matchday <= giornateDisponibili[i]), config.squadre);
    if (parziale[0] && parziale[0].squadra.id === leaderId) strisciaPrimo++;
    else break;
  }

  const righe = [
    `<div class="highlight-riga">🔥 <b>${record.migliorPunteggio.nome}</b> ha il miglior punteggio stagionale: <b>${record.migliorPunteggio.score}</b> (giornata ${record.migliorPunteggio.matchday}).</div>`,
    `<div class="highlight-riga">👑 <b>${classifica[0].squadra.nomeFantasquadra}</b> è prima in classifica da <b>${strisciaPrimo}</b> giornata/e di fila.</div>`,
    ...news.map((n) => `<div class="highlight-riga">${n}</div>`),
  ];

  wrap.innerHTML = `<div class="highlights-lista">${[...new Set(righe)].join("")}</div>`;
}

async function hv_initHome(config) {
  document.getElementById("lega-nome").textContent = config.lega.nome;
  document.getElementById("lega-stagione").textContent = "Stagione " + config.lega.stagione;
  hv_countdown(config.lega.dataAsta, "countdown", "Asta");
  const countdownRiparazioneEl = document.getElementById("countdown-riparazione");
  if (config.lega.dataAstaRiparazione) {
    if (countdownRiparazioneEl) countdownRiparazioneEl.classList.remove("hidden");
    hv_countdown(config.lega.dataAstaRiparazione, "countdown-riparazione", "Asta di riparazione");
  } else if (countdownRiparazioneEl) {
    countdownRiparazioneEl.classList.add("hidden");
  }
  await hv_renderIncrocio(config);
  await hv_renderHighlightsSettimana(config);
  await hv_renderClassificaLega(config);
  await hv_renderLeaderboard(config);
  await hv_renderClassificaSerieA(config);
  await hv_renderTopScorers(config);
}

hv_checkGate().then((data) => {
  if (data) hv_initHome(data);
});
document.addEventListener("hv:unlocked", (e) => hv_initHome(e.detail));

document.querySelectorAll(".sezione-toggle").forEach((titolo) => {
  titolo.addEventListener("click", () => {
    const contenuto = document.getElementById(titolo.dataset.target);
    if (!contenuto) return;
    titolo.classList.toggle("collassato");
    contenuto.classList.toggle("collassato");
  });
});
