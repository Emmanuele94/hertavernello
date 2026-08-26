// ===== Generatore casuale deterministico (stessa giornata = stesse domande sempre) =====
function hv_seedRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hv_shuffleSeed(array, rng) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hv_pickSeed(array, n, rng) {
  return hv_shuffleSeed(array, rng).slice(0, n);
}

// ===== Le 7 tipologie di domande, tutte basate su dati reali (mai inventati) =====

function hv_domandaRisultatoPartita(match, rng) {
  if (match.golCasa == null) return null;
  const opzioni = [
    { testo: match.casaNome, corretta: match.golCasa > match.golTrasferta },
    { testo: match.trasfertaNome, corretta: match.golTrasferta > match.golCasa },
    { testo: "Pareggio", corretta: match.golCasa === match.golTrasferta },
  ];
  return { testo: `Chi ha vinto ${match.casaNome} — ${match.trasfertaNome}?`, opzioni: hv_shuffleSeed(opzioni, rng) };
}

function hv_domandaGolTotali(partite, rng) {
  const totale = partite.reduce((s, p) => s + (p.golCasa ?? 0) + (p.golTrasferta ?? 0), 0);
  const offsets = hv_shuffleSeed([-4, -3, -2, 2, 3, 4], rng);
  const numeri = new Set([totale]);
  for (const o of offsets) {
    if (numeri.size >= 3) break;
    numeri.add(Math.max(0, totale + o));
  }
  const opzioni = [...numeri].slice(0, 3).map((v) => ({ testo: String(v), corretta: v === totale }));
  return { testo: "Quanti gol totali sono stati segnati in questa giornata (tutte le partite insieme)?", opzioni: hv_shuffleSeed(opzioni, rng) };
}

function hv_domandaPartitaPiuGol(partite, rng) {
  const valide = partite.filter((p) => p.golCasa != null);
  if (valide.length < 3) return null;
  const campione = hv_pickSeed(valide, 3, rng);
  const conGol = campione.map((p) => ({ p, tot: p.golCasa + p.golTrasferta }));
  const max = Math.max(...conGol.map((c) => c.tot));
  if (conGol.filter((c) => c.tot === max).length !== 1) return null;
  const opzioni = conGol.map((c) => ({ testo: `${c.p.casaNome} — ${c.p.trasfertaNome}`, corretta: c.tot === max }));
  return { testo: "Quale di queste partite ha finito con più gol complessivi?", opzioni: hv_shuffleSeed(opzioni, rng) };
}

function hv_domandaScartoMaggiore(partite, rng) {
  const valide = partite.filter((p) => p.golCasa != null && p.golCasa !== p.golTrasferta);
  if (valide.length < 3) return null;
  const conScarto = valide.map((p) => ({
    scarto: Math.abs(p.golCasa - p.golTrasferta),
    vincitore: p.golCasa > p.golTrasferta ? p.casaNome : p.trasfertaNome,
  }));
  conScarto.sort((a, b) => b.scarto - a.scarto);
  if (conScarto.filter((c) => c.scarto === conScarto[0].scarto).length !== 1) return null;
  const corretta = conScarto[0];
  const altri = hv_pickSeed(conScarto.slice(1), 2, rng);
  if (altri.length < 2) return null;
  const opzioni = [corretta, ...altri].map((c) => ({ testo: c.vincitore, corretta: c === corretta }));
  return { testo: "Quale squadra ha vinto con più gol di scarto in questa giornata?", opzioni: hv_shuffleSeed(opzioni, rng) };
}

function hv_domandaPareggi(partite, rng) {
  const valide = partite.filter((p) => p.golCasa != null);
  if (valide.length === 0) return null;
  const count = valide.filter((p) => p.golCasa === p.golTrasferta).length;
  const numeri = new Set([count, count + 1, Math.max(0, count - 1)]);
  let extra = count + 2;
  while (numeri.size < 3) numeri.add(extra++);
  const opzioni = [...numeri].slice(0, 3).map((v) => ({ testo: String(v), corretta: v === count }));
  return { testo: "Quante partite sono finite in pareggio in questa giornata?", opzioni: hv_shuffleSeed(opzioni, rng) };
}

function hv_domandaVittorieCasaTrasferta(partite, rng) {
  const valide = partite.filter((p) => p.golCasa != null);
  if (valide.length === 0) return null;
  const casa = valide.filter((p) => p.golCasa > p.golTrasferta).length;
  const trasf = valide.filter((p) => p.golTrasferta > p.golCasa).length;
  if (casa === trasf) return null;
  const opzioni = [
    { testo: "Più vittorie in casa", corretta: casa > trasf },
    { testo: "Più vittorie in trasferta", corretta: trasf > casa },
    { testo: "Sono state pari", corretta: false },
  ];
  return { testo: "In questa giornata, ci sono state più vittorie in casa o in trasferta?", opzioni: hv_shuffleSeed(opzioni, rng) };
}

function hv_domandaChiHaPescatoMeglio(partite, config, roseData, squadreRef, rng) {
  const valide = partite.filter((p) => p.golCasa != null);
  if (valide.length === 0) return null;
  const vincenti = new Set();
  valide.forEach((p) => {
    if (p.golCasa > p.golTrasferta) vincenti.add(p.casaCodice);
    else if (p.golTrasferta > p.golCasa) vincenti.add(p.trasfertaCodice);
  });
  if (vincenti.size === 0) return null;

  const conteggio = {};
  (roseData.rose || []).forEach((entry) => {
    let n = 0;
    (entry.giocatori || []).forEach((g) => {
      const cod = hv_trovaCodice(g.squadraReale, squadreRef);
      if (cod && vincenti.has(cod)) n++;
    });
    conteggio[entry.squadraId] = n;
  });

  const conRosa = config.squadre.filter((s) => (roseData.rose || []).some((r) => r.squadraId === s.id));
  if (conRosa.length < 2) return null;
  const [s1, s2] = hv_pickSeed(conRosa, 2, rng);
  const c1 = conteggio[s1.id] || 0;
  const c2 = conteggio[s2.id] || 0;

  const opzioni = [
    { testo: s1.nomeReale, corretta: c1 > c2 },
    { testo: s2.nomeReale, corretta: c2 > c1 },
    { testo: "Pari merito", corretta: c1 === c2 },
  ];
  return {
    testo: `Chi ha "pescato" meglio in questa giornata tra le squadre reali vincenti: ${s1.nomeReale} o ${s2.nomeReale}?`,
    opzioni: hv_shuffleSeed(opzioni, rng),
  };
}

function hv_domandaAvversarioFantalega(giornata, calendarioData, config, rng) {
  const g = (calendarioData.giornate || []).find((x) => x.giornata === giornata);
  if (!g) return null;
  const coppie = g.incontri.filter((c) => c.length === 2);
  if (coppie.length === 0) return null;
  const [idA, idB] = hv_pickSeed(coppie, 1, rng)[0];
  const sA = config.squadre.find((s) => s.id === idA);
  const sB = config.squadre.find((s) => s.id === idB);
  if (!sA || !sB) return null;

  const distrattori = hv_pickSeed(
    config.squadre.filter((s) => s.id !== idA && s.id !== idB),
    2,
    rng
  );
  if (distrattori.length < 2) return null;

  const opzioni = [
    { testo: sB.nomeReale, corretta: true },
    { testo: distrattori[0].nomeReale, corretta: false },
    { testo: distrattori[1].nomeReale, corretta: false },
  ];
  return { testo: `Nella vostra lega, in questa giornata, chi affronta ${sA.nomeReale}?`, opzioni: hv_shuffleSeed(opzioni, rng) };
}

function hv_domandaCuriositaRose(config, roseData, squadreRef, rng) {
  const codici = hv_pickSeed(squadreRef.squadre.map((s) => s.codice), 6, rng);
  for (const codice of codici) {
    const conteggio = {};
    (roseData.rose || []).forEach((entry) => {
      let n = 0;
      (entry.giocatori || []).forEach((g) => {
        if (hv_trovaCodice(g.squadraReale, squadreRef) === codice) n++;
      });
      conteggio[entry.squadraId] = n;
    });
    const valori = config.squadre.map((s) => ({ s, n: conteggio[s.id] || 0 })).filter((x) => x.n > 0);
    if (valori.length < 3) continue;
    valori.sort((a, b) => b.n - a.n);
    if (valori[0].n === valori[1].n) continue;

    const nomeSquadra = squadreRef.squadre.find((s) => s.codice === codice).nome;
    const vincitore = valori[0];
    const altri = hv_pickSeed(valori.slice(1), 2, rng);
    if (altri.length < 2) continue;

    const opzioni = [vincitore, ...altri].map((v) => ({ testo: v.s.nomeReale, corretta: v === vincitore }));
    return { testo: `Chi ha in rosa più giocatori del ${nomeSquadra}?`, opzioni: hv_shuffleSeed(opzioni, rng) };
  }
  return null;
}

// ===== Generatore per giornata: fino a 10 domande, deterministico (stesso seed = stesse domande) =====
function hv_generaDomandeGiornata(giornata, partiteStagione, config, roseData, calendarioData, squadreRef) {
  const partiteGiornata = partiteStagione.filter((p) => p.matchday === giornata && p.status === "FINISHED" && p.golCasa != null);
  if (partiteGiornata.length === 0) return [];

  const rng = hv_seedRng(giornata * 9973 + 17);
  const pool = [];

  hv_pickSeed(partiteGiornata, Math.min(5, partiteGiornata.length), rng).forEach((p) => {
    const d = hv_domandaRisultatoPartita(p, rng);
    if (d) pool.push(d);
  });

  [
    hv_domandaGolTotali(partiteGiornata, rng),
    hv_domandaPartitaPiuGol(partiteGiornata, rng),
    hv_domandaScartoMaggiore(partiteGiornata, rng),
    hv_domandaPareggi(partiteGiornata, rng),
    hv_domandaVittorieCasaTrasferta(partiteGiornata, rng),
    hv_domandaChiHaPescatoMeglio(partiteGiornata, config, roseData, squadreRef, rng),
    hv_domandaAvversarioFantalega(giornata, calendarioData, config, rng),
    hv_domandaCuriositaRose(config, roseData, squadreRef, rng),
  ].forEach((d) => {
    if (d) pool.push(d);
  });

  return hv_shuffleSeed(pool, rng).slice(0, 10);
}

// ===== Stato di ogni giornata (bloccata finché non è finita davvero) =====
function hv_statoGiornata(giornata, partiteStagione) {
  const partiteG = partiteStagione.filter((p) => p.matchday === giornata);
  if (partiteG.length === 0) return "sconosciuta";
  return partiteG.every((p) => p.status === "FINISHED") ? "disponibile" : "bloccata";
}

// ===== Progressi salvati nel browser (privati, non condivisi) =====
const HV_QUIZ_CHIAVE = "hv_quiz_progressi";

function hv_quizLeggiProgressi() {
  try {
    const raw = localStorage.getItem(HV_QUIZ_CHIAVE);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function hv_quizSalvaProgresso(giornata, punteggio, totale) {
  const progressi = hv_quizLeggiProgressi();
  progressi[giornata] = { punteggio, totale, completata: new Date().toISOString() };
  try {
    localStorage.setItem(HV_QUIZ_CHIAVE, JSON.stringify(progressi));
  } catch (e) {}
}

function hv_quizReset(giornata) {
  const progressi = hv_quizLeggiProgressi();
  delete progressi[giornata];
  try {
    localStorage.setItem(HV_QUIZ_CHIAVE, JSON.stringify(progressi));
  } catch (e) {}
}

// ===== Interfaccia =====
let hv_quizConfig, hv_quizRose, hv_quizCalendario, hv_quizSquadreRef, hv_quizPartiteStagione;
let hv_quizStatoCorrente = null;

function hv_renderGrigliaQuiz() {
  const wrap = document.getElementById("quiz-griglia");
  const progressi = hv_quizLeggiProgressi();
  wrap.innerHTML = "";

  for (let g = 1; g <= 38; g++) {
    const stato = hv_statoGiornata(g, hv_quizPartiteStagione);
    const completata = progressi[g];
    const badge = document.createElement("button");
    badge.type = "button";

    let classe = "quiz-badge";
    let stato_testo = "";
    if (stato !== "disponibile") {
      classe += " quiz-badge-bloccata";
      stato_testo = "Non ancora";
      badge.disabled = true;
    } else if (completata) {
      classe += " quiz-badge-completata";
      stato_testo = `${completata.punteggio}/${completata.totale}`;
    } else {
      classe += " quiz-badge-da-giocare";
      stato_testo = "Gioca";
    }

    badge.className = classe;
    badge.innerHTML = `<span class="quiz-badge-num">${g}</span><span class="quiz-badge-stato">${stato_testo}</span>`;
    if (stato === "disponibile") badge.addEventListener("click", () => hv_apriGiornata(g));
    wrap.appendChild(badge);
  }
}

function hv_apriGiornata(giornata) {
  const progressi = hv_quizLeggiProgressi();
  document.getElementById("quiz-griglia").classList.add("hidden");
  document.getElementById("quiz-gioco").classList.remove("hidden");

  if (progressi[giornata]) {
    hv_renderRecap(giornata, progressi[giornata]);
    return;
  }

  const domande = hv_generaDomandeGiornata(giornata, hv_quizPartiteStagione, hv_quizConfig, hv_quizRose, hv_quizCalendario, hv_quizSquadreRef);
  if (domande.length === 0) {
    alert("Non ho abbastanza dati per generare il quiz di questa giornata (carica rose/calendario da admin.html).");
    hv_tornaAllaGriglia();
    return;
  }

  hv_quizStatoCorrente = { giornata, domande, indice: 0, corrette: 0 };
  hv_renderDomandaCorrente();
}

function hv_renderDomandaCorrente() {
  const { domande, indice, giornata } = hv_quizStatoCorrente;
  const d = domande[indice];
  const wrap = document.getElementById("quiz-gioco");

  wrap.innerHTML = `
    <div class="quiz-header">
      <button type="button" id="quiz-indietro" class="quiz-indietro">← Giornate</button>
      <span class="quiz-progresso">Giornata ${giornata} — domanda ${indice + 1} di ${domande.length}</span>
    </div>
    <div class="quiz-domanda-card">
      <p class="quiz-domanda-testo">${d.testo}</p>
      <div class="quiz-opzioni">
        ${d.opzioni.map((o, i) => `<button type="button" class="quiz-opzione" data-i="${i}">${o.testo}</button>`).join("")}
      </div>
      <p id="quiz-notifica" class="quiz-notifica"></p>
    </div>
  `;

  document.getElementById("quiz-indietro").addEventListener("click", hv_tornaAllaGriglia);
  wrap.querySelectorAll(".quiz-opzione").forEach((btn) => {
    btn.addEventListener("click", () => hv_rispondi(Number(btn.dataset.i)));
  });
}

function hv_rispondi(indiceScelto) {
  const { domande, indice } = hv_quizStatoCorrente;
  const d = domande[indice];
  const bottoni = document.querySelectorAll(".quiz-opzione");
  const notifica = document.getElementById("quiz-notifica");

  bottoni.forEach((btn) => (btn.disabled = true));
  const scelta = d.opzioni[indiceScelto];
  bottoni[indiceScelto].classList.add(scelta.corretta ? "quiz-corretta" : "quiz-sbagliata");

  if (scelta.corretta) {
    hv_quizStatoCorrente.corrette++;
    notifica.textContent = "Corretto! 🎉";
    notifica.className = "quiz-notifica quiz-notifica-corretta";
  } else {
    const indiceGiusto = d.opzioni.findIndex((o) => o.corretta);
    bottoni[indiceGiusto].classList.add("quiz-corretta");
    notifica.textContent = "Sbagliata — la risposta giusta è evidenziata in verde.";
    notifica.className = "quiz-notifica quiz-notifica-sbagliata";
  }

  setTimeout(() => {
    hv_quizStatoCorrente.indice++;
    if (hv_quizStatoCorrente.indice >= domande.length) hv_terminaQuiz();
    else hv_renderDomandaCorrente();
  }, 1400);
}

function hv_terminaQuiz() {
  const { giornata, domande, corrette } = hv_quizStatoCorrente;
  hv_quizSalvaProgresso(giornata, corrette, domande.length);
  hv_renderRecap(giornata, { punteggio: corrette, totale: domande.length });
}

function hv_renderRecap(giornata, risultato) {
  const wrap = document.getElementById("quiz-gioco");
  wrap.innerHTML = `
    <div class="quiz-header">
      <button type="button" id="quiz-indietro" class="quiz-indietro">← Giornate</button>
      <span class="quiz-progresso">Giornata ${giornata} — completata</span>
    </div>
    <div class="quiz-recap">
      <p class="quiz-recap-punteggio">${risultato.punteggio} / ${risultato.totale}</p>
      <p class="muted">Hai già risposto a questa giornata (il punteggio resta salvato solo nel tuo browser).</p>
      <button type="button" id="quiz-reset-btn" class="quiz-reset-btn">Reset delle risposte di questa giornata</button>
    </div>
  `;
  document.getElementById("quiz-indietro").addEventListener("click", hv_tornaAllaGriglia);
  document.getElementById("quiz-reset-btn").addEventListener("click", () => {
    if (!confirm(`Sicuro di voler cancellare il punteggio della giornata ${giornata}? Potrai rigiocarla.`)) return;
    hv_quizReset(giornata);
    hv_tornaAllaGriglia();
  });
}

function hv_tornaAllaGriglia() {
  document.getElementById("quiz-gioco").classList.add("hidden");
  document.getElementById("quiz-griglia").classList.remove("hidden");
  hv_renderGrigliaQuiz();
}

async function hv_initQuiz(config) {
  document.getElementById("lega-nome").textContent = config.lega.nome;
  hv_quizConfig = config;

  const apiKey = config.lega.footballDataApiKey;
  const wrap = document.getElementById("quiz-griglia");

  if (!apiKey) {
    wrap.innerHTML = '<p class="empty-state">Aggiungi una chiave gratuita di football-data.org in config.json per attivare il quiz.</p>';
    return;
  }

  wrap.innerHTML = '<p class="empty-state">Carico i dati della stagione...</p>';

  const [squadreRef, roseRes, calendarioRes] = await Promise.all([
    hv_caricaSquadreRef(),
    fetch("data/rose.json"),
    fetch("data/calendario.json"),
  ]);
  hv_quizSquadreRef = squadreRef;
  hv_quizRose = await roseRes.json();
  hv_quizCalendario = await calendarioRes.json();

  try {
    const { dati, scaduta } = await hv_cacheOFetch("hv_cache_partite_stagione", HV_CACHE_DURATA, () =>
      hv_getTutteLePartiteStagione(apiKey, squadreRef)
    );
    hv_quizPartiteStagione = dati;
    hv_renderGrigliaQuiz();
    if (scaduta) wrap.insertAdjacentHTML("beforeend", hv_avvisoDatiVecchi(true));
  } catch (err) {
    wrap.innerHTML = `<p class="empty-state">Non riesco a contattare l'API (${err.message}).</p>`;
  }
}

hv_checkGate().then((data) => {
  if (data) hv_initQuiz(data);
});
document.addEventListener("hv:unlocked", (e) => hv_initQuiz(e.detail));
