(function () {
  "use strict";

  let hvPagellaShareData = null;
  let hvPagellaCanvasPromise = null;

  const HV_PAGELLA_THEME_KEY = "hv_pagella_theme";
  const HV_PAGELLA_FONT_KEY = "hv_pagella_font_scale";
  const HV_PAGELLA_THEMES = new Set(["scura", "lettura", "chiara"]);
  const HV_PAGELLA_FONT_STEPS = [0.9, 1, 1.1, 1.2, 1.3];

  function hvPagellaStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function hvPagellaStorageSet(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }

  function hvApplyPagellaTheme(theme, persist = true) {
    const next = HV_PAGELLA_THEMES.has(theme) ? theme : "lettura";
    document.body.dataset.pagellaTheme = next;
    document.querySelectorAll("[data-pagella-theme-choice]").forEach((button) => {
      const active = button.dataset.pagellaThemeChoice === next;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute("content", next === "scura" ? "#080E15" : next === "chiara" ? "#F5F7FA" : "#F4F1E8");
    }
    if (persist) hvPagellaStorageSet(HV_PAGELLA_THEME_KEY, next);
  }

  function hvPagellaFontLabel(scale) {
    if (scale <= 0.9) return "Compatta";
    if (scale <= 1) return "Lettura comoda";
    if (scale <= 1.1) return "Testo grande";
    if (scale <= 1.2) return "Testo molto grande";
    return "Massima leggibilità";
  }

  function hvApplyPagellaFont(scale, persist = true) {
    const requested = Number(scale);
    const nearest = HV_PAGELLA_FONT_STEPS.reduce((best, current) =>
      Math.abs(current - requested) < Math.abs(best - requested) ? current : best, HV_PAGELLA_FONT_STEPS[1]);
    document.body.style.setProperty("--pagella-font-scale", String(nearest));
    document.body.dataset.pagellaFontScale = String(nearest);
    const label = document.getElementById("pagella-font-label");
    if (label) label.textContent = hvPagellaFontLabel(nearest);
    const index = HV_PAGELLA_FONT_STEPS.indexOf(nearest);
    const down = document.getElementById("pagella-font-down");
    const up = document.getElementById("pagella-font-up");
    if (down) down.disabled = index <= 0;
    if (up) up.disabled = index >= HV_PAGELLA_FONT_STEPS.length - 1;
    if (persist) hvPagellaStorageSet(HV_PAGELLA_FONT_KEY, String(nearest));
  }

  function hvInitPagellaReadingControls() {
    const savedTheme = hvPagellaStorageGet(HV_PAGELLA_THEME_KEY);
    hvApplyPagellaTheme(HV_PAGELLA_THEMES.has(savedTheme) ? savedTheme : "lettura", false);

    const savedScale = Number(hvPagellaStorageGet(HV_PAGELLA_FONT_KEY));
    hvApplyPagellaFont(Number.isFinite(savedScale) && savedScale > 0 ? savedScale : 1, false);

    document.querySelectorAll("[data-pagella-theme-choice]").forEach((button) => {
      button.addEventListener("click", () => hvApplyPagellaTheme(button.dataset.pagellaThemeChoice));
    });

    document.getElementById("pagella-font-down")?.addEventListener("click", () => {
      const current = Number(document.body.dataset.pagellaFontScale || 1);
      const index = HV_PAGELLA_FONT_STEPS.indexOf(current);
      hvApplyPagellaFont(HV_PAGELLA_FONT_STEPS[Math.max(0, index - 1)]);
    });

    document.getElementById("pagella-font-up")?.addEventListener("click", () => {
      const current = Number(document.body.dataset.pagellaFontScale || 1);
      const index = HV_PAGELLA_FONT_STEPS.indexOf(current);
      hvApplyPagellaFont(HV_PAGELLA_FONT_STEPS[Math.min(HV_PAGELLA_FONT_STEPS.length - 1, index + 1)]);
    });
  }

  function hvPagellaVisualParagraphs(commento) {
    const text = String(commento || "").replace(/\r\n?/g, "\n").trim();
    if (!text) return [];

    const explicit = text.split(/\n{2,}/).map((block) => block.replace(/\n+/g, " ").trim()).filter(Boolean);
    if (explicit.length > 1) return explicit;

    const lineBlocks = text.split(/\n+/).map((block) => block.trim()).filter(Boolean);
    if (lineBlocks.length > 1) return lineBlocks;

    if (text.length < 520) return [text];

    let sentences = [];
    try {
      if (typeof Intl !== "undefined" && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter("it", { granularity: "sentence" });
        sentences = Array.from(segmenter.segment(text), (part) => part.segment.trim()).filter(Boolean);
      }
    } catch {}
    if (!sentences.length) {
      sentences = text.match(/[^.!?]+[.!?]+(?:[”"']|$)|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) || [text];
    }
    if (sentences.length < 3) return [text];

    const paragraphs = [];
    let current = [];
    let currentLength = 0;
    sentences.forEach((sentence, idx) => {
      current.push(sentence);
      currentLength += sentence.length;
      const remaining = sentences.length - idx - 1;
      if ((currentLength >= 320 && current.length >= 2) || current.length >= 3 || remaining === 0) {
        paragraphs.push(current.join(" "));
        current = [];
        currentLength = 0;
      }
    });
    if (current.length) paragraphs.push(current.join(" "));
    return paragraphs;
  }

  function hvPagellaSetStatus(message, error = false) {
    const el = document.getElementById("pagella-action-status");
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-error", Boolean(error));
  }

  function hvPagellaFeedbackButton(button, message) {
    if (!button) return;
    const original = button.dataset.originalLabel || button.textContent;
    button.dataset.originalLabel = original;
    button.textContent = message;
    clearTimeout(button._hvRestoreTimer);
    button._hvRestoreTimer = setTimeout(() => { button.textContent = original; }, 1800);
  }

  function hvPagellaText(data) {
    const vote = data.pagella?.voto ?? "—";
    const badge = data.pagella?.badge ? `${data.pagella.badge} ` : "";
    return `${badge}Pagella dell'asta — ${data.squadra.nomeFantasquadra || data.squadra.nomeReale}\nFantallenatore: ${data.squadra.nomeReale}\nVoto: ${vote}\n\n${data.pagella?.commento || ""}`;
  }

  function hvGetPagellaCanvas() {
    if (!hvPagellaShareData) return Promise.reject(new Error("Pagella non disponibile."));
    if (!hvPagellaCanvasPromise) {
      hvPagellaCanvasPromise = window.HVShareCards.renderPagella({
        nomeSquadra: hvPagellaShareData.squadra.nomeFantasquadra || hvPagellaShareData.squadra.nomeReale,
        nomeAllenatore: hvPagellaShareData.squadra.nomeReale,
        voto: hvPagellaShareData.pagella.voto,
        badge: hvPagellaShareData.pagella.badge,
        commento: hvPagellaShareData.pagella.commento,
        logoSquadraUrl: hvPagellaShareData.logoSquadraUrl,
        presidenteUrl: hvPagellaShareData.presidenteUrl,
      });
    }
    return hvPagellaCanvasPromise;
  }

  function hvStatoVoto(voto) {
    const n = Number(voto);
    if (n >= 7) return "promosso";
    if (n >= 5.5) return "medio";
    return "bocciato";
  }

  function hvRenderTeamTabs(squadre, attivaId) {
    const host = document.getElementById("pagella-team-tabs");
    if (!host) return;
    host.innerHTML = "";
    (squadre || []).forEach((squadra) => {
      const a = document.createElement("a");
      a.className = `pagella-team-tab${squadra.id === attivaId ? " active" : ""}`;
      a.href = `pagella.html?squadra=${encodeURIComponent(squadra.id)}`;
      a.textContent = squadra.nomeReale || squadra.nomeFantasquadra;
      a.title = `Apri la pagella di ${squadra.nomeFantasquadra || squadra.nomeReale}`;
      host.appendChild(a);
    });
    requestAnimationFrame(() => host.querySelector(".pagella-team-tab.active")?.scrollIntoView({ inline: "center", block: "nearest" }));
  }

  function hvSetImage(imgId, placeholderId, url) {
    const img = document.getElementById(imgId);
    const placeholder = document.getElementById(placeholderId);
    if (!img || !placeholder) return;
    if (url) {
      img.src = url;
      img.classList.remove("hidden");
      placeholder.classList.add("hidden");
    } else {
      img.removeAttribute("src");
      img.classList.add("hidden");
      placeholder.classList.remove("hidden");
    }
  }

  function hvRenderPagellaContent(pagella) {
    const content = document.getElementById("pagella-content-full");
    content.innerHTML = "";
    if (!pagella) {
      const p = document.createElement("p");
      p.className = "empty-state pagella-empty-state";
      p.textContent = "Pagella non ancora inserita per questa fantasquadra.";
      content.appendChild(p);
      document.getElementById("pagella-actions")?.classList.add("hidden");
      return;
    }

    const stato = hvStatoVoto(pagella.voto);
    const score = document.createElement("div");
    score.className = `pagella-voto-top ${stato}`;
    score.innerHTML = `
      <div class="pagella-voto-top-badge" aria-hidden="true">${pagella.badge || "🏅"}</div>
      <div class="pagella-voto-top-copy">
        <span class="pagella-full-voto-label">Voto finale</span>
        <strong>${pagella.voto ?? "—"}</strong>
      </div>
      <div class="pagella-voto-top-note">
        <strong>Pagella dell'asta</strong>
        <span>Il verdetto di Hertavernello, senza appello.</span>
      </div>`;

    const article = document.createElement("article");
    article.className = "pagella-full-commento pagella-full-commento-v2";
    const paragraphs = hvPagellaVisualParagraphs(pagella.commento);
    paragraphs.forEach((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      article.appendChild(p);
    });

    content.append(score, article);
    document.getElementById("pagella-actions")?.classList.remove("hidden");
  }

  function hvWireActions(squadra) {
    document.getElementById("pagella-copy-text")?.addEventListener("click", async (event) => {
      try {
        await navigator.clipboard.writeText(hvPagellaText(hvPagellaShareData));
        hvPagellaFeedbackButton(event.currentTarget, "✓ Testo copiato");
        hvPagellaSetStatus("Pagella copiata negli appunti.");
      } catch (err) {
        hvPagellaSetStatus(`Non riesco a copiare il testo: ${err.message}`, true);
      }
    });

    document.getElementById("pagella-copy-image")?.addEventListener("click", async (event) => {
      const btn = event.currentTarget;
      btn.disabled = true;
      hvPagellaSetStatus("Creo l'immagine...");
      try {
        const canvas = await hvGetPagellaCanvas();
        await window.HVShareCards.copyCanvas(canvas);
        hvPagellaFeedbackButton(btn, "✓ Immagine copiata");
        hvPagellaSetStatus("Immagine copiata: puoi incollarla direttamente su WhatsApp Web, Telegram o dove vuoi.");
      } catch (err) {
        hvPagellaSetStatus(`${err.message} Puoi usare “Scarica PNG”.`, true);
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById("pagella-download-image")?.addEventListener("click", async (event) => {
      const btn = event.currentTarget;
      btn.disabled = true;
      hvPagellaSetStatus("Creo il PNG...");
      try {
        const canvas = await hvGetPagellaCanvas();
        const name = window.HVShareCards.safeFileName(`pagella-${squadra.nomeFantasquadra || squadra.nomeReale}`);
        await window.HVShareCards.downloadCanvas(canvas, `${name}.png`);
        hvPagellaFeedbackButton(btn, "✓ PNG creato");
        hvPagellaSetStatus("PNG pronto.");
      } catch (err) {
        hvPagellaSetStatus(err.message, true);
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById("pagella-share-image")?.addEventListener("click", async (event) => {
      const btn = event.currentTarget;
      btn.disabled = true;
      hvPagellaSetStatus("Preparo la condivisione...");
      try {
        const canvas = await hvGetPagellaCanvas();
        const name = window.HVShareCards.safeFileName(`pagella-${squadra.nomeFantasquadra || squadra.nomeReale}`);
        const result = await window.HVShareCards.shareCanvas(canvas, {
          filename: `${name}.png`,
          title: `Pagella ${squadra.nomeFantasquadra || squadra.nomeReale}`,
          text: "Pagella dell'asta · Hertavernello",
        });
        if (result.mode === "copy") hvPagellaSetStatus("Condivisione non disponibile: immagine copiata negli appunti.");
        else if (result.mode === "download") hvPagellaSetStatus("Condivisione non disponibile: ho scaricato il PNG.");
        else hvPagellaSetStatus("");
      } catch (err) {
        if (err?.name !== "AbortError") hvPagellaSetStatus(err.message, true);
      } finally {
        btn.disabled = false;
      }
    });
  }

  async function hvInitPagella(config) {
    document.getElementById("lega-nome").textContent = config.lega.nome;
    const params = new URLSearchParams(window.location.search);
    const squadraId = params.get("squadra");
    const squadra = (config.squadre || []).find((s) => s.id === squadraId) || config.squadre?.[0];

    if (!squadra) {
      document.getElementById("pagella-content-full").innerHTML = '<p class="empty-state">Fantasquadra non trovata.</p>';
      return;
    }

    hvRenderTeamTabs(config.squadre || [], squadra.id);
    document.title = `Pagella ${squadra.nomeFantasquadra || squadra.nomeReale} — Hertavernello`;
    document.getElementById("pagella-back-link").href = `squadre.html?squadra=${encodeURIComponent(squadra.id)}`;
    document.getElementById("pagella-team-name").textContent = squadra.nomeFantasquadra || squadra.nomeReale;
    document.getElementById("pagella-manager-name").textContent = `Fantallenatore: ${squadra.nomeReale}`;

    try {
      const [pagelleRes, loghiRes] = await Promise.all([
        fetch("data/pagelle.json", { cache: "no-store" }),
        fetch("data/loghi-fantasquadre.json", { cache: "no-store" }),
      ]);
      if (!pagelleRes.ok || !loghiRes.ok) throw new Error("Impossibile leggere i dati della pagella.");
      const pagelleData = await pagelleRes.json();
      const loghiData = await loghiRes.json();
      const pagella = (pagelleData.pagelle || []).find((p) => p.squadraId === squadra.id);
      const logo = (loghiData.loghi || []).find((l) => l.squadraId === squadra.id) || {};

      const logoSquadraUrl = logo.immaginePiccola ? `assets/stemmi-piccoli/${logo.immaginePiccola}` : "";
      const presidenteUrl = logo.immagine ? `assets/stemmi/${logo.immagine}` : "";
      hvSetImage("pagella-team-logo", "pagella-team-logo-placeholder", logoSquadraUrl);
      hvSetImage("pagella-president-img", "pagella-president-placeholder", presidenteUrl);
      hvRenderPagellaContent(pagella);

      if (!pagella) return;
      hvPagellaShareData = { squadra, pagella, logoSquadraUrl, presidenteUrl };
      hvPagellaCanvasPromise = null;
      hvWireActions(squadra);
    } catch (err) {
      document.getElementById("pagella-content-full").innerHTML = `<p class="empty-state">${err.message}</p>`;
    }
  }

  hvInitPagellaReadingControls();

  hv_checkGate().then((data) => {
    if (data) hvInitPagella(data);
  });
  document.addEventListener("hv:unlocked", (e) => hvInitPagella(e.detail));
})();
