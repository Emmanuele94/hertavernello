// Protezione con password semplice, lato client, a due livelli (guest/admin).
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
  const erroreIniziale = document.getElementById("gate-error");

  let data;
  try {
    const res = await fetch("data/config.json");
    data = await res.json();
  } catch (err) {
    gate.classList.remove("hidden");
    app.classList.add("hidden");
    if (erroreIniziale) {
      erroreIniziale.textContent =
        "Impossibile leggere i dati del sito. Se hai aperto questo file con doppio click dal computer, apri invece il sito online oppure usa un server locale (vedi README).";
    }
    return null;
  }

  const hashGuest = data.lega.guestPasswordHash;
  const hashAdmin = data.lega.adminPasswordHash;

  const ruoloSalvato = sessionStorage.getItem("hv_role");
  if (ruoloSalvato === "guest" || ruoloSalvato === "admin") {
    window.hv_role = ruoloSalvato;
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
    let ruolo = null;
    if (hash === hashAdmin) ruolo = "admin";
    else if (hash === hashGuest) ruolo = "guest";

    if (ruolo) {
      sessionStorage.setItem("hv_role", ruolo);
      window.hv_role = ruolo;
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

function hv_logout() {
  sessionStorage.removeItem("hv_role");
  window.location.reload();
}

document.addEventListener("DOMContentLoaded", () => {
  const link = document.getElementById("hv-esci");
  if (link) link.addEventListener("click", (e) => { e.preventDefault(); hv_logout(); });
});
