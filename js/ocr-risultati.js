// OCR risultati — Tesseract viene caricato solo quando l'Admin lo richiede.
// L'output non viene salvato automaticamente: passa sempre dalle 6 schede di controllo.
let hv_tesseractCaricato = null;

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

function hv_preprocessaImmagine(img) {
  const canvas = document.createElement("canvas");
  const maxWidth = 1700;
  const scalaBase = Math.max(1.6, Math.min(2.6, maxWidth / Math.max(1, img.width)));
  canvas.width = Math.round(img.width * scalaBase);
  canvas.height = Math.round(img.height * scalaBase);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = frame.data;
  const CONTRASTO = 48;
  const fattore = (259 * (CONTRASTO + 255)) / (255 * (259 - CONTRASTO));
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    let v = Math.min(255, Math.max(0, fattore * (gray - 128) + 128));
    // Lo screenshot Leghe ha sfondo chiarissimo: rendiamo il testo più netto senza
    // distruggere le cifre sottili dei fantapunti.
    if (v > 224) v = 255;
    else if (v < 70) v = 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(frame, 0, 0);
  return canvas;
}

async function hv_eseguiOCR(img, onProgress) {
  const Tesseract = await hv_caricaTesseract();
  const canvasPreprocessato = hv_preprocessaImmagine(img);
  const worker = await Tesseract.createWorker("eng", 1, {
    logger: (m) => {
      if (onProgress && m.status === "recognizing text") onProgress(Math.round(m.progress * 100));
    },
  });
  try {
    if (worker.setParameters) {
      await worker.setParameters({
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: "6",
      });
    }
    const { data } = await worker.recognize(canvasPreprocessato);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}


function hv_estraiGiornataSerieA(testoGrezzo) {
  const testo = String(testoGrezzo || "").replace(/\s+/g, " ");
  const m = testo.match(/(\d{1,2})\s*[ªa°º]?\s*giornata\s+di\s+serie\s*a/i);
  return m ? Number(m[1]) : null;
}

// Pulizia leggera del testo OCR. Il parser successivo sa leggere sia la riga
// "Squadra 0-4 Squadra" + "63.5-81.5", sia il blocco a quattro righe.
function hv_ocrATestoCanonico(testoGrezzo) {
  return String(testoGrezzo || "")
    .replace(/[−–—]/g, "-")
    .replace(/(\d),(\d)/g, "$1.$2")
    .split(/\r?\n/)
    .map((r) => r.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((r) => !/^\d+\s*[ªa°]?\s*giornata\b/i.test(r))
    .join("\n");
}

if (typeof module !== "undefined") {
  module.exports = { hv_ocrATestoCanonico, hv_estraiGiornataSerieA };
}
