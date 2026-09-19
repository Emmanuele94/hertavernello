(function () {
  "use strict";

  const C = {
    bg: "#081019",
    bg2: "#0e1c29",
    card: "#122331",
    card2: "#0b1721",
    line: "#2a3b4e",
    text: "#edf5ff",
    muted: "#9fb0c3",
    lime: "#b7ff5c",
    yellow: "#f5ff00",
  };

  function hvRoundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function hvFillRoundRect(ctx, x, y, w, h, r, fill, stroke) {
    hvRoundRect(ctx, x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  async function hvLoadImage(src) {
    if (!src) return null;
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function hvDrawImageContain(ctx, img, x, y, w, h, radius = 0, bg = C.card2) {
    hvFillRoundRect(ctx, x, y, w, h, radius, bg, C.line);
    if (!img) return;
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.save();
    if (radius) {
      hvRoundRect(ctx, x, y, w, h, radius);
      ctx.clip();
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  function hvWrapLines(ctx, text, maxWidth) {
    const out = [];
    const paragraphs = String(text || "").replace(/\r/g, "").split("\n");
    paragraphs.forEach((paragraph, pIndex) => {
      if (!paragraph.trim()) {
        out.push("");
        return;
      }
      const words = paragraph.trim().split(/\s+/);
      let line = "";
      words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth || !line) {
          line = candidate;
        } else {
          out.push(line);
          line = word;
        }
      });
      if (line) out.push(line);
      if (pIndex < paragraphs.length - 1 && paragraphs[pIndex + 1] && paragraph.trim()) {
        // La separazione naturale fra paragrafi viene resa con il line-height.
      }
    });
    return out;
  }

  function hvDrawTextLines(ctx, lines, x, y, lineHeight, maxLines) {
    const limit = maxLines ? Math.min(lines.length, maxLines) : lines.length;
    for (let i = 0; i < limit; i++) {
      ctx.fillText(lines[i], x, y + i * lineHeight);
    }
    return y + limit * lineHeight;
  }

  function hvSafeFileName(value) {
    return String(value || "hertavernello")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "hertavernello";
  }

  async function hvCanvasBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Impossibile creare l'immagine."))), "image/png", 1);
    });
  }

  async function hvCopyCanvas(canvas) {
    const blob = await hvCanvasBlob(canvas);
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      throw new Error("Copia immagine non supportata da questo browser.");
    }
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return blob;
  }

  async function hvShareCanvas(canvas, options = {}) {
    const blob = await hvCanvasBlob(canvas);
    const filename = options.filename || "hertavernello.png";
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({
        files: [file],
        title: options.title || "Hertavernello",
        text: options.text || "",
      });
      return { mode: "share", blob };
    }
    try {
      await hvCopyCanvas(canvas);
      return { mode: "copy", blob };
    } catch (_) {
      hvDownloadBlob(blob, filename);
      return { mode: "download", blob };
    }
  }

  function hvDownloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "hertavernello.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function hvDownloadCanvas(canvas, filename) {
    const blob = await hvCanvasBlob(canvas);
    hvDownloadBlob(blob, filename);
    return blob;
  }

  async function hvRenderPagella(data) {
    if (document.fonts && document.fonts.ready) await document.fonts.ready.catch(() => {});
    const [logo, presidente] = await Promise.all([
      hvLoadImage(data.logoSquadraUrl),
      hvLoadImage(data.presidenteUrl),
    ]);

    const width = 1080;
    const measure = document.createElement("canvas").getContext("2d");
    measure.font = "500 34px Inter, Arial, sans-serif";
    const commentLines = hvWrapLines(measure, data.commento || "", 900);
    const lineHeight = 52;
    const commentHeight = Math.max(130, commentLines.length * lineHeight + 60);
    const height = Math.max(1220, 660 + commentHeight + 120);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, C.bg2);
    bg.addColorStop(0.52, C.bg);
    bg.addColorStop(1, "#101522");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(183,255,92,.08)";
    ctx.beginPath();
    ctx.arc(970, 85, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(57,32,60,.22)";
    ctx.beginPath();
    ctx.arc(60, height - 80, 300, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = C.lime;
    ctx.font = "800 24px Inter, Arial, sans-serif";
    ctx.fillText("HERTAVERNELLO · PAGELLA DELL'ASTA", 70, 76);

    hvDrawImageContain(ctx, logo, 70, 120, 150, 150, 28, C.card2);
    hvDrawImageContain(ctx, presidente, 820, 110, 190, 190, 30, C.card2);

    ctx.fillStyle = C.yellow;
    ctx.font = "800 60px Inter, Arial, sans-serif";
    const titleLines = hvWrapLines(ctx, data.nomeSquadra || "Fantasquadra", 540).slice(0, 2);
    hvDrawTextLines(ctx, titleLines, 260, 175, 68);

    ctx.fillStyle = C.muted;
    ctx.font = "600 27px Inter, Arial, sans-serif";
    ctx.fillText(`Fantallenatore: ${data.nomeAllenatore || "—"}`, 260, 305);

    hvFillRoundRect(ctx, 70, 350, 940, 180, 34, C.card, C.line);
    ctx.fillStyle = C.muted;
    ctx.font = "700 22px Inter, Arial, sans-serif";
    ctx.fillText("VOTO", 112, 402);
    ctx.fillStyle = C.lime;
    ctx.font = "900 92px Inter, Arial, sans-serif";
    ctx.fillText(String(data.voto ?? "—"), 106, 495);
    if (data.badge) {
      ctx.font = "76px Apple Color Emoji, Segoe UI Emoji, sans-serif";
      ctx.fillText(String(data.badge), 300, 490);
    }
    ctx.fillStyle = C.text;
    ctx.font = "800 28px Inter, Arial, sans-serif";
    ctx.fillText("Il verdetto dell'asta", 450, 430);
    ctx.fillStyle = C.muted;
    ctx.font = "500 23px Inter, Arial, sans-serif";
    ctx.fillText("Scritto con amore, cattiveria e zero imparzialità.", 450, 474);

    const commentY = 580;
    hvFillRoundRect(ctx, 70, commentY, 940, commentHeight, 30, "rgba(8,16,25,.82)", C.line);
    ctx.fillStyle = C.text;
    ctx.font = "500 34px Inter, Arial, sans-serif";
    hvDrawTextLines(ctx, commentLines, 105, commentY + 62, lineHeight);

    ctx.fillStyle = C.muted;
    ctx.font = "500 20px Inter, Arial, sans-serif";
    ctx.fillText("hertavernello · fantacalcio tra amici", 70, height - 55);
    ctx.textAlign = "right";
    ctx.fillStyle = C.lime;
    ctx.font = "800 20px Inter, Arial, sans-serif";
    ctx.fillText("HERTAVERNELLO", 1010, height - 55);
    ctx.textAlign = "left";
    return canvas;
  }

  async function hvRenderSfida(data) {
    if (document.fonts && document.fonts.ready) await document.fonts.ready.catch(() => {});
    const [logoA, logoB] = await Promise.all([
      hvLoadImage(data.logoAUrl),
      hvLoadImage(data.logoBUrl),
    ]);

    const maxPlayers = Math.max((data.giocatoriA || []).length, (data.giocatoriB || []).length, 1);
    const height = Math.max(900, 650 + maxPlayers * 62);
    const width = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, C.bg2);
    bg.addColorStop(1, C.bg);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = C.lime;
    ctx.font = "800 23px Inter, Arial, sans-serif";
    ctx.fillText("HERTAVERNELLO · CHI GIOCA CONTRO CHI", 60, 66);

    hvFillRoundRect(ctx, 60, 100, 960, 112, 24, C.card, C.line);
    ctx.fillStyle = C.text;
    ctx.font = "800 34px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.partitaReale || "Partita Serie A", 540, 150);
    ctx.fillStyle = C.muted;
    ctx.font = "700 21px Inter, Arial, sans-serif";
    ctx.fillText(data.statoPartita || "", 540, 184);

    hvDrawImageContain(ctx, logoA, 80, 265, 145, 145, 28, C.card2);
    hvDrawImageContain(ctx, logoB, 855, 265, 145, 145, 28, C.card2);

    ctx.fillStyle = C.yellow;
    ctx.font = "800 36px Inter, Arial, sans-serif";
    ctx.textAlign = "left";
    const aLines = hvWrapLines(ctx, data.fantasquadraA || data.nomeA || "Squadra A", 300).slice(0, 2);
    hvDrawTextLines(ctx, aLines, 80, 455, 43);
    ctx.textAlign = "right";
    const bLines = hvWrapLines(ctx, data.fantasquadraB || data.nomeB || "Squadra B", 300).slice(0, 2);
    hvDrawTextLines(ctx, bLines, 1000, 455, 43);

    ctx.fillStyle = C.muted;
    ctx.font = "600 21px Inter, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(data.nomeA || "", 80, 545);
    ctx.textAlign = "right";
    ctx.fillText(data.nomeB || "", 1000, 545);

    ctx.textAlign = "center";
    ctx.fillStyle = C.lime;
    ctx.font = "900 58px Inter, Arial, sans-serif";
    ctx.fillText("VS", 540, 385);

    const listY = 600;
    const listH = height - listY - 100;
    hvFillRoundRect(ctx, 60, listY, 460, listH, 26, "rgba(8,16,25,.82)", C.line);
    hvFillRoundRect(ctx, 560, listY, 460, listH, 26, "rgba(8,16,25,.82)", C.line);

    const drawPlayers = (players, x, y, w) => {
      ctx.textAlign = "left";
      if (!players || !players.length) {
        ctx.fillStyle = C.muted;
        ctx.font = "500 24px Inter, Arial, sans-serif";
        ctx.fillText("Nessun giocatore qui", x, y);
        return;
      }
      players.forEach((p, idx) => {
        const yy = y + idx * 62;
        ctx.fillStyle = C.lime;
        ctx.beginPath();
        ctx.arc(x + 8, yy - 7, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.text;
        ctx.font = "700 25px Inter, Arial, sans-serif";
        const code = p.codice ? ` · ${p.codice}` : "";
        let label = `${p.nome}${code}`;
        while (ctx.measureText(label).width > w - 40 && label.length > 12) label = `${label.slice(0, -4)}…`;
        ctx.fillText(label, x + 27, yy);
      });
    };

    drawPlayers(data.giocatoriA || [], 92, listY + 58, 400);
    drawPlayers(data.giocatoriB || [], 592, listY + 58, 400);

    ctx.textAlign = "left";
    ctx.fillStyle = C.muted;
    ctx.font = "500 19px Inter, Arial, sans-serif";
    ctx.fillText("Pronti allo sfottò?", 60, height - 48);
    ctx.textAlign = "right";
    ctx.fillStyle = C.lime;
    ctx.font = "800 19px Inter, Arial, sans-serif";
    ctx.fillText("HERTAVERNELLO", 1020, height - 48);
    ctx.textAlign = "left";
    return canvas;
  }

  window.HVShareCards = {
    safeFileName: hvSafeFileName,
    copyCanvas: hvCopyCanvas,
    shareCanvas: hvShareCanvas,
    downloadCanvas: hvDownloadCanvas,
    renderPagella: hvRenderPagella,
    renderSfida: hvRenderSfida,
  };
})();
