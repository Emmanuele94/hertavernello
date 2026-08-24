function hv_countdown(dataAstaISO) {
  const el = document.getElementById("countdown");
  if (!el) return;

  function aggiorna() {
    const diff = new Date(dataAstaISO).getTime() - Date.now();
    if (diff <= 0) {
      el.textContent = "Asta conclusa — stagione " + (window.hv_stagione || "") + " in corso";
      clearInterval(timer);
      return;
    }
    const g = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    el.textContent = `Asta tra ${g}g ${h}h ${m}m`;
  }

  aggiorna();
  const timer = setInterval(aggiorna, 60000);
}

// ===== Incrocio: chi ha giocatori nelle squadre che stanno per scendere in campo =====
function hv_giocatoriPerSquadraReale(codice, roseData, config, squadreRef) {
  const risultati = [];
  (roseData.rose || []).forEach((entry) => {
    const squadra = config.squadre.find((s) => s.id === entry.squadraId);
    if (!squadra) return;
    const giocatori = (entry.giocatori || []).filter(
      (g) => hv_trovaCodice(g.squadraReale, squadreRef) === codice
    );
    if (giocatori.length > 0) {
      risultati.push({ squadraId: squadra.id, nomeReale: squadra.nomeReale, giocatori: giocatori.map((g) => g.nome) });
    }
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
  const casa = hv_giocatoriPerSquadraReale(match.casaCodice, roseData, config, squadreRef);
  const trasferta = hv_giocatoriPerSquadraReale(match.trasfertaCodice, roseData, config, squadreRef);

  if (match.matchday) {
    const idTrasferta = trasferta.map((t) => t.squadraId);
    const idCasa = casa.map((c) => c.squadraId);
    casa.forEach((c) => {
      const avv = hv_trovaAvversarioGiornata(c.squadraId, match.matchday, calendarioData);
      c.avversarioDiretto = avv && idTrasferta.includes(avv);
    });
    trasferta.forEach((t) => {
      const avv = hv_trovaAvversarioGiornata(t.squadraId, match.matchday, calendarioData);
      t.avversarioDiretto = avv && idCasa.includes(avv);
    });
  }

  const col = (nome, lista) => `
    <div class="incrocio-col">
      <h4>${nome}</h4>
      ${
        lista.length === 0
          ? '<p class="muted" style="font-size:12.5px;">Nessuno in lega ha giocatori qui</p>'
          : lista
              .map(
                (r) => `
        <p class="incrocio-riga">
          <strong>${r.nomeReale}</strong>${r.avversarioDiretto ? ' <span class="incrocio-avversario">⚔️ avversari di giornata</span>' : ""}: ${r.giocatori.join(", ")}
        </p>`
              )
              .join("")
      }
    </div>`;

  const etichetta = match.live
    ? '<span class="incrocio-live">● LIVE</span>'
    : `Giornata ${match.matchday}`;

  const div = document.createElement("div");
  div.className = "incrocio-match";
  div.innerHTML = `
    <div class="incrocio-testata">
      <span>${match.casaNome} — ${match.trasfertaNome}</span>
      ${etichetta}
    </div>
    <div class="incrocio-body">
      ${col(match.casaNome, casa)}
      ${col(match.trasfertaNome, trasferta)}
    </div>
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
    wrap.innerHTML = '<p class="empty-state">Non riesco a contattare l\'API in questo momento (chiave non valida o limite richieste raggiunto).</p>';
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
      if (!squadra || !p.fasce || Object.keys(p.fasce).length === 0) return;

      let punteggio = 0;
      let conteggiate = 0;
      Object.entries(p.fasce).forEach(([codice, fasciaPrevista]) => {
        const posReale = classificaReale[codice];
        if (!posReale) return;
        const fasciaReale = hv_fasciaDaPosizione(posReale, squadreRef.fasce);
        if (fasciaReale) {
          punteggio += Math.abs(fasciaPrevista - fasciaReale);
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
      <p class="muted" style="font-size:12px; margin-top:8px;">Punteggio più basso = previsione più azzeccata (somma delle distanze tra fascia prevista e fascia reale attuale).</p>
    `;
  } catch (err) {
    wrap.innerHTML = '<p class="empty-state">Non riesco a contattare l\'API in questo momento (chiave non valida o limite richieste raggiunto).</p>';
  }
}

async function hv_initHome(config) {
  document.getElementById("lega-nome").textContent = config.lega.nome;
  document.getElementById("lega-stagione").textContent = "Stagione " + config.lega.stagione;
  window.hv_stagione = config.lega.stagione;
  hv_countdown(config.lega.dataAsta);
  await hv_renderIncrocio(config);
  await hv_renderLeaderboard(config);
}

hv_checkGate().then((data) => {
  if (data) hv_initHome(data);
});
document.addEventListener("hv:unlocked", (e) => hv_initHome(e.detail));
