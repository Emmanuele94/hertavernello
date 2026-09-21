// ===== Tutto ciò che si può calcolare UNA VOLTA che i risultati di giornata
// sono salvati — zero inserimento manuale aggiuntivo (Fase 20 del brief) =====

// "risultati" salva fantapunti (homeScore/awayScore) e gol fantasy (homeGoals/awayGoals).
// Per i vecchi record senza gol salvati, li ricaviamo con la regola 66 = 1 gol, poi +1 ogni 4 punti.
// ordinato per giornata crescente prima dell'uso (lo ordiniamo qui per sicurezza).

function hv_golDerivato(r, lato) {
  const keyGoals = lato === "away" ? "awayGoals" : "homeGoals";
  const keyScore = lato === "away" ? "awayScore" : "homeScore";
  const rawGoals = r?.[keyGoals];
  const g = Number(rawGoals);
  if (rawGoals != null && rawGoals !== "" && Number.isFinite(g) && g >= 0) return g;
  if (typeof hv_calcolaGolDaPunteggio === "function") return hv_calcolaGolDaPunteggio(r?.[keyScore]);
  const rawScore = r?.[keyScore];
  if (rawScore == null || rawScore === "") return null;
  const score = Number(rawScore);
  if (!Number.isFinite(score)) return null;
  return score < 66 ? 0 : 1 + Math.floor((score - 66 + 1e-9) / 4);
}

function hv_esitoDerivato(r) {
  const homeGoals = hv_golDerivato(r, "home");
  const awayGoals = hv_golDerivato(r, "away");
  return { homeGoals, awayGoals, winner: homeGoals > awayGoals ? "home" : awayGoals > homeGoals ? "away" : "draw" };
}

function hv_calcolaClassificaLega(risultati, squadre) {
  const tabella = {};
  squadre.forEach((s) => {
    tabella[s.id] = {
      squadra: s,
      giocate: 0, vinte: 0, pareggiate: 0, perse: 0,
      punti: 0, fpFatti: 0, fpSubiti: 0, golFatti: 0, golSubiti: 0,
      formaRecente: [], // ultime giornate, più recente per prima: "V" | "P" | "S"
    };
  });

  const ordinati = [...risultati].sort((a, b) => a.matchday - b.matchday);

  ordinati.forEach((r) => {
    const home = tabella[r.homeTeamId];
    const away = tabella[r.awayTeamId];
    if (!home || !away) return;

    home.giocate++; away.giocate++;
    home.fpFatti += Number(r.homeScore) || 0; home.fpSubiti += Number(r.awayScore) || 0;
    away.fpFatti += Number(r.awayScore) || 0; away.fpSubiti += Number(r.homeScore) || 0;
    const esito = hv_esitoDerivato(r);
    home.golFatti += esito.homeGoals || 0; home.golSubiti += esito.awayGoals || 0;
    away.golFatti += esito.awayGoals || 0; away.golSubiti += esito.homeGoals || 0;

    if (esito.winner === "home") {
      home.vinte++; home.punti += 3; home.formaRecente.unshift("V");
      away.perse++; away.formaRecente.unshift("S");
    } else if (esito.winner === "away") {
      away.vinte++; away.punti += 3; away.formaRecente.unshift("V");
      home.perse++; home.formaRecente.unshift("S");
    } else {
      home.pareggiate++; home.punti += 1; home.formaRecente.unshift("P");
      away.pareggiate++; away.punti += 1; away.formaRecente.unshift("P");
    }
  });

  const classifica = Object.values(tabella).sort(
    (a, b) => b.punti - a.punti || b.fpFatti - a.fpFatti - (b.fpSubiti - a.fpSubiti)
  );
  classifica.forEach((r, i) => (r.posizione = i + 1));
  return classifica;
}

// Striscia attiva (vittorie o sconfitte consecutive) per una squadra, guardando
// la forma recente già calcolata (più recente per prima).
function hv_strisciaAttiva(formaRecente) {
  if (formaRecente.length === 0) return { tipo: null, lunghezza: 0 };
  const tipo = formaRecente[0];
  if (tipo === "P") return { tipo: "P", lunghezza: 1 };
  let lunghezza = 0;
  for (const esito of formaRecente) {
    if (esito !== tipo) break;
    lunghezza++;
  }
  return { tipo, lunghezza };
}

// Record stagionali (Fase 20): miglior/peggior punteggio, migliore/peggior
// giornata, striscia più lunga mai avuta da ciascuna squadra.
function hv_calcolaRecord(risultati, squadre) {
  let migliorPunteggio = null, peggiorPunteggio = null;
  const perGiornata = {};

  risultati.forEach((r) => {
    [
      { teamId: r.homeTeamId, score: r.homeScore, matchday: r.matchday },
      { teamId: r.awayTeamId, score: r.awayScore, matchday: r.matchday },
    ].forEach((v) => {
      if (!migliorPunteggio || v.score > migliorPunteggio.score) migliorPunteggio = v;
      if (!peggiorPunteggio || v.score < peggiorPunteggio.score) peggiorPunteggio = v;
      perGiornata[v.matchday] = perGiornata[v.matchday] || [];
      perGiornata[v.matchday].push(v);
    });
  });

  const nome = (id) => (squadre.find((s) => s.id === id) || {}).nomeFantasquadra || id;

  return {
    migliorPunteggio: migliorPunteggio && { ...migliorPunteggio, nome: nome(migliorPunteggio.teamId) },
    peggiorPunteggio: peggiorPunteggio && { ...peggiorPunteggio, nome: nome(peggiorPunteggio.teamId) },
  };
}

// Testa a testa fra due fantasquadre
function hv_testaATesta(risultati, teamIdA, teamIdB) {
  const scontri = risultati.filter(
    (r) => (r.homeTeamId === teamIdA && r.awayTeamId === teamIdB) || (r.homeTeamId === teamIdB && r.awayTeamId === teamIdA)
  );
  let vittorieA = 0, vittorieB = 0, pareggi = 0;
  scontri.forEach((r) => {
    const homeGoals = hv_golDerivato(r, "home");
    const awayGoals = hv_golDerivato(r, "away");
    const golA = r.homeTeamId === teamIdA ? homeGoals : awayGoals;
    const golB = r.homeTeamId === teamIdA ? awayGoals : homeGoals;
    if (golA > golB) vittorieA++;
    else if (golB > golA) vittorieB++;
    else pareggi++;
  });
  return { incontri: scontri.length, vittorieA, vittorieB, pareggi };
}

// ===== Badge (Fase 2 del brief): tutti calcolati da data/risultati.json,
// nessun inserimento manuale in più. Restituisce { squadraId: [badge, ...] }. =====
function hv_calcolaBadge(risultati, squadre) {
  if (!risultati || risultati.length === 0) return {};

  const giornate = [...new Set(risultati.map((r) => r.matchday))].sort((a, b) => a - b);
  const contaComando = {};
  const contaUltimo = {};
  const striscaMax = {};
  const striscaCorrente = {};
  squadre.forEach((s) => {
    contaComando[s.id] = 0;
    contaUltimo[s.id] = 0;
    striscaMax[s.id] = 0;
    striscaCorrente[s.id] = 0;
  });

  giornate.forEach((g) => {
    const parziale = hv_calcolaClassificaLega(risultati.filter((r) => r.matchday <= g), squadre);
    if (parziale.length === 0) return;
    contaComando[parziale[0].squadra.id]++;
    contaUltimo[parziale[parziale.length - 1].squadra.id]++;

    risultati
      .filter((r) => r.matchday === g)
      .forEach((r) => {
        const esito = hv_esitoDerivato(r);
        const winnerId = esito.winner === "home" ? r.homeTeamId : esito.winner === "away" ? r.awayTeamId : null;
        const loserId = esito.winner === "home" ? r.awayTeamId : esito.winner === "away" ? r.homeTeamId : null;
        if (winnerId) {
          striscaCorrente[winnerId] = (striscaCorrente[winnerId] || 0) + 1;
          striscaMax[winnerId] = Math.max(striscaMax[winnerId] || 0, striscaCorrente[winnerId]);
        }
        if (loserId) striscaCorrente[loserId] = 0;
      });
  });

  const vittorieMisura = {};
  const sconfitteMisura = {};
  squadre.forEach((s) => {
    vittorieMisura[s.id] = 0;
    sconfitteMisura[s.id] = 0;
  });
  risultati.forEach((r) => {
    const scarto = Math.abs((Number(r.homeScore) || 0) - (Number(r.awayScore) || 0));
    const esito = hv_esitoDerivato(r);
    if (esito.winner === "home") {
      if (scarto <= 1) vittorieMisura[r.homeTeamId]++;
      if (scarto <= 0.5) sconfitteMisura[r.awayTeamId]++;
    } else if (esito.winner === "away") {
      if (scarto <= 1) vittorieMisura[r.awayTeamId]++;
      if (scarto <= 0.5) sconfitteMisura[r.homeTeamId]++;
    }
  });

  const classificaFinale = hv_calcolaClassificaLega(risultati, squadre);
  const nomeSquadra = (id) => (squadre.find((s) => s.id === id) || {}).nomeFantasquadra || id;

  const top = (obj, minimo = 1) => {
    const entries = Object.entries(obj).filter(([, v]) => v >= minimo);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return { squadraId: entries[0][0], valore: entries[0][1] };
  };

  const badge = [];
  const bComando = top(contaComando);
  if (bComando) badge.push({ icona: "👑", titolo: "Il Dominatore", descrizione: `${nomeSquadra(bComando.squadraId)} — ${bComando.valore} giornate al comando`, squadraId: bComando.squadraId });

  const bUltimo = top(contaUltimo);
  if (bUltimo) badge.push({ icona: "🔻", titolo: "La Maglia Nera", descrizione: `${nomeSquadra(bUltimo.squadraId)} — ${bUltimo.valore} giornate all'ultimo posto`, squadraId: bUltimo.squadraId });

  const bStriscia = top(striscaMax, 2);
  if (bStriscia) badge.push({ icona: "🔥", titolo: "La Corazzata", descrizione: `${nomeSquadra(bStriscia.squadraId)} — ${bStriscia.valore} vittorie di fila (record)`, squadraId: bStriscia.squadraId });

  const bVittorieMisura = top(vittorieMisura);
  if (bVittorieMisura) badge.push({ icona: "🎯", titolo: "Il Cecchino", descrizione: `${nomeSquadra(bVittorieMisura.squadraId)} — ${bVittorieMisura.valore} vittorie con un solo punto di scarto`, squadraId: bVittorieMisura.squadraId });

  const bSconfitteMisura = top(sconfitteMisura);
  if (bSconfitteMisura) badge.push({ icona: "💔", titolo: "Il Perseguitato", descrizione: `${nomeSquadra(bSconfitteMisura.squadraId)} — ${bSconfitteMisura.valore} sconfitte per mezzo punto o meno`, squadraId: bSconfitteMisura.squadraId });

  if (classificaFinale.length > 0) {
    const migliorDifesa = [...classificaFinale].sort((a, b) => a.fpSubiti - b.fpSubiti)[0];
    badge.push({ icona: "🛡️", titolo: "Miglior Difesa", descrizione: `${migliorDifesa.squadra.nomeFantasquadra} — ${migliorDifesa.fpSubiti.toFixed(1)} fantapunti subiti in totale`, squadraId: migliorDifesa.squadra.id });

    const migliorAttacco = [...classificaFinale].sort((a, b) => b.fpFatti - a.fpFatti)[0];
    badge.push({ icona: "⚡", titolo: "Miglior Attacco", descrizione: `${migliorAttacco.squadra.nomeFantasquadra} — ${migliorAttacco.fpFatti.toFixed(1)} fantapunti fatti in totale`, squadraId: migliorAttacco.squadra.id });
  }

  const perSquadra = {};
  badge.forEach((b) => {
    if (!perSquadra[b.squadraId]) perSquadra[b.squadraId] = [];
    perSquadra[b.squadraId].push(b);
  });
  return perSquadra;
}

if (typeof module !== "undefined") {
  module.exports = { hv_golDerivato, hv_esitoDerivato, hv_calcolaClassificaLega, hv_strisciaAttiva, hv_calcolaRecord, hv_testaATesta, hv_calcolaBadge };
}
