// ===== Tutto ciò che si può calcolare UNA VOLTA che i risultati di giornata
// sono salvati — zero inserimento manuale aggiuntivo (Fase 20 del brief) =====

// "risultati" = array flat di { matchday, homeTeamId, homeScore, awayTeamId, awayScore }
// ordinato per giornata crescente prima dell'uso (lo ordiniamo qui per sicurezza).

function hv_calcolaClassificaLega(risultati, squadre) {
  const tabella = {};
  squadre.forEach((s) => {
    tabella[s.id] = {
      squadra: s,
      giocate: 0, vinte: 0, pareggiate: 0, perse: 0,
      punti: 0, fpFatti: 0, fpSubiti: 0,
      formaRecente: [], // ultime giornate, più recente per prima: "V" | "P" | "S"
    };
  });

  const ordinati = [...risultati].sort((a, b) => a.matchday - b.matchday);

  ordinati.forEach((r) => {
    const home = tabella[r.homeTeamId];
    const away = tabella[r.awayTeamId];
    if (!home || !away) return;

    home.giocate++; away.giocate++;
    home.fpFatti += r.homeScore; home.fpSubiti += r.awayScore;
    away.fpFatti += r.awayScore; away.fpSubiti += r.homeScore;

    if (r.homeScore > r.awayScore) {
      home.vinte++; home.punti += 3; home.formaRecente.unshift("V");
      away.perse++; away.formaRecente.unshift("S");
    } else if (r.homeScore < r.awayScore) {
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
    const scoreA = r.homeTeamId === teamIdA ? r.homeScore : r.awayScore;
    const scoreB = r.homeTeamId === teamIdA ? r.awayScore : r.homeScore;
    if (scoreA > scoreB) vittorieA++;
    else if (scoreB > scoreA) vittorieB++;
    else pareggi++;
  });
  return { incontri: scontri.length, vittorieA, vittorieB, pareggi };
}

if (typeof module !== "undefined") {
  module.exports = { hv_calcolaClassificaLega, hv_strisciaAttiva, hv_calcolaRecord, hv_testaATesta };
}
