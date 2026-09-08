// ===== MOTORE UNICO DI IMPORTAZIONE — livello OCR (Metodo A) =====
// Tesseract.js viene caricato SOLO quando l'utente apre il tab Screenshot e
// incolla/trascina un'immagine — non appesantisce il resto del sito (Fase 7).
// Libreria: tesseract.js v5, via CDN jsDelivr (https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js).
// Peso reale: il file JS è ~500KB, ma scarica anche il modello linguistico
// (~2-4MB per la lingua scelta) alla PRIMA esecuzione, poi lo mette in cache
// nel browser (IndexedDB) — dalla seconda volta in poi è quasi istantaneo.

let hv_tesseractCaricato = null; // Promise, per non caricare lo script due volte

function hv_caricaTesseract() {
  if (hv_tesseractCaricato) return hv_tesseractCaricato;
  hv_tesseractCaricato = new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve(window.Tesseract);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error("Impossibile caricare Tesseract.js dal CDN (controlla la connessione)."));
    document.head.appendChild(script);
  });
  return hv_tesseractCaricato;
}

// Pre-processing semplice (Fase 8): scala di grigi + aumento contrasto.
// Deliberatamente basilare — va raffinato dopo il 15 settembre con screenshot
// reali di Leghe Fantacalcio (crop automatico dell'area utile, ecc.).
function hv_preprocessaImmagine(img) {
  const canvas = document.createElement("canvas");
  const scala = 2; // upscale: l'OCR legge meglio testo piccolo se ingrandito
  canvas.width = img.width * scala;
  canvas.height = img.height * scala;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = frame.data;
  const CONTRASTO = 35;
  const fattore = (259 * (CONTRASTO + 255)) / (255 * (259 - CONTRASTO));
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    const v = Math.min(255, Math.max(0, fattore * (gray - 128) + 128));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(frame, 0, 0);
  return canvas;
}

// Esegue l'OCR vero e proprio su un'immagine (File/Blob/HTMLImageElement) e
// restituisce il testo grezzo riconosciuto.
async function hv_eseguiOCR(img, onProgress) {
  const Tesseract = await hv_caricaTesseract();
  const canvasPreprocessato = hv_preprocessaImmagine(img);
  const worker = await Tesseract.createWorker("eng", 1, {
    logger: (m) => {
      if (onProgress && m.status === "recognizing text") onProgress(Math.round(m.progress * 100));
    },
  });
  try {
    const { data } = await worker.recognize(canvasPreprocessato);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

// ===== Testo grezzo OCR → coppie nome/punteggio → formato canonico =====
// Stessa logica testata su due layout diversi (nome+punteggio sulla stessa
// riga, o su righe separate) — gestisce entrambi senza assumere un layout
// fisso, dato che non abbiamo ancora uno screenshot reale da Leghe Fantacalcio.
function hv_estraiCoppieOCR(testoGrezzo, squadre) {
  const righe = (testoGrezzo || "")
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);

  const coppie = [];
  let nomeInSospeso = null;
  const regexNomePunteggio = /^(.+?)\s+(\d+(?:[.,]\d+)?)$/;
  const regexSoloNumero = /^(\d+(?:[.,]\d+)?)$/;

  righe.forEach((riga) => {
    // Riga che corrisponde già per intero a una fantasquadra nota (anche con
    // cifre nel nome, es. "Napoli 1011"): la tratto come nome, non la spezzo.
    if (squadre && hv_trovaFantasquadra(riga, squadre).confidenza !== "nessuna") {
      nomeInSospeso = riga;
      return;
    }
    const soloNumero = riga.match(regexSoloNumero);
    if (soloNumero) {
      if (nomeInSospeso) {
        coppie.push({ nome: nomeInSospeso, punteggio: hv_parseNumero(soloNumero[1]) });
        nomeInSospeso = null;
      }
      return;
    }
    const nomePunteggio = riga.match(regexNomePunteggio);
    if (nomePunteggio) {
      coppie.push({ nome: nomePunteggio[1].trim(), punteggio: hv_parseNumero(nomePunteggio[2]) });
      nomeInSospeso = null;
      return;
    }
    nomeInSospeso = riga;
  });
  return coppie;
}

function hv_coppieInTestoCanonico(coppie) {
  const righe = [];
  for (let i = 0; i + 1 < coppie.length; i += 2) {
    righe.push(
      `"${coppie[i].nome}" ${String(coppie[i].punteggio).replace(".", ",")} v "${coppie[i + 1].nome}" ${String(coppie[i + 1].punteggio).replace(".", ",")}`
    );
  }
  return righe.join("\n");
}

// Punto di ingresso usato dalla UI: da testo grezzo OCR al formato canonico,
// pronto per essere passato a hv_parseTestoRisultati (lo STESSO parser usato
// dal Metodo B) — è qui che i due metodi convergono, come richiesto.
function hv_ocrATestoCanonico(testoGrezzo, squadre) {
  return hv_coppieInTestoCanonico(hv_estraiCoppieOCR(testoGrezzo, squadre));
}

if (typeof module !== "undefined") {
  module.exports = { hv_estraiCoppieOCR, hv_coppieInTestoCanonico, hv_ocrATestoCanonico };
}
