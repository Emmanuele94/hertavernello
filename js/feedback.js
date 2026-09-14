/* Modulo pubblico Bug/Consigli: draft persistente (IndexedDB), compressione immagini e invio al Worker. */
(() => {
  const DB_NAME = "hertavernello-feedback";
  const DB_VERSION = 1;
  const STORE = "drafts";
  const DRAFT_KEY = "feedback-main";
  const MAX_IMAGES = 5;
  const MAX_SIDE = 1600;
  const JPEG_QUALITY = 0.82;
  let immagini = [];
  let saveTimer = null;
  let initialized = false;
  let releaseCorrente = "";

  const el = (id) => document.getElementById(id);

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbPut(value) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async function dbGet() {
    const db = await openDb();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(DRAFT_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  }

  async function dbDelete() {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(DRAFT_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  function draftState(text, error = false) {
    const state = el("feedback-draft-state");
    if (!state) return;
    state.textContent = text;
    state.classList.toggle("is-error", error);
  }

  function status(text, type = "") {
    const node = el("feedback-status");
    if (!node) return;
    node.textContent = text;
    node.dataset.type = type;
  }

  function getTipo() {
    return document.querySelector('input[name="tipo"]:checked')?.value || "bug";
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    draftState("Salvataggio bozza…");
    saveTimer = setTimeout(salvaBozza, 350);
  }

  async function salvaBozza() {
    try {
      await dbPut({
        id: DRAFT_KEY,
        tipo: getTipo(),
        nome: el("feedback-nome")?.value || "",
        descrizione: el("feedback-descrizione")?.value || "",
        from: el("feedback-from")?.value || "",
        immagini: immagini.map((item) => ({ nome: item.nome, tipo: item.blob.type, blob: item.blob })),
        updatedAt: Date.now(),
      });
      draftState("Bozza salvata ✓");
    } catch (_) {
      draftState("Non riesco a salvare la bozza su questo dispositivo", true);
    }
  }

  function aggiornaContatore() {
    const text = el("feedback-descrizione")?.value || "";
    if (el("feedback-char-count")) el("feedback-char-count").textContent = String(text.length);
  }

  function renderImmagini() {
    const wrap = el("feedback-images-preview");
    if (!wrap) return;
    wrap.innerHTML = "";
    immagini.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "feedback-image-preview";
      const img = document.createElement("img");
      const url = URL.createObjectURL(item.blob);
      img.src = url;
      img.alt = `Immagine ${index + 1}`;
      img.onload = () => URL.revokeObjectURL(url);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "✕";
      btn.setAttribute("aria-label", `Rimuovi immagine ${index + 1}`);
      btn.addEventListener("click", () => {
        immagini.splice(index, 1);
        renderImmagini();
        scheduleSave();
      });
      const meta = document.createElement("small");
      meta.textContent = `${Math.max(1, Math.round(item.blob.size / 1024))} KB`;
      card.append(img, btn, meta);
      wrap.append(card);
    });
    const picker = document.querySelector(".feedback-image-picker");
    if (picker) picker.classList.toggle("is-full", immagini.length >= MAX_IMAGES);
  }

  function caricaImmagine(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Non riesco a leggere ${file.name}.`)); };
      img.src = url;
    });
  }

  async function comprimiImmagine(file) {
    if (!file.type.startsWith("image/")) throw new Error(`${file.name} non è un'immagine valida.`);
    const img = await caricaImmagine(file);
    const ratio = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) throw new Error(`Non riesco a comprimere ${file.name}.`);
    if (blob.size > 2 * 1024 * 1024) throw new Error(`${file.name} resta troppo grande anche dopo la compressione.`);
    const base = (file.name || "immagine").replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").slice(0, 60) || "immagine";
    return { nome: `${base}.jpg`, blob };
  }

  async function aggiungiImmagini(files) {
    const disponibili = MAX_IMAGES - immagini.length;
    if (disponibili <= 0) return status(`Puoi allegare al massimo ${MAX_IMAGES} immagini.`, "error");
    const scelte = [...files].slice(0, disponibili);
    status("Comprimo le immagini…");
    try {
      for (const file of scelte) immagini.push(await comprimiImmagine(file));
      renderImmagini();
      scheduleSave();
      status(immagini.length ? `${immagini.length} immagine${immagini.length === 1 ? "" : "i"} pronta${immagini.length === 1 ? "" : "e"}.` : "");
    } catch (err) {
      status(err.message, "error");
    } finally {
      el("feedback-images").value = "";
    }
  }

  async function ripristinaBozza() {
    try {
      const draft = await dbGet();
      if (!draft) return;
      const radio = document.querySelector(`input[name="tipo"][value="${draft.tipo}"]`);
      if (radio) radio.checked = true;
      el("feedback-nome").value = draft.nome || "";
      el("feedback-descrizione").value = draft.descrizione || "";
      if (draft.from && !el("feedback-from").value) el("feedback-from").value = draft.from;
      immagini = (draft.immagini || []).slice(0, MAX_IMAGES).map((item) => ({ nome: item.nome, blob: item.blob }));
      renderImmagini();
      aggiornaContatore();
      draftState("Bozza ripristinata ✓");
    } catch (_) {
      draftState("Bozza locale non disponibile", true);
    }
  }

  async function caricaRelease() {
    try {
      const res = await fetch(`data/versione.json?_=${Date.now()}`, { cache: "no-store" });
      if (res.ok) releaseCorrente = String((await res.json()).release || "");
    } catch (_) {}
  }

  async function invia(event) {
    event.preventDefault();
    const nome = el("feedback-nome").value.trim();
    const descrizione = el("feedback-descrizione").value.trim();
    if (nome.length < 2) return status("Inserisci il tuo nome.", "error");
    if (descrizione.length < 8) return status("Descrivi il bug o il consiglio con qualche dettaglio in più.", "error");

    const button = el("feedback-submit");
    button.disabled = true;
    button.textContent = "Invio in corso…";
    status("Sto inviando la segnalazione e gli eventuali allegati…");

    const fd = new FormData();
    fd.append("tipo", getTipo());
    fd.append("nome", nome);
    fd.append("descrizione", descrizione);
    fd.append("pagina", el("feedback-from").value || "feedback.html");
    fd.append("release", releaseCorrente);
    fd.append("userAgent", navigator.userAgent || "");
    fd.append("platform", navigator.userAgentData?.platform || navigator.platform || "");
    fd.append("screen", `${screen.width}x${screen.height} @${window.devicePixelRatio || 1}x · viewport ${innerWidth}x${innerHeight}`);
    fd.append("website", el("feedback-website").value || "");
    immagini.forEach((item, i) => fd.append("images", item.blob, item.nome || `immagine-${i + 1}.jpg`));

    try {
      const res = await fetch("api/feedback", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Invio non riuscito (${res.status}).`);
      await dbDelete().catch(() => {});
      immagini = [];
      event.currentTarget.reset();
      document.querySelector('input[name="tipo"][value="bug"]').checked = true;
      renderImmagini();
      aggiornaContatore();
      draftState("Bozza inviata e rimossa ✓");
      status(`Segnalazione inviata ✓ · riferimento ${data.id || "ricevuto"}.`, "success");
    } catch (err) {
      await salvaBozza().catch(() => {});
      status(`${err.message} La bozza resta salvata su questo dispositivo.`, "error");
    } finally {
      button.disabled = false;
      button.textContent = "Invia segnalazione";
    }
  }

  async function svuotaBozza() {
    if (!confirm("Vuoi cancellare testo e immagini della bozza?")) return;
    clearTimeout(saveTimer);
    await dbDelete().catch(() => {});
    immagini = [];
    el("feedback-form").reset();
    document.querySelector('input[name="tipo"][value="bug"]').checked = true;
    renderImmagini();
    aggiornaContatore();
    draftState("Bozza vuota");
    status("");
  }

  function maybeRedirectAdmin() {
    if ((window.hv_role || sessionStorage.getItem("hv_role")) === "admin") {
      location.replace("admin.html#bug-consigli");
      return true;
    }
    return false;
  }

  async function init(config) {
    if (initialized) return;
    if (maybeRedirectAdmin()) return;
    initialized = true;
    if (config?.lega?.nome) el("lega-nome").textContent = config.lega.nome;
    const params = new URLSearchParams(location.search);
    el("feedback-from").value = params.get("from") || document.referrer || "";

    el("feedback-form").addEventListener("submit", invia);
    el("feedback-clear-draft").addEventListener("click", svuotaBozza);
    el("feedback-images").addEventListener("change", (event) => aggiungiImmagini(event.target.files));
    el("feedback-nome").addEventListener("input", scheduleSave);
    el("feedback-descrizione").addEventListener("input", () => { aggiornaContatore(); scheduleSave(); });
    document.querySelectorAll('input[name="tipo"]').forEach((radio) => radio.addEventListener("change", scheduleSave));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        clearTimeout(saveTimer);
        salvaBozza().catch(() => {});
      }
    });
    window.addEventListener("pagehide", () => {
      clearTimeout(saveTimer);
      salvaBozza().catch(() => {});
    });

    await Promise.all([ripristinaBozza(), caricaRelease()]);
    aggiornaContatore();
  }

  hv_checkGate().then((data) => { if (data) init(data); });
  document.addEventListener("hv:unlocked", (event) => init(event.detail));
})();
