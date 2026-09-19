(function () {
  "use strict";

  let hvPagellaShareData = null;
  let hvPagellaCanvasPromise = null;

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

  async function hvInitPagella(config) {
    document.getElementById("lega-nome").textContent = config.lega.nome;
    const params = new URLSearchParams(window.location.search);
    const squadraId = params.get("squadra");
    const squadra = (config.squadre || []).find((s) => s.id === squadraId) || config.squadre?.[0];

    if (!squadra) {
      document.getElementById("pagella-content-full").innerHTML = '<p class="empty-state">Fantasquadra non trovata.</p>';
      return;
    }

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

      const teamLogo = document.getElementById("pagella-team-logo");
      const teamPlaceholder = document.getElementById("pagella-team-logo-placeholder");
      if (logoSquadraUrl) {
        teamLogo.src = logoSquadraUrl;
        teamLogo.classList.remove("hidden");
        teamPlaceholder.classList.add("hidden");
      }

      const presidentImg = document.getElementById("pagella-president-img");
      const presidentPlaceholder = document.getElementById("pagella-president-placeholder");
      if (presidenteUrl) {
        presidentImg.src = presidenteUrl;
        presidentImg.classList.remove("hidden");
        presidentPlaceholder.classList.add("hidden");
      }

      const content = document.getElementById("pagella-content-full");
      if (!pagella) {
        content.innerHTML = '<p class="empty-state">Pagella non ancora inserita per questa fantasquadra.</p>';
        return;
      }

      const stato = typeof hv_statoVoto === "function" ? hv_statoVoto(pagella.voto) : (pagella.voto >= 7 ? "promosso" : pagella.voto >= 5.5 ? "medio" : "bocciato");
      content.innerHTML = `
        <div class="pagella-full-voto ${stato}">
          <span class="pagella-full-voto-label">Voto</span>
          <strong>${pagella.voto ?? "—"}</strong>
          ${pagella.badge ? `<span class="pagella-full-badge">${pagella.badge}</span>` : ""}
        </div>
        <article class="pagella-full-commento"></article>
      `;
      content.querySelector(".pagella-full-commento").textContent = pagella.commento || "";
      document.getElementById("pagella-actions").classList.remove("hidden");

      hvPagellaShareData = { squadra, pagella, logoSquadraUrl, presidenteUrl };
      hvPagellaCanvasPromise = null;

      document.getElementById("pagella-copy-text").addEventListener("click", async (event) => {
        try {
          await navigator.clipboard.writeText(hvPagellaText(hvPagellaShareData));
          hvPagellaFeedbackButton(event.currentTarget, "✓ Testo copiato");
          hvPagellaSetStatus("Pagella copiata negli appunti.");
        } catch (err) {
          hvPagellaSetStatus(`Non riesco a copiare il testo: ${err.message}`, true);
        }
      });

      document.getElementById("pagella-copy-image").addEventListener("click", async (event) => {
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

      document.getElementById("pagella-download-image").addEventListener("click", async (event) => {
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

      document.getElementById("pagella-share-image").addEventListener("click", async (event) => {
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
    } catch (err) {
      document.getElementById("pagella-content-full").innerHTML = `<p class="empty-state">${err.message}</p>`;
    }
  }

  hv_checkGate().then((data) => {
    if (data) hvInitPagella(data);
  });
  document.addEventListener("hv:unlocked", (e) => hvInitPagella(e.detail));
})();
