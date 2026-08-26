const HV_MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

function hv_formattaDataAsta(dataAstaISO) {
  const d = new Date(dataAstaISO);
  const giorno = d.getDate();
  const mese = HV_MESI[d.getMonth()];
  const ore = String(d.getHours()).padStart(2, "0");
  const minuti = String(d.getMinutes()).padStart(2, "0");
  return `${giorno} ${mese} alle ore ${ore}:${minuti}`;
}

function hv_countdown(dataAstaISO) {
  const el = document.getElementById("countdown");
  if (!el) return;

  function aggiorna() {
    const diff = new Date(dataAstaISO).getTime() - Date.now();
    if (diff <= 0) {
      el.textContent = `Asta fatta il ${hv_formattaDataAsta(dataAstaISO)} ora italiana`;
      clearInterval(timer);
      return;
    }
    const g = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `Asta tra ${g}g ${h}h ${m}m ${s}s`;
  }

  aggiorna();
  const timer = setInterval(aggiorna, 1000);
}

// ===== Incrocio: schede sfida per ogni scontro di fantalega coinvolto nella partita reale =====
function hv_giocatoriRilevanti(squadraId, match, roseData, squadreRef) {
  const entry = (roseData.rose || []).find((r) => r.squadraId === squadraId);
  if (!entry) return [];
  return (entry.giocatori || [])
    .map((g) => ({ nome: g.nome, codice: hv_trovaCodice(g.squadraReale, squadreRef) }))
    .filter((g) => g.codice === match.casaCodice || g.codice === match.trasfertaCodice);
}

function hv_costruisciSchedeSfida(match, roseData, config, squadreRef, calendarioData) {
  if (!match.matchday) return [];
  const giornataCal = (calendarioData.giornate || []).find((g) => g.giornata === match.matchday);
  if (!giornataCal) return [];

  const schede = [];
  giornataCal.incontri.forEach((coppia) => {
    if (coppia.length < 2) return;
    const [idA, idB] = coppia;
    const squadraA = config.squadre.find((s) => s.id === idA);
    const squadraB = config.squadre.find((s) => s.id === idB);
    if (!squadraA || !squadraB) return;

    const giocatoriA = hv_giocatoriRilevanti(idA, match, roseData, squadreRef);
    const giocatoriB = hv_giocatoriRilevanti(idB, match, roseData, squadreRef);
    if (giocatoriA.length === 0 && giocatoriB.length === 0) return;

    schede.push({ nomeA: squadraA.nomeReale, nomeB: squadraB.nomeReale, giocatoriA, giocatoriB });
  });
  return schede;
}

function hv_renderIncrocioMatch(match, roseData, config, squadreRef, calendarioData) {
  const schede = hv_costruisciSchedeSfida(match, roseData, config, squadreRef, calendarioData);

  const listaGiocatori = (giocatori) =>
    giocatori.length === 0
      ? '<p class="sfida-vuoto">Nessun giocatore qui</p>'
      : giocatori.map((g) => `<p><img src="assets/loghi/${g.codice}.png" class="logo-squadra-mini" alt="">${g.nome}</p>`).join("");

  let corpo;
  if (schede.length === 0) {
    corpo = match.matchday
      ? '<p class="muted" style="font-size:12.5px; padding: 14px 16px;">Nessuno scontro di fantalega coinvolge queste due squadre</p>'
      : '<p class="muted" style="font-size:12.5px; padding: 14px 16px;">Calendario di lega non disponibile per questa partita.</p>';
  } else {
    corpo = `<div class="sfide-lista">${schede
      .map(
        (s) => `
      <div class="sfida-card">
        <div class="sfida-testata">${s.nomeA} <span class="sfida-vs">vs</span> ${s.nomeB}</div>
        <div class="sfida-body">
          <div class="sfida-lato">${listaGiocatori(s.giocatoriA)}</div>
          <div class="sfida-lato">${listaGiocatori(s.giocatoriB)}</div>
        </div>
      </div>`
      )
      .join("")}</div>`;
  }

  const etichetta = match.live
    ? '<span class="incrocio-live">● LIVE</span>'
    : `Giornata ${match.matchday}`;

  const div = document.createElement("div");
  div.className = "incrocio-match";
  div.innerHTML = `
    <div class="incrocio-testata">
      <span class="incrocio-squadre">
        <img src="assets/loghi/${match.casaCodice}.png" alt="${match.casaCodice}" class="logo-squadra-mini">
        ${match.casaNome} — ${match.trasfertaNome}
        <img src="assets/loghi/${match.trasfertaCodice}.png" alt="${match.trasfertaCodice}" class="logo-squadra-mini">
      </span>
      ${etichetta}
    </div>
    ${corpo}
  `;
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
    const [squadreRef, roseRes, calendarioRes] = await Promise.all([
      hv_caricaSquadreRef(),
      fetch("data/rose.json"),
      fetch("data/calendario.json"),
    ]);
    const roseData = await roseRes.json();
    const calendarioData = await calendarioRes.json();

    const { dati: partite, scaduta } = await hv_cacheOFetch("hv_cache_partite", HV_CACHE_DURATA, () =>
      hv_getPartite(apiKey, squadreRef)
    );
    const { live, prossimoTurno } = partite;

    wrap.innerHTML = "";
    const daMostrare = live.length > 0 ? live : prossimoTurno;

    if (daMostrare.length === 0) {
      wrap.innerHTML = '<p class="empty-state">Nessuna partita trovata nei prossimi giorni.</p>';
      return;
    }

    daMostrare.forEach((match) => {
      if (!match.casaCodice || !match.trasfertaCodice) return;
      wrap.appendChild(hv_renderIncrocioMatch(match, roseData, config, squadreRef, calendarioData));
    });

    if (scaduta) wrap.insertAdjacentHTML("beforeend", hv_avvisoDatiVecchi(true));
  } catch (err) {
    wrap.innerHTML = `<p class="empty-state">Non riesco a contattare l'API (${err.message}).</p>`;
  }
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

    const { dati: classificaReale, scaduta } = await hv_cacheOFetch("hv_cache_classifica_reale", HV_CACHE_DURATA, () =>
      hv_getClassificaReale(apiKey, squadreRef)
    );

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

      if (conteggiate > 0) righe.push({ nomeReale: squadra.nomeReale, punteggio });
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
              <td>${r.nomeReale}</td>
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
  try {
    risultato = await hv_cacheOFetch("hv_cache_classifica", HV_CACHE_DURATA, async () => {
      const squadreRef = await hv_caricaSquadreRef();
      return hv_getClassificaCompleta(apiKey, squadreRef);
    });
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
    <p class="muted" style="font-size:11px; margin-top:8px;">Aggiornato alle ${hv_orarioBreve(orario)} — Si aggiornerà alle ore ${hv_orarioBreve(orario + HV_CACHE_DURATA)}.</p>
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
  try {
    risultato = await hv_cacheOFetch("hv_cache_marcatori", HV_CACHE_DURATA, async () => {
      const squadreRef = await hv_caricaSquadreRef();
      return hv_getTopScorers(apiKey, squadreRef);
    });
  } catch (err) {
    wrap.innerHTML = `<p class="empty-state">Non riesco a contattare l'API (${err.message}).</p>`;
    return;
  }

  const { dati: marcatori, orario, scaduta } = risultato;

  if (marcatori.length === 0) {
    wrap.innerHTML = '<p class="empty-state">Nessun dato disponibile al momento.</p>';
    return;
  }

  wrap.innerHTML = `
    <div style="overflow-x: auto;">
    <table class="roster-table">
      <tbody>
        ${marcatori
          .map(
            (m, i) => `
          <tr>
            <td style="width:26px; font-family:var(--font-mono); color:var(--giallo-neon);">${i + 1}°</td>
            <td style="white-space: nowrap;">${m.squadraCodice ? `<img src="assets/loghi/${m.squadraCodice}.png" class="logo-squadra-mini" alt="">` : ""}${m.nome}</td>
            <td class="costo" style="white-space: nowrap;">${m.gol} gol${m.assist ? " · " + m.assist + " ast" : ""}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
    </div>
    <p class="muted" style="font-size:11px; margin-top:8px;">Aggiornato alle ${hv_orarioBreve(orario)} — Si aggiornerà alle ore ${hv_orarioBreve(orario + HV_CACHE_DURATA)}. Copre solo i migliori marcatori del campionato (limite del piano gratuito), non tutti i giocatori.</p>
    ${hv_avvisoDatiVecchi(scaduta)}
  `;
}

async function hv_initHome(config) {
  document.getElementById("lega-nome").textContent = config.lega.nome;
  document.getElementById("lega-stagione").textContent = "Stagione " + config.lega.stagione;
  hv_countdown(config.lega.dataAsta);
  await hv_renderIncrocio(config);
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
