/* Strumenti comuni del sito: Bug/Consigli, badge admin e guida iniziale. */
(() => {
  const GUIDE_SEEN_KEY = "hv_guida_vista_v2";
  const GUIDE_NEVER_KEY = "hv_guida_non_mostrare_v2";
  const FEEDBACK_COUNT_INTERVAL = 60 * 1000;
  let countTimer = null;
  let guideOverlay = null;

  function hv_roleCorrente() {
    return window.hv_role || sessionStorage.getItem("hv_role") || "";
  }

  function hv_paginaCorrente() {
    const file = location.pathname.split("/").pop() || "index.html";
    return file + location.search + location.hash;
  }

  function hv_urlFeedback() {
    if (hv_roleCorrente() === "admin") return "admin.html#bug-consigli";
    return `feedback.html?from=${encodeURIComponent(hv_paginaCorrente())}`;
  }

  function hv_creaNavTools() {
    document.querySelectorAll(".site-header nav").forEach((nav) => {
      if (nav.querySelector("[data-hv-feedback-link]")) return;

      const feedback = document.createElement("a");
      feedback.className = "nav-btn hv-feedback-nav";
      feedback.dataset.hvFeedbackLink = "1";
      feedback.href = hv_urlFeedback();
      feedback.innerHTML = '<span class="hv-nav-emoji" aria-hidden="true">💡</span><span>Bug / Consigli</span><span class="hv-feedback-badge hidden" aria-label="Segnalazioni nuove"></span>';
      if ((location.pathname.split("/").pop() || "") === "feedback.html") feedback.classList.add("active");

      const guide = document.createElement("a");
      guide.className = "nav-btn hv-guide-nav";
      guide.dataset.hvGuideLink = "1";
      guide.href = "#guida";
      guide.innerHTML = '<span class="hv-nav-emoji" aria-hidden="true">❓</span><span>Guida</span>';
      guide.addEventListener("click", (event) => {
        event.preventDefault();
        hv_apriGuida(false);
      });

      const admin = nav.querySelector("#nav-admin-link");
      const exit = nav.querySelector("#hv-esci");
      const before = admin || exit || null;
      nav.insertBefore(feedback, before);
      nav.insertBefore(guide, before);
    });
  }

  function hv_aggiornaLinkRuolo() {
    const href = hv_urlFeedback();
    document.querySelectorAll("[data-hv-feedback-link]").forEach((link) => {
      link.href = href;
      link.title = hv_roleCorrente() === "admin"
        ? "Apri le segnalazioni ricevute"
        : "Segnala un bug o proponi un consiglio";
    });
    hv_aggiornaBadgeFeedback();
  }

  async function hv_aggiornaBadgeFeedback() {
    const badges = [...document.querySelectorAll(".hv-feedback-badge")];
    if (!badges.length) return;
    if (hv_roleCorrente() !== "admin") {
      badges.forEach((badge) => badge.classList.add("hidden"));
      return;
    }

    try {
      const res = await fetch(`api/feedback/count?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("feedback API non disponibile");
      const data = await res.json();
      const count = Math.max(0, Number(data.count) || 0);
      badges.forEach((badge) => {
        badge.textContent = count > 99 ? "99+" : String(count);
        badge.classList.toggle("hidden", count === 0);
        badge.setAttribute("aria-label", `${count} segnalazioni nuove`);
      });
    } catch (_) {
      badges.forEach((badge) => badge.classList.add("hidden"));
    }
  }

  function hv_creaGuida() {
    if (guideOverlay) return guideOverlay;
    const overlay = document.createElement("div");
    overlay.className = "hv-guide-overlay hidden";
    overlay.id = "hv-guide-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "hv-guide-title");
    overlay.innerHTML = `
      <div class="hv-guide-panel">
        <button type="button" class="hv-guide-close" aria-label="Chiudi guida">✕</button>
        <span class="pv-eyebrow">GUIDA RAPIDA</span>
        <h2 id="hv-guide-title">Hertavernello in 4 mosse</h2>
        <p class="hv-guide-intro">Tutto quello che serve per orientarsi nel sito, senza perdere tempo.</p>
        <div class="hv-guide-grid">
          <article><span>🏠</span><div><h3>Home</h3><p>Risultati, classifica, incroci, previsioni e protagonisti della giornata.</p></div></article>
          <article><span>👕</span><div><h3>Squadre</h3><p>Scegli una fantasquadra, consulta la rosa e cerca un giocatore per scoprire subito chi lo possiede. Il tasto <strong>INFO</strong> mostra le partite reali della giornata.</p></div></article>
          <article><span>🏆</span><div><h3>Archivio</h3><p>Rivivi stagioni, vincitori, rose storiche, pagelle, video e audio della lega.</p></div></article>
          <article><span>💡</span><div><h3>Bug / Consigli</h3><p>Segnala un problema o proponi un'idea. La bozza resta salvata sul dispositivo anche se esci per errore.</p></div></article>
        </div>
        <div class="hv-guide-actions">
          <button type="button" class="hv-guide-ok">Ho capito</button>
          <button type="button" class="hv-guide-never">Non mostrare più</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = (never = false) => {
      localStorage.setItem(GUIDE_SEEN_KEY, "1");
      if (never) localStorage.setItem(GUIDE_NEVER_KEY, "1");
      overlay.classList.add("hidden");
      document.body.classList.remove("hv-modal-open");
    };
    overlay.querySelector(".hv-guide-close").addEventListener("click", () => close(false));
    overlay.querySelector(".hv-guide-ok").addEventListener("click", () => close(false));
    overlay.querySelector(".hv-guide-never").addEventListener("click", () => close(true));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(false);
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close(false);
    });
    guideOverlay = overlay;
    return overlay;
  }

  function hv_apriGuida(automatico = false) {
    if (automatico && (localStorage.getItem(GUIDE_SEEN_KEY) || localStorage.getItem(GUIDE_NEVER_KEY))) return;
    const app = document.getElementById("app");
    if (automatico && (!hv_roleCorrente() || !app || app.classList.contains("hidden"))) return;
    const overlay = hv_creaGuida();
    overlay.classList.remove("hidden");
    document.body.classList.add("hv-modal-open");
    requestAnimationFrame(() => overlay.querySelector(".hv-guide-close")?.focus());
  }

  function hv_provaGuidaAutomatica() {
    if (localStorage.getItem(GUIDE_SEEN_KEY) || localStorage.getItem(GUIDE_NEVER_KEY)) return;
    let tentativi = 0;
    const timer = setInterval(() => {
      tentativi += 1;
      const app = document.getElementById("app");
      if (hv_roleCorrente() && app && !app.classList.contains("hidden")) {
        clearInterval(timer);
        hv_apriGuida(true);
      } else if (tentativi >= 20) {
        clearInterval(timer);
      }
    }, 150);
  }

  function hv_initSiteTools() {
    hv_creaNavTools();
    hv_aggiornaLinkRuolo();
    hv_provaGuidaAutomatica();
    if (!countTimer) countTimer = setInterval(hv_aggiornaBadgeFeedback, FEEDBACK_COUNT_INTERVAL);
  }

  document.addEventListener("DOMContentLoaded", hv_initSiteTools);
  document.addEventListener("hv:unlocked", () => {
    hv_creaNavTools();
    hv_aggiornaLinkRuolo();
    hv_provaGuidaAutomatica();
  });
  document.addEventListener("hv:feedback-count-refresh", hv_aggiornaBadgeFeedback);

  window.hv_apriGuida = hv_apriGuida;
  window.hv_aggiornaBadgeFeedback = hv_aggiornaBadgeFeedback;
})();
