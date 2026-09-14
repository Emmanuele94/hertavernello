/* Pannello Admin Bug/Consigli. L'accesso API viene validato dal Worker tramite il token GitHub già usato dall'admin. */
(() => {
  const STATI = {
    nuova: "Nuova",
    da_valutare: "Da valutare",
    accettata: "Accettata",
    risolta: "Risolta",
    scartata: "Scartata",
  };
  let initialized = false;
  let loading = false;
  const objectUrls = new Set();

  function tokenAdmin() {
    return sessionStorage.getItem("hv_gh_token") || hv_getGithubToken();
  }

  async function api(path, options = {}) {
    const token = tokenAdmin();
    if (!token) throw new Error("Serve il token GitHub per leggere le segnalazioni Admin.");
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const res = await fetch(`api/feedback/admin${path}`, { ...options, headers, cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      sessionStorage.removeItem("hv_gh_token");
      throw new Error("Token GitHub non valido o senza permessi di scrittura sulla repository.");
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Errore API (${res.status}).`);
    }
    return res;
  }

  function fmtData(value) {
    try {
      return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    } catch (_) { return value || ""; }
  }

  function statoPill(stato) {
    return STATI[stato] || stato;
  }

  function setStato(text, error = false) {
    const node = document.getElementById("feedback-admin-stato");
    if (!node) return;
    node.textContent = text;
    node.classList.toggle("is-error", error);
  }

  function pulisciObjectUrls() {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.clear();
  }

  async function caricaImmagine(reportId, index, img, link) {
    try {
      const res = await api(`/${encodeURIComponent(reportId)}/images/${index}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      objectUrls.add(url);
      img.src = url;
      link.href = url;
      link.download = `segnalazione-${reportId}-${index + 1}.jpg`;
    } catch (_) {
      img.closest(".feedback-admin-image")?.classList.add("is-error");
      img.alt = "Immagine non disponibile";
    }
  }

  function testoChatGPT(item) {
    const tipo = item.tipo === "bug" ? "Bug" : "Consiglio";
    const allegati = Number(item.imageCount || 0);
    return [
      "SEGNALAZIONE HERTAVERNELLO",
      `ID: ${item.id}`,
      `Tipo: ${tipo}`,
      `Stato: ${statoPill(item.status)}`,
      `Segnalato da: ${item.nome}`,
      `Data: ${fmtData(item.created_at)}`,
      `Pagina: ${item.pagina || "non indicata"}`,
      `Versione sito: ${item.release || "non rilevata"}`,
      `Dispositivo/piattaforma: ${item.platform || "non rilevata"}`,
      `Schermo: ${item.screen || "non rilevato"}`,
      `Browser/User-Agent: ${item.user_agent || "non rilevato"}`,
      "",
      "Descrizione:",
      item.descrizione,
      "",
      allegati ? `Allegati: ${allegati} immagine${allegati === 1 ? "" : "i"}. Le allego separatamente alla chat.` : "Allegati: nessuno.",
      "",
      "Valuta la richiesta senza modificare subito il codice: spiegami fattibilità, impatto e proposta di implementazione.",
    ].join("\n");
  }

  async function copia(item, button) {
    try {
      await navigator.clipboard.writeText(testoChatGPT(item));
      const old = button.textContent;
      button.textContent = "Copiato ✓";
      setTimeout(() => { button.textContent = old; }, 1600);
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = testoChatGPT(item);
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  async function cambiaStato(item, select) {
    const nuovo = select.value;
    select.disabled = true;
    try {
      await api(`/${encodeURIComponent(item.id)}`, { method: "PATCH", body: JSON.stringify({ status: nuovo }) });
      item.status = nuovo;
      const card = select.closest(".feedback-admin-card");
      card.dataset.status = nuovo;
      card.querySelector(".feedback-admin-status-pill").textContent = statoPill(nuovo);
      document.dispatchEvent(new Event("hv:feedback-count-refresh"));
      setStato(`Segnalazione ${item.id}: stato aggiornato.`);
    } catch (err) {
      select.value = item.status;
      setStato(err.message, true);
    } finally {
      select.disabled = false;
    }
  }

  function render(items) {
    pulisciObjectUrls();
    const wrap = document.getElementById("feedback-admin-list");
    wrap.innerHTML = "";
    if (!items.length) {
      wrap.innerHTML = '<p class="empty-state">Nessuna segnalazione in questa categoria.</p>';
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "feedback-admin-card";
      card.dataset.status = item.status;

      const head = document.createElement("div");
      head.className = "feedback-admin-card-head";
      const identity = document.createElement("div");
      identity.innerHTML = `<div class="feedback-admin-kicker"><span class="feedback-admin-status-pill">${statoPill(item.status)}</span><span>${item.tipo === "bug" ? "🐛 BUG" : "💡 CONSIGLIO"}</span></div><h3></h3><p></p>`;
      identity.querySelector("h3").textContent = item.nome;
      identity.querySelector("p").textContent = `${fmtData(item.created_at)} · ${item.pagina || "pagina non indicata"}`;

      const select = document.createElement("select");
      select.className = "feedback-admin-status-select";
      select.setAttribute("aria-label", `Stato segnalazione di ${item.nome}`);
      Object.entries(STATI).forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        if (value === item.status) option.selected = true;
        select.append(option);
      });
      select.addEventListener("change", () => cambiaStato(item, select));
      head.append(identity, select);

      const descrizione = document.createElement("p");
      descrizione.className = "feedback-admin-description";
      descrizione.textContent = item.descrizione;

      const meta = document.createElement("div");
      meta.className = "feedback-admin-meta";
      const entries = [
        ["Versione", item.release || "—"],
        ["Piattaforma", item.platform || "—"],
        ["Schermo", item.screen || "—"],
      ];
      entries.forEach(([label, value]) => {
        const span = document.createElement("span");
        span.innerHTML = `<strong>${label}</strong><small></small>`;
        span.querySelector("small").textContent = value;
        meta.append(span);
      });

      const images = document.createElement("div");
      images.className = "feedback-admin-images";
      for (let i = 0; i < Number(item.imageCount || 0); i += 1) {
        const frame = document.createElement("a");
        frame.className = "feedback-admin-image";
        frame.target = "_blank";
        frame.rel = "noopener";
        const img = document.createElement("img");
        img.alt = `Allegato ${i + 1} di ${item.nome}`;
        frame.append(img);
        images.append(frame);
        caricaImmagine(item.id, i, img, frame);
      }

      const actions = document.createElement("div");
      actions.className = "feedback-admin-actions";
      const copy = document.createElement("button");
      copy.type = "button";
      copy.textContent = "📋 Copia per ChatGPT";
      copy.addEventListener("click", () => copia(item, copy));
      actions.append(copy);

      card.append(head, descrizione, meta);
      if (Number(item.imageCount || 0)) card.append(images);
      card.append(actions);
      wrap.append(card);
    });
  }

  async function load(forcePrompt = true) {
    if (loading) return;
    loading = true;
    const button = document.getElementById("feedback-admin-refresh");
    button.disabled = true;
    const filter = document.getElementById("feedback-admin-filter").value;
    setStato("Carico le segnalazioni…");
    try {
      if (!forcePrompt && !sessionStorage.getItem("hv_gh_token")) {
        setStato("Premi “Carica segnalazioni” per autenticarti con il token GitHub.");
        return;
      }
      const res = await api(`?status=${encodeURIComponent(filter)}`);
      const data = await res.json();
      render(data.items || []);
      setStato(`${(data.items || []).length} segnalazione${(data.items || []).length === 1 ? "" : "i"} caricata${(data.items || []).length === 1 ? "" : "e"}.`);
      document.dispatchEvent(new Event("hv:feedback-count-refresh"));
    } catch (err) {
      setStato(err.message, true);
      document.getElementById("feedback-admin-list").innerHTML = '<p class="empty-state">Impossibile caricare le segnalazioni.</p>';
    } finally {
      loading = false;
      button.disabled = false;
    }
  }

  function init() {
    if (initialized || window.hv_role !== "admin") return;
    const panel = document.getElementById("bug-consigli");
    if (!panel) return;
    initialized = true;
    document.getElementById("feedback-admin-refresh").addEventListener("click", () => load(true));
    document.getElementById("feedback-admin-filter").addEventListener("change", () => load(Boolean(sessionStorage.getItem("hv_gh_token"))));

    if (location.hash === "#bug-consigli") {
      requestAnimationFrame(() => panel.scrollIntoView({ behavior: "smooth", block: "start" }));
      setTimeout(() => load(true), 250);
    } else {
      load(false);
    }
  }

  window.hv_initFeedbackAdmin = init;
  window.addEventListener("beforeunload", pulisciObjectUrls);
})();
