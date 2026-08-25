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

// ===== Incrocio: chi ha giocatori nelle squadre che stanno per scendere in campo =====
// Lista PIATTA: un elemento per ogni singolo giocatore (non raggruppati per proprietario)
function hv_giocatoriPerSquadraRealeFlat(codice, roseData, config, squadreRef) {
  const risultati = [];
  (roseData.rose || []).forEach((entry) => {
    const squadra = config.squadre.find((s) => s.id === entry.squadraId);
    if (!squadra) return;
    (entry.giocatori || []).forEach((g) => {
      if (hv_trovaCodice(g.squadraReale, squadreRef) === codice) {
        risultati.push({ squadraId: squadra.id, nomeReale: squadra.nomeReale, nomeGiocatore: g.nome });
      }
    });
  });
  return risultati;
}

function hv_trovaAvversarioGiornata(squadraId, giornata, calendarioData) {
  const g = (calendarioData.giornate || []).find((x) => x.giornata === giornata);
  if (!g) return null;
  const coppia = g.incontri.find((c) => c.includes(squadraId));
  if (!coppia || coppia.length < 2) return null;
  return coppia[0] === squadraId ? coppia[1] : coppia[0];
}

function hv_renderIncrocioMatch(match, roseData, config, squadreRef, calendarioData) {
  const listaCasa = hv_giocatoriPerSquadraRealeFlat(match.casaCodice, roseData, config, squadreRef);
  const listaTrasferta = hv_giocatoriPerSquadraRealeFlat(match.trasfertaCodice, roseData, config, squadreRef);

  if (match.matchday) {
    const idTrasferta = listaTrasferta.map((t) => t.squadraId);
    const idCasa = listaCasa.map((c) => c.squadraId);
    listaCasa.forEach((c) => {
      const avv = hv_trovaAvversarioGiornata(c.squadraId, match.matchday, calendarioData);
      c.avversarioDiretto = avv && idTrasferta.includes(avv);
    });
    listaTrasferta.forEach((t) => {
      const avv = hv_trovaAvversarioGiornata(t.squadraId, match.matchday, calendarioData);
      t.avversarioDiretto = avv && idCasa.includes(avv);
    });
  }

  const cella = (entry, codiceSquadra) => {
    if (!entry) return '<span class="incrocio-vuoto">—</span>';
    const avv = entry.avversarioDiretto ? ' <span class="incrocio-avversario">⚔️</span>' : "";
    return `<img src="assets/loghi/${codiceSquadra}.png" class="logo-squadra-mini" alt="">
      <strong>${entry.nomeReale}</strong>: ${entry.nomeGiocatore}${avv}`;
  };

  const maxRighe = Math.max(listaCasa.length, listaTrasferta.length);
  let corpo;

  if (maxRighe === 0) {
    corpo = '<p class="muted" style="font-size:12.5px; padding: 14px 16px;">Nessuno in lega ha giocatori in questa partita</p>';
  } else {
    const righe = [];
    for (let i = 0; i < maxRighe; i++) {
      righe.push(`
        <div class="incrocio-riga-vs">
          <span class="incrocio-lato">${cella(listaCasa[i], match.casaCodice)}</span>
          <span class="incrocio-vs-sep">vs</span>
          <span class="incrocio-lato">${cella(listaTrasferta[i], match.trasfertaCodice)}</span>
        </div>`);
    }
    corpo = `<div class="incrocio-vs-list">${righe.join("")}</div>`;
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
    const { live, prossimoTurno } = await hv_getPartite(apiKey, squadreRef);

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
    const classificaReale = await hv_getClassificaReale(apiKey, squadreRef);

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
      <p class="muted" style="font-size:11px; margin-top:4px;">Le previsioni caricate prima di oggi vanno ricompilate da admin.html con l'ordine esatto — quelle vecchie (solo per fascia) non vengono più conteggiate.</p>
    `;
  } catch (err) {
    wrap.innerHTML = `<p class="empty-state">Non riesco a contattare l'API (${err.message}).</p>`;
  }
}

// ===== Cache locale: evita di interrogare l'API a ogni apertura della pagina =====
const HV_CACHE_DURATA = 4 * 60 * 60 * 1000; // 4 ore — abbondantemente entro i limiti gratuiti

function hv_cacheGet(chiave, maxAgeMs) {
  try {
    const raw = localStorage.getItem(chiave);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.t > maxAgeMs) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function hv_cacheSet(chiave, valore) {
  try {
    localStorage.setItem(chiave, JSON.stringify({ t: Date.now(), v: valore }));
  } catch (e) {}
}

function hv_orarioBreve(timestamp) {
  const d = new Date(timestamp);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

// ===== Classifica Serie A completa =====
async function hv_renderClassificaSerieA(config) {
  const wrap = document.getElementById("classifica-wrap");
  const apiKey = config.lega.footballDataApiKey;

  if (!apiKey) {
    wrap.innerHTML = '<p class="empty-state">Aggiungi una chiave gratuita di football-data.org in config.json per attivare questa sezione.</p>';
    return;
  }

  const cache = hv_cacheGet("hv_cache_classifica", HV_CACHE_DURATA);
  let righe = cache ? cache.v : null;

  if (!righe) {
    wrap.innerHTML = '<p class="empty-state">Carico la classifica...</p>';
    try {
      const squadreRef = await hv_caricaSquadreRef();
      righe = await hv_getClassificaCompleta(apiKey, squadreRef);
      hv_cacheSet("hv_cache_classifica", righe);
    } catch (err) {
      wrap.innerHTML = `<p class="empty-state">Non riesco a contattare l'API (${err.message}).</p>`;
      return;
    }
  }

  const aggiornatoAlle = hv_cacheGet("hv_cache_classifica", HV_CACHE_DURATA);
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
    <p class="muted" style="font-size:11px; margin-top:8px;">Aggiornato alle ${aggiornatoAlle ? hv_orarioBreve(aggiornatoAlle.t) : "—"} — si aggiorna al massimo ogni 4 ore per non consumare troppe chiamate gratuite.</p>
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

  const cache = hv_cacheGet("hv_cache_marcatori", HV_CACHE_DURATA);
  let marcatori = cache ? cache.v : null;

  if (!marcatori) {
    wrap.innerHTML = '<p class="empty-state">Carico i marcatori...</p>';
    try {
      const squadreRef = await hv_caricaSquadreRef();
      marcatori = await hv_getTopScorers(apiKey, squadreRef);
      hv_cacheSet("hv_cache_marcatori", marcatori);
    } catch (err) {
      wrap.innerHTML = `<p class="empty-state">Non riesco a contattare l'API (${err.message}).</p>`;
      return;
    }
  }

  const aggiornatoAlle = hv_cacheGet("hv_cache_marcatori", HV_CACHE_DURATA);

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
    <p class="muted" style="font-size:11px; margin-top:8px;">Aggiornato alle ${aggiornatoAlle ? hv_orarioBreve(aggiornatoAlle.t) : "—"} — copre solo i migliori marcatori del campionato (limite del piano gratuito), non tutti i giocatori.</p>
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
