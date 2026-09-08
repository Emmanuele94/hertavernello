// Stesso stile di normalizzazione già usato in js/api.js del sito reale
// (hv_normalizza), riadattato per i nomi di fantasquadra invece che le
// squadre reali di Serie A.
function hv_normalizzaNome(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Distanza di Levenshtein, per il fuzzy match (tipico errore OCR: "VerneIlo"
// invece di "Vernello" — una lettera scambiata/mancante).
function hv_distanzaLevenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

// Trova la squadra più vicina a un nome grezzo (da OCR, testo incollato, ecc.)
// tra l'elenco delle fantasquadre della stagione. Non inventa mai squadre:
// se la distanza è troppa, restituisce esito "nessuna corrispondenza".
// Esito: { squadra, confidenza: "esatta" | "fuzzy" | "nessuna" }
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

  // Soglia proporzionale alla lunghezza del nome: una tolleranza fissa
  // penalizzerebbe troppo i nomi corti e troppo poco quelli lunghi.
  const sogliaMassima = Math.max(2, Math.round(norm.length * 0.3));
  if (migliore && distanzaMinima <= sogliaMassima) {
    return { squadra: migliore, confidenza: "fuzzy" };
  }
  return { squadra: null, confidenza: "nessuna" };
}

if (typeof module !== "undefined") {
  module.exports = { hv_normalizzaNome, hv_distanzaLevenshtein, hv_trovaFantasquadra };
}
