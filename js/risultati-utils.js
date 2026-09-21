// Utility condivise dal motore risultati.
// I nomi fantasquadra vengono normalizzati nello stesso modo usato dal resto del sito.
function hv_normalizzaNome(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function hv_distanzaLevenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function hv_trovaFantasquadra(nomeGrezzo, squadre) {
  const norm = hv_normalizzaNome(nomeGrezzo);
  if (!norm) return { squadra: null, confidenza: "nessuna" };

  const esatta = squadre.find((s) => hv_normalizzaNome(s.nomeFantasquadra) === norm);
  if (esatta) return { squadra: esatta, confidenza: "esatta" };

  let migliore = null;
  let distanzaMinima = Infinity;
  squadre.forEach((s) => {
    const d = hv_distanzaLevenshtein(norm, hv_normalizzaNome(s.nomeFantasquadra));
    if (d < distanzaMinima) {
      distanzaMinima = d;
      migliore = s;
    }
  });

  const sogliaMassima = Math.max(2, Math.round(norm.length * 0.3));
  if (migliore && distanzaMinima <= sogliaMassima) {
    return { squadra: migliore, confidenza: "fuzzy" };
  }
  return { squadra: null, confidenza: "nessuna" };
}

// Regola Hertavernello 2026/27:
// sotto 66 = 0 gol; 66 = 1 gol; poi +1 gol ogni 4 fantapunti.
// Esempi: 69.5 => 1, 70 => 2, 74 => 3, 78 => 4, 94 => 8.
function hv_calcolaGolDaPunteggio(punteggio) {
  if (punteggio == null || punteggio === "") return null;
  const n = Number(punteggio);
  if (!Number.isFinite(n)) return null;
  if (n < 66) return 0;
  return 1 + Math.floor((n - 66 + 1e-9) / 4);
}

function hv_golRisultato(risultato, lato) {
  const keyGoals = lato === "away" ? "awayGoals" : "homeGoals";
  const keyScore = lato === "away" ? "awayScore" : "homeScore";
  const rawGoals = risultato?.[keyGoals];
  const salvati = Number(rawGoals);
  if (rawGoals != null && rawGoals !== "" && Number.isFinite(salvati) && salvati >= 0) return salvati;
  return hv_calcolaGolDaPunteggio(risultato?.[keyScore]);
}

function hv_esitoRisultato(risultato) {
  const homeGoals = hv_golRisultato(risultato, "home");
  const awayGoals = hv_golRisultato(risultato, "away");
  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) {
    return { homeGoals: null, awayGoals: null, winner: null };
  }
  return {
    homeGoals,
    awayGoals,
    winner: homeGoals > awayGoals ? "home" : awayGoals > homeGoals ? "away" : "draw",
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    hv_normalizzaNome,
    hv_distanzaLevenshtein,
    hv_trovaFantasquadra,
    hv_calcolaGolDaPunteggio,
    hv_golRisultato,
    hv_esitoRisultato,
  };
}
