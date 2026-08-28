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

const HV_GIORNI_BREVI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function hv_giornoOrarioBreve(iso) {
  const d = new Date(iso);
  return HV_GIORNI_BREVI[d.getDay()] + " " + hv_orarioBreve(d.getTime());
}

function hv_renderIncrocioMatch(match, roseData, config, squadreRef, calendarioData, punteggioPrecedente) {
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

  // Stato: LIVE (lampeggiante) / FINALE (resta visibile, non lampeggia) / orario se deve ancora iniziare
  let etichettaStato;
  if (match.live) {
    etichettaStato = `<span class="incrocio-live">● LIVE${match.minuto ? " " + match.minuto + "'" : ""}</span>`;
  } else if (match.finita) {
    etichettaStato = `<span class="incrocio-finale">● FINALE</span>`;
  } else {
    etichettaStato = `<span class="incrocio-orario">${hv_giornoOrarioBreve(match.data)}</span>`;
  }

  // Punteggio: mostrato appena disponibile (dal calcio d'inizio in poi), sia live che a fine partita
  let punteggioHtml = "";
  if (match.golCasa != null && match.golTrasferta != null) {
    punteggioHtml = `<div class="incrocio-punteggio">${match.golCasa} - ${match.golTrasferta}</div>`;
  }

  // "Ha segnato": confronto col punteggio dell'ultimo controllo per questa stessa
  // partita. Sappiamo CHE è successo un gol, non chi l'ha fatto — il piano gratuito
  // di football-data.org non include marcatori/cartellini (serve un add-on a pagamento).
  let golFlashHtml = "";
  if (match.live && punteggioPrecedente) {
    const golNotizie = [];
    if (match.golCasa != null && punteggioPrecedente.golCasa != null && match.golCasa > punteggioPrecedente.golCasa) {
      golNotizie.push(`⚽ Ha segnato il ${match.casaNome}!`);
    }
    if (match.golTrasferta != null && punteggioPrecedente.golTrasferta != null && match.golTrasferta > punteggioPrecedente.golTrasferta) {
      golNotizie.push(`⚽ Ha segnato il ${match.trasfertaNome}!`);
    }
    if (golNotizie.length > 0) {
      golFlashHtml = `<div class="incrocio-gol-flash">${golNotizie.join(" · ")}</div>`;
    }
  }

  const div = document.createElement("div");
  div.className = "incrocio-match";
  div.innerHTML = `
    <div class="incrocio-testata">
      <span class="incrocio-squadre">
        <img src="assets/loghi/${match.casaCodice}.png" alt="${match.casaCodice}" class="logo-squadra-mini">
        ${match.casaNome} — ${match.trasfertaNome}
        <img src="assets/loghi/${match.trasfertaCodice}.png" alt="${match.trasfertaCodice}" class="logo-squadra-mini">
      </span>
      ${etichettaStato}
    </div>
    ${punteggioHtml}
    ${golFlashHtml}
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

    // Punteggi dell'ultimo controllo (per capire se nel frattempo qualcuno ha segnato)
    // e finestra dinamica prima di ricontrollare l'API: spesso durante le partite,
    // molto più raramente nei giorni senza Serie A in programma.
    const cachePrecedente = hv_cacheLeggiGrezzo("hv_cache_partite");
    const partitePrecedenti = cachePrecedente && cachePrecedente.v && cachePrecedente.v.partite ? cachePrecedente.v.partite : [];
    const punteggiPrecedenti = {};
    partitePrecedenti.forEach((p) => {
      punteggiPrecedenti[p.id] = { golCasa: p.golCasa, golTrasferta: p.golTrasferta };
    });

    const ttlDinamico = hv_prossimoTTLPartite(partitePrecedenti, Date.now());
    const { dati, scaduta } = await hv_cacheOFetch("hv_cache_partite", ttlDinamico, () => hv_getPartite(apiKey, squadreRef));
    const { giornata, partite } = dati;

    wrap.innerHTML = "";

    if (!partite || partite.length === 0) {
      wrap.innerHTML = '<p class="empty-state">Nessuna partita trovata nei prossimi giorni.</p>';
      return;
    }

    if (giornata) {
      wrap.insertAdjacentHTML("beforeend", `<p class="incrocio-giornata-label">Giornata ${giornata}</p>`);
    }

    partite.forEach((match) => {
      if (!match.casaCodice || !match.trasfertaCodice) return;
      wrap.appendChild(hv_renderIncrocioMatch(match, roseData, config, squadreRef, calendarioData, punteggiPrecedenti[match.id]));
    });

    if (scaduta) wrap.insertAdjacentHTML("beforeend", hv_avvisoDatiVecchi(true));
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
    <p class="muted" style="font-size:11px; margin-top:8px;">Aggiornato alle ${hv_orarioBreve(orario)} — prossimo controllo verso le ${hv_orarioBreve(orario + ttl)}. Copre solo i migliori marcatori del campionato (limite del piano gratuito), non tutti i giocatori.</p>
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
