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

    const playersA = data.giocatoriA || [];
    const playersB = data.giocatoriB || [];
    const eventDefs = window.HVMatchEvents?.defs || [
      { key: "gol", icon: "golFatto_xs.png" },
      { key: "assist", icon: "assist_xs.png" },
      { key: "rigoriSegnati", icon: "rigoreSegnato_xs.png" },
      { key: "autogol", icon: "autogol_xs.png" },
      { key: "ammonizioni", icon: "ammonito_xs.png" },
      { key: "espulsioni", icon: "espulso_xs.png" },
      { key: "rigoriParati", icon: "rigoreParato_xs.png" },
    ];
    const iconBase = window.HVMatchEvents?.iconBase || "assets/icone-eventi/";
    const imageSources = [
      data.logoAUrl, data.logoBUrl,
      data.logoCasaRealeUrl, data.logoTrasfertaRealeUrl,
      ...playersA.flatMap((p) => [p.fotoUrl, p.logoRealeUrl]),
      ...playersB.flatMap((p) => [p.fotoUrl, p.logoRealeUrl]),
      ...eventDefs.map((def) => `${iconBase}${def.icon}`),
    ];
    const loaded = await Promise.all(imageSources.map(hvLoadImage));
    const logoA = loaded[0];
    const logoB = loaded[1];
    const logoCasaReale = loaded[2];
    const logoTrasfertaReale = loaded[3];
    let cursor = 4;
    const assetsA = playersA.map(() => ({ photo: loaded[cursor++], club: loaded[cursor++] }));
    const assetsB = playersB.map(() => ({ photo: loaded[cursor++], club: loaded[cursor++] }));
    const eventIcons = {};
    eventDefs.forEach((def) => { eventIcons[def.key] = loaded[cursor++]; });

    const maxPlayers = Math.max(playersA.length, playersB.length, 1);
    const rowH = 104;
    const listY = 610;
    const height = Math.max(930, listY + 86 + maxPlayers * rowH + 70);
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

    // Partita reale: logo + nome completo per entrambe le squadre.
    const casaNome = String(data.casaNome || (data.partitaReale || "").split(/\s+vs\s+/i)[0] || "Casa");
    const trasfertaNome = String(data.trasfertaNome || (data.partitaReale || "").split(/\s+vs\s+/i)[1] || "Trasferta");
    let matchupFont = 29;
    const logoSize = 38;
    const logoGap = 10;
    const innerGap = 24;
    ctx.font = `800 ${matchupFont}px Inter, Arial, sans-serif`;
    let casaW = ctx.measureText(casaNome).width;
    let trasfertaW = ctx.measureText(trasfertaNome).width;
    const vsW = ctx.measureText("VS").width;
    let totalW = logoSize + logoGap + casaW + innerGap + vsW + innerGap + logoSize + logoGap + trasfertaW;
    while (totalW > 860 && matchupFont > 22) {
      matchupFont -= 1;
      ctx.font = `800 ${matchupFont}px Inter, Arial, sans-serif`;
      casaW = ctx.measureText(casaNome).width;
      trasfertaW = ctx.measureText(trasfertaNome).width;
      totalW = logoSize + logoGap + casaW + innerGap + vsW + innerGap + logoSize + logoGap + trasfertaW;
    }
    let mx = (width - totalW) / 2;
    const logoY = 119;
    hvDrawImageContain(ctx, logoCasaReale, mx, logoY, logoSize, logoSize, 9, "rgba(255,255,255,.035)");
    mx += logoSize + logoGap;
    ctx.textAlign = "left";
    ctx.fillStyle = C.text;
    ctx.font = `800 ${matchupFont}px Inter, Arial, sans-serif`;
    ctx.fillText(casaNome, mx, 151);
    mx += casaW + innerGap;
    ctx.fillStyle = C.lime;
    ctx.fillText("VS", mx, 151);
    mx += vsW + innerGap;
    hvDrawImageContain(ctx, logoTrasfertaReale, mx, logoY, logoSize, logoSize, 9, "rgba(255,255,255,.035)");
    mx += logoSize + logoGap;
    ctx.fillStyle = C.text;
    ctx.fillText(trasfertaNome, mx, 151);

    ctx.fillStyle = C.muted;
    ctx.font = "700 21px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.statoPartita || "", 540, 184);

    hvDrawImageContain(ctx, logoA, 80, 255, 150, 150, 28, C.card2);
    hvDrawImageContain(ctx, logoB, 850, 255, 150, 150, 28, C.card2);

    ctx.fillStyle = C.yellow;
    ctx.font = "800 36px Inter, Arial, sans-serif";
    ctx.textAlign = "left";
    hvDrawTextLines(ctx, hvWrapLines(ctx, data.fantasquadraA || data.nomeA || "Squadra A", 300).slice(0, 2), 80, 458, 43);
    ctx.textAlign = "right";
    hvDrawTextLines(ctx, hvWrapLines(ctx, data.fantasquadraB || data.nomeB || "Squadra B", 300).slice(0, 2), 1000, 458, 43);

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

    const listH = height - listY - 55;
    hvFillRoundRect(ctx, 60, listY, 460, listH, 26, "rgba(8,16,25,.82)", C.line);
    hvFillRoundRect(ctx, 560, listY, 460, listH, 26, "rgba(8,16,25,.82)", C.line);

    const drawPlayers = (players, assets, x, y, w) => {
      ctx.textAlign = "left";
      if (!players.length) {
        ctx.fillStyle = C.muted;
        ctx.font = "500 23px Inter, Arial, sans-serif";
        ctx.fillText("Nessun giocatore qui", x, y + 20);
        return;
      }
      players.forEach((player, idx) => {
        const yy = y + idx * rowH;
        const media = assets[idx] || {};
        hvDrawImageContain(ctx, media.photo, x, yy, 64, 64, 16, C.card2);
        ctx.fillStyle = C.text;
        ctx.font = "800 23px Inter, Arial, sans-serif";
        let name = String(player.nome || "Giocatore");
        while (ctx.measureText(name).width > w - 92 && name.length > 10) name = `${name.slice(0, -3)}…`;
        ctx.fillText(name, x + 80, yy + 29);
        ctx.fillStyle = C.text;
        ctx.font = "700 17px Inter, Arial, sans-serif";
        const club = player.codice || player.squadraReale || "";
        if (media.club) {
          hvDrawImageContain(ctx, media.club, x + 80, yy + 38, 22, 22, 6, "rgba(255,255,255,.03)");
          ctx.fillText(club, x + 110, yy + 55);
        } else {
          ctx.fillText(club, x + 80, yy + 54);
        }

        const events = player.eventi || {};
        let ex = x + 80;
        const ey = yy + 72;
        eventDefs.forEach((def) => {
          const count = Number(events[def.key]) || 0;
          if (!count) return;
          const icon = eventIcons[def.key];
          if (icon) {
            ctx.drawImage(icon, ex, ey, 22, 22);
            ex += 27;
          }
          if (count > 1) {
            ctx.fillStyle = C.text;
            ctx.font = "800 15px Inter, Arial, sans-serif";
            ctx.fillText(`×${count}`, ex, ey + 17);
            ex += 26;
          }
          ex += 4;
        });
      });
    };

    drawPlayers(playersA, assetsA, 86, listY + 38, 410);
    drawPlayers(playersB, assetsB, 586, listY + 38, 410);

    ctx.textAlign = "right";
    ctx.fillStyle = C.lime;
    ctx.font = "800 19px Inter, Arial, sans-serif";
    ctx.fillText("HERTAVERNELLO", 1020, height - 24);
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
