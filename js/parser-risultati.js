// Parser risultati Hertavernello.
// Accetta tre formati principali:
// 1) blocco Leghe Fantacalcio incollato:
//    Squadra A
//    0-4
//    63.5-81.5
//    Squadra B
// 2) OCR su due righe:
//    Squadra A 0-4 Squadra B
//    63.5-81.5
// 3) formato storico:
//    "Squadra A" 63.5 v "Squadra B" 81.5

const HV_RIGA_REGEX = /"?([^"]+?)"?\s+(\d+(?:[.,]\d+)?)\s+v\.?\s+"?([^"]+?)"?\s+(\d+(?:[.,]\d+)?)\s*$/i;
const HV_COPPIA_NUMERI_REGEX = /^(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)$/;
const HV_RIGA_NOMI_GOL_REGEX = /^(.+?)\s+(\d+)\s*[-–—]\s*(\d+)\s+(.+)$/;
const HV_RIGA_COMPLETA_REGEX = /^(.+?)\s+(\d+)\s*[-–—]\s*(\d+)\s+(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s+(.+)$/;

function hv_parseNumero(str) {
  return parseFloat(String(str).replace(",", "."));
}

function hv_pulisciRigaRisultato(riga) {
  return String(riga || "")
    .replace(/[|•·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hv_partitaDaValori(homeNome, homeGoals, homeScore, awayGoals, awayScore, awayNome, fonteGol) {
  return {
    homeNomeGrezzo: String(homeNome || "").trim(),
    homeGoals: Number.isFinite(Number(homeGoals)) ? Number(homeGoals) : null,
    homeScore: Number.isFinite(Number(homeScore)) ? Number(homeScore) : null,
    awayNomeGrezzo: String(awayNome || "").trim(),
    awayGoals: Number.isFinite(Number(awayGoals)) ? Number(awayGoals) : null,
    awayScore: Number.isFinite(Number(awayScore)) ? Number(awayScore) : null,
    homeGoalsSource: fonteGol || "importato",
    awayGoalsSource: fonteGol || "importato",
  };
}

function hv_parseBlocchiQuattroRighe(righe) {
  const partite = [];
  const usate = new Set();
  for (let i = 0; i + 3 < righe.length; i++) {
    if (usate.has(i)) continue;
    const gol = righe[i + 1].match(HV_COPPIA_NUMERI_REGEX);
    const punti = righe[i + 2].match(HV_COPPIA_NUMERI_REGEX);
    if (!gol || !punti) continue;
    const g1 = hv_parseNumero(gol[1]), g2 = hv_parseNumero(gol[2]);
    const p1 = hv_parseNumero(punti[1]), p2 = hv_parseNumero(punti[2]);
    // Il blocco centrale deve avere una riga gol plausibile e una riga fantapunti.
    if (!Number.isInteger(g1) || !Number.isInteger(g2) || g1 > 30 || g2 > 30) continue;
    if (p1 < 20 || p2 < 20) continue;
    if (/^\d/.test(righe[i]) || /^\d/.test(righe[i + 3])) continue;
    partite.push(hv_partitaDaValori(righe[i], g1, p1, g2, p2, righe[i + 3], "importato"));
    usate.add(i); usate.add(i + 1); usate.add(i + 2); usate.add(i + 3);
    i += 3;
  }
  return { partite, usate };
}


function hv_parseBlocchiOCRSeparati(righe, usateIniziali) {
  const partite = [];
  const usate = new Set(usateIniziali || []);
  for (let i = 0; i + 3 < righe.length; i++) {
    const idx = [i, i + 1, i + 2, i + 3];
    if (idx.some((x) => usate.has(x))) continue;
    const numeriche = [];
    const nomi = [];
    idx.forEach((x) => {
      const m = righe[x].match(HV_COPPIA_NUMERI_REGEX);
      if (m) numeriche.push({ x, a: hv_parseNumero(m[1]), b: hv_parseNumero(m[2]) });
      else if (!/^\d/.test(righe[x])) nomi.push({ x, value: righe[x] });
    });
    if (numeriche.length !== 2 || nomi.length !== 2) continue;
    const gol = numeriche.find((n) => Number.isInteger(n.a) && Number.isInteger(n.b) && n.a <= 30 && n.b <= 30);
    const punti = numeriche.find((n) => n.a >= 20 && n.b >= 20);
    if (!gol || !punti || gol.x === punti.x) continue;
    nomi.sort((a, b) => a.x - b.x);
    partite.push(hv_partitaDaValori(nomi[0].value, gol.a, punti.a, gol.b, punti.b, nomi[1].value, "importato"));
    idx.forEach((x) => usate.add(x));
    i += 3;
  }
  return { partite, usate };
}

function hv_parseRigheOCR(righe, usateIniziali) {
  const partite = [];
  const usate = new Set(usateIniziali || []);

  for (let i = 0; i < righe.length; i++) {
    if (usate.has(i)) continue;

    const completa = righe[i].match(HV_RIGA_COMPLETA_REGEX);
    if (completa) {
      const g1 = Number(completa[2]), g2 = Number(completa[3]);
      const p1 = hv_parseNumero(completa[4]), p2 = hv_parseNumero(completa[5]);
      if (p1 >= 20 && p2 >= 20) {
        partite.push(hv_partitaDaValori(completa[1], g1, p1, g2, p2, completa[6], "importato"));
        usate.add(i);
        continue;
      }
    }

    const nomiGol = righe[i].match(HV_RIGA_NOMI_GOL_REGEX);
    if (!nomiGol) continue;
    const g1 = Number(nomiGol[2]), g2 = Number(nomiGol[3]);
    if (g1 > 30 || g2 > 30) continue;

    // Nello screenshot i fantapunti sono normalmente sulla riga immediatamente sotto.
    let puntiIndex = -1;
    let puntiMatch = null;
    for (let j = i + 1; j <= Math.min(i + 2, righe.length - 1); j++) {
      if (usate.has(j)) continue;
      const candidate = righe[j].match(HV_COPPIA_NUMERI_REGEX);
      if (!candidate) continue;
      const p1 = hv_parseNumero(candidate[1]), p2 = hv_parseNumero(candidate[2]);
      if (p1 >= 20 && p2 >= 20) {
        puntiIndex = j;
        puntiMatch = candidate;
        break;
      }
    }
    if (!puntiMatch) continue;

    partite.push(hv_partitaDaValori(
      nomiGol[1], g1, hv_parseNumero(puntiMatch[1]),
      g2, hv_parseNumero(puntiMatch[2]), nomiGol[4], "importato"
    ));
    usate.add(i);
    usate.add(puntiIndex);
  }
  return { partite, usate };
}

function hv_parseFormatoStorico(righe, usateIniziali) {
  const partite = [];
  const usate = new Set(usateIniziali || []);
  righe.forEach((riga, i) => {
    if (usate.has(i)) return;
    const m = riga.match(HV_RIGA_REGEX);
    if (!m) return;
    const homeScore = hv_parseNumero(m[2]);
    const awayScore = hv_parseNumero(m[4]);
    partite.push(hv_partitaDaValori(
      m[1], hv_calcolaGolDaPunteggio(homeScore), homeScore,
      hv_calcolaGolDaPunteggio(awayScore), awayScore, m[3], "calcolato"
    ));
    usate.add(i);
  });
  return { partite, usate };
}

function hv_parseTestoRisultati(testo) {
  const righe = String(testo || "")
    .split(/\r?\n/)
    .map(hv_pulisciRigaRisultato)
    .filter(Boolean)
    .filter((r) => !/^\d+\s*[ªa°]?\s*giornata\b/i.test(r) && !/^giornata\b/i.test(r));

  const blocchi = hv_parseBlocchiQuattroRighe(righe);
  const separati = hv_parseBlocchiOCRSeparati(righe, blocchi.usate);
  const ocr = hv_parseRigheOCR(righe, new Set([...blocchi.usate, ...separati.usate]));
  const storico = hv_parseFormatoStorico(righe, new Set([...blocchi.usate, ...separati.usate, ...ocr.usate]));
  const partite = [...blocchi.partite, ...separati.partite, ...ocr.partite, ...storico.partite];
  const usate = new Set([...blocchi.usate, ...separati.usate, ...ocr.usate, ...storico.usate]);
  const righeNonRiconosciute = righe
    .map((riga, i) => ({ riga: i + 1, testo: riga, i }))
    .filter((x) => !usate.has(x.i))
    .map(({ riga, testo }) => ({ riga, testo }));

  return { partite, righeNonRiconosciute };
}

function hv_normalizzaEValida(partiteGrezze, squadre) {
  return partiteGrezze.map((p) => {
    const home = hv_trovaFantasquadra(p.homeNomeGrezzo, squadre);
    const away = hv_trovaFantasquadra(p.awayNomeGrezzo, squadre);

    let confidenza = "esatta";
    if (home.confidenza === "nessuna" || away.confidenza === "nessuna") confidenza = "nessuna";
    else if (home.confidenza === "fuzzy" || away.confidenza === "fuzzy") confidenza = "fuzzy";

    return {
      ...p,
      homeTeamId: home.squadra ? home.squadra.id : null,
      homeNome: home.squadra ? home.squadra.nomeFantasquadra : p.homeNomeGrezzo,
      awayTeamId: away.squadra ? away.squadra.id : null,
      awayNome: away.squadra ? away.squadra.nomeFantasquadra : p.awayNomeGrezzo,
      confidenza,
    };
  });
}

// Errori bloccanti: impediscono il salvataggio.
function hv_validaGiornata(partite, matchday, squadre, calendarioGiornata) {
  const problemi = [];

  if (partite.length !== 6) problemi.push(`Trovate ${partite.length} partite, ne servono esattamente 6.`);

  const idUsati = [];
  partite.forEach((p) => {
    if (!p.homeTeamId) problemi.push(`Squadra non riconosciuta: "${p.homeNomeGrezzo}".`);
    if (!p.awayTeamId) problemi.push(`Squadra non riconosciuta: "${p.awayNomeGrezzo}".`);
    if (p.homeTeamId) idUsati.push(p.homeTeamId);
    if (p.awayTeamId) idUsati.push(p.awayTeamId);
    const homeScoreOk = p.homeScore != null && p.homeScore !== "" && Number.isFinite(Number(p.homeScore));
    const awayScoreOk = p.awayScore != null && p.awayScore !== "" && Number.isFinite(Number(p.awayScore));
    if (!homeScoreOk || !awayScoreOk) {
      problemi.push(`Punteggio mancante o non numerico per "${p.homeNomeGrezzo}" vs "${p.awayNomeGrezzo}".`);
    }
    const homeGoalsOk = p.homeGoals != null && p.homeGoals !== "" && Number.isInteger(Number(p.homeGoals)) && Number(p.homeGoals) >= 0;
    const awayGoalsOk = p.awayGoals != null && p.awayGoals !== "" && Number.isInteger(Number(p.awayGoals)) && Number(p.awayGoals) >= 0;
    if (!homeGoalsOk || !awayGoalsOk) {
      problemi.push(`Gol mancanti o non validi per "${p.homeNomeGrezzo}" vs "${p.awayNomeGrezzo}".`);
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

  if (calendarioGiornata) {
    partite.forEach((p) => {
      if (!p.homeTeamId || !p.awayTeamId) return;
      const combacia = calendarioGiornata.some(
        ([a, b]) => (a === p.homeTeamId && b === p.awayTeamId) || (a === p.awayTeamId && b === p.homeTeamId)
      );
      if (!combacia) problemi.push(`Accoppiamento non corrispondente al calendario: ${p.homeNome} vs ${p.awayNome}.`);
    });
  }

  return problemi;
}

// Avvisi non bloccanti: un risultato importato/manuale può volutamente differire
// dalla conversione automatica dei fantapunti.
function hv_avvisiGolGiornata(partite) {
  const avvisi = [];
  partite.forEach((p) => {
    const calcHome = hv_calcolaGolDaPunteggio(p.homeScore);
    const calcAway = hv_calcolaGolDaPunteggio(p.awayScore);
    if (calcHome == null || calcAway == null) return;
    if (Number(p.homeGoals) !== calcHome || Number(p.awayGoals) !== calcAway) {
      avvisi.push(`${p.homeNome || p.homeNomeGrezzo} ${p.homeGoals}-${p.awayGoals} ${p.awayNome || p.awayNomeGrezzo}: dai fantapunti risulterebbe ${calcHome}-${calcAway}. Mantengo il risultato inserito.`);
    }
  });
  return avvisi;
}

if (typeof module !== "undefined") {
  module.exports = {
    hv_parseTestoRisultati,
    hv_normalizzaEValida,
    hv_validaGiornata,
    hv_avvisiGolGiornata,
    hv_parseNumero,
  };
}
