// ===== MOTORE UNICO DI IMPORTAZIONE — livello parser =====
// Riceve testo nel formato canonico (una riga = una partita):
//   "Nome squadra A" 78,5 v "Nome squadra B" 71
// Lo stesso identico parser è usato sia che il testo arrivi da:
//  - incolla testo manuale (Metodo B)
//  - futuro script Tampermonkey (stesso formato, Metodo B)
//  - testo grezzo ricostruito dall'OCR (Metodo A, vedi ocr-risultati.js)
// Il Metodo C (manuale) non passa da qui: costruisce l'oggetto direttamente.

const HV_RIGA_REGEX = /"?([^"]+?)"?\s+(\d+(?:[.,]\d+)?)\s+v\.?\s+"?([^"]+?)"?\s+(\d+(?:[.,]\d+)?)\s*$/i;

function hv_parseNumero(str) {
  return parseFloat(String(str).replace(",", "."));
}

// Trasforma il testo canonico in un elenco di partite "grezze" (nomi ancora
// non abbinati a una fantasquadra reale — quello lo fa hv_normalizzaEValida).
function hv_parseTestoRisultati(testo) {
  const righe = (testo || "")
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);

  const partite = [];
  const righeNonRiconosciute = [];

  righe.forEach((riga, i) => {
    const m = riga.match(HV_RIGA_REGEX);
    if (!m) {
      righeNonRiconosciute.push({ riga: i + 1, testo: riga });
      return;
    }
    partite.push({
      homeNomeGrezzo: m[1].trim(),
      homeScore: hv_parseNumero(m[2]),
      awayNomeGrezzo: m[3].trim(),
      awayScore: hv_parseNumero(m[4]),
    });
  });

  return { partite, righeNonRiconosciute };
}

// Abbina i nomi grezzi alle fantasquadre reali (fuzzy matching) e assegna
// un livello di confidenza per riga — usato per i pallini ✓ / ⚠ / ✕.
function hv_normalizzaEValida(partiteGrezze, squadre) {
  return partiteGrezze.map((p) => {
    const home = hv_trovaFantasquadra(p.homeNomeGrezzo, squadre);
    const away = hv_trovaFantasquadra(p.awayNomeGrezzo, squadre);

    let confidenza = "esatta";
    if (home.confidenza === "nessuna" || away.confidenza === "nessuna") confidenza = "nessuna";
    else if (home.confidenza === "fuzzy" || away.confidenza === "fuzzy") confidenza = "fuzzy";

    return {
      homeNomeGrezzo: p.homeNomeGrezzo,
      homeTeamId: home.squadra ? home.squadra.id : null,
      homeNome: home.squadra ? home.squadra.nomeFantasquadra : p.homeNomeGrezzo,
      homeScore: p.homeScore,
      awayNomeGrezzo: p.awayNomeGrezzo,
      awayTeamId: away.squadra ? away.squadra.id : null,
      awayNome: away.squadra ? away.squadra.nomeFantasquadra : p.awayNomeGrezzo,
      awayScore: p.awayScore,
      confidenza, // "esatta" | "fuzzy" | "nessuna"
    };
  });
}

// ===== Validazione (Fase 12 del brief) =====
// Restituisce un elenco di problemi (stringhe) — vuoto se tutto ok.
// "calendarioGiornata" = array di coppie [idA, idB] della giornata, se noto.
function hv_validaGiornata(partite, matchday, squadre, calendarioGiornata) {
  const problemi = [];

  if (partite.length !== 6) {
    problemi.push(`Trovate ${partite.length} partite, ne servono esattamente 6.`);
  }

  const idUsati = [];
  partite.forEach((p) => {
    if (!p.homeTeamId) problemi.push(`Squadra non riconosciuta: "${p.homeNomeGrezzo}".`);
    if (!p.awayTeamId) problemi.push(`Squadra non riconosciuta: "${p.awayNomeGrezzo}".`);
    if (p.homeTeamId) idUsati.push(p.homeTeamId);
    if (p.awayTeamId) idUsati.push(p.awayTeamId);
    if (p.homeScore == null || isNaN(p.homeScore) || p.awayScore == null || isNaN(p.awayScore)) {
      problemi.push(`Punteggio mancante o non numerico per "${p.homeNomeGrezzo}" vs "${p.awayNomeGrezzo}".`);
    }
  });

  const duplicati = idUsati.filter((id, i) => idUsati.indexOf(id) !== i);
  if (duplicati.length > 0) {
    const nomi = [...new Set(duplicati)].map((id) => (squadre.find((s) => s.id === id) || {}).nomeFantasquadra || id);
    problemi.push(`Squadra presente più volte: ${nomi.join(", ")}.`);
  }

  if (idUsati.length > 0 && new Set(idUsati).size < 12 && duplicati.length === 0 && partite.length === 6) {
    problemi.push("Non tutte le 12 fantasquadre risultano coinvolte.");
  }

  // Controllo incrocio col calendario di lega, se disponibile
  if (calendarioGiornata) {
    partite.forEach((p) => {
      if (!p.homeTeamId || !p.awayTeamId) return;
      const combacia = calendarioGiornata.some(
        ([a, b]) => (a === p.homeTeamId && b === p.awayTeamId) || (a === p.awayTeamId && b === p.homeTeamId)
      );
      if (!combacia) {
        problemi.push(`⚠ Accoppiamento non corrispondente al calendario: ${p.homeNome} vs ${p.awayNome}.`);
      }
    });
  }

  return problemi;
}

if (typeof module !== "undefined") {
  module.exports = { hv_parseTestoRisultati, hv_normalizzaEValida, hv_validaGiornata, hv_parseNumero };
}
