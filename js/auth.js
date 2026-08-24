// Protezione con password semplice, lato client.
// Nota onesta: non è sicurezza vera (chi guarda il codice sorgente e ha tempo
// potrebbe aggirarla), ma tiene fuori i curiosi random e i motori di ricerca.
// Sufficiente per un sito privato tra amici, non per dati sensibili veri.

async function hv_sha256(testo) {
  const enc = new TextEncoder().encode(testo);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hv_checkGate() {
  const gate = document.getElementById("gate");
  const app = document.getElementById("app");

  let data;
  try {
    const res = await fetch("data/config.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    data = await res.json();
  } catch (err) {
    const errore = document.getElementById("gate-error");
    if (errore) {
      errore.textContent =
        "Impossibile caricare data/config.json. Se hai aperto il file con doppio click, apri il sito con un server locale (es. 'python3 -m http.server') o pubblicalo su GitHub Pages: i browser bloccano la lettura di file locali per sicurezza.";
    }
    console.error("Errore caricamento config.json:", err);
    return null;
  }

  const hashAtteso = data.lega.passwordHash;

  const giaSbloccato = sessionStorage.getItem("hv_auth") === hashAtteso;
  if (giaSbloccato) {
    gate.classList.add("hidden");
    app.classList.remove("hidden");
    return data;
  }

  gate.classList.remove("hidden");
  app.classList.add("hidden");

  const input = document.getElementById("gate-input");
  const btn = document.getElementById("gate-btn");
  const errore = document.getElementById("gate-error");

  async function tentaAccesso() {
    const hash = await hv_sha256(input.value.trim());
    if (hash === hashAtteso) {
      sessionStorage.setItem("hv_auth", hashAtteso);
      gate.classList.add("hidden");
      app.classList.remove("hidden");
      document.dispatchEvent(new CustomEvent("hv:unlocked", { detail: data }));
    } else {
      errore.textContent = "Password sbagliata, riprova.";
      input.value = "";
      input.focus();
    }
  }

  btn.addEventListener("click", tentaAccesso);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tentaAccesso();
  });

  return null;
}
