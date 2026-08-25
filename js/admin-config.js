let hv_configBozza = null;

async function hv_sha256_cfg(testo) {
  const enc = new TextEncoder().encode(testo);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hv_renderSquadreRows() {
  const wrap = document.getElementById("cfg-squadre");
  wrap.innerHTML = "";

  hv_configBozza.squadre.forEach((s) => {
    const row = document.createElement("div");
    row.className = "cfg-squadra-row";
    row.dataset.id = s.id;
    row.innerHTML = `
      <input type="text" class="cfg-nome-reale" placeholder="Nome fantallenatore" value="${s.nomeReale}">
      <input type="text" class="cfg-nome-fanta" placeholder="Nome squadra su fantacalcio.it" value="${s.nomeFantasquadra}">
      <button class="cfg-rimuovi-squadra" type="button" title="Rimuovi">✕</button>
    `;
    wrap.appendChild(row);
  });

  wrap.querySelectorAll(".cfg-rimuovi-squadra").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".cfg-squadra-row");
      hv_configBozza.squadre = hv_configBozza.squadre.filter((s) => s.id !== row.dataset.id);
      hv_renderSquadreRows();
    });
  });
}

async function hv_initConfigForm() {
  const res = await fetch("data/config.json");
  hv_configBozza = await res.json();

  document.getElementById("cfg-nome-lega").value = hv_configBozza.lega.nome;
  document.getElementById("cfg-stagione").value = hv_configBozza.lega.stagione;
  document.getElementById("cfg-data-asta").value = (hv_configBozza.lega.dataAsta || "").slice(0, 16);
  document.getElementById("cfg-api-key").value = hv_configBozza.lega.footballDataApiKey || "";
  document.getElementById("cfg-github-token").value = hv_configBozza.lega.githubToken || "";

  hv_renderSquadreRows();
}

document.getElementById("cfg-aggiungi-squadra").addEventListener("click", () => {
  const numeri = hv_configBozza.squadre
    .map((s) => Number((s.id.match(/\d+/) || ["0"])[0]))
    .filter((n) => !Number.isNaN(n));
  const prossimo = (numeri.length ? Math.max(...numeri) : 0) + 1;
  const id = "sq-" + String(prossimo).padStart(2, "0");
  hv_configBozza.squadre.push({ id, nomeReale: "Nuovo fantallenatore", nomeFantasquadra: "" });
  hv_renderSquadreRows();
});

async function hv_applicaCampiConfig() {
  const nuovaGuest = document.getElementById("cfg-nuova-password-guest").value.trim();
  const nuovaAdmin = document.getElementById("cfg-nuova-password-admin").value.trim();

  hv_configBozza.lega.nome = document.getElementById("cfg-nome-lega").value.trim();
  hv_configBozza.lega.stagione = document.getElementById("cfg-stagione").value.trim();
  hv_configBozza.lega.dataAsta = document.getElementById("cfg-data-asta").value;
  hv_configBozza.lega.footballDataApiKey = document.getElementById("cfg-api-key").value.trim();
  hv_configBozza.lega.githubToken = document.getElementById("cfg-github-token").value.trim();

  if (nuovaGuest) {
    hv_configBozza.lega.guestPasswordHash = await hv_sha256_cfg(nuovaGuest);
  }
  if (nuovaAdmin) {
    hv_configBozza.lega.adminPasswordHash = await hv_sha256_cfg(nuovaAdmin);
  }

  document.querySelectorAll(".cfg-squadra-row").forEach((row) => {
    const s = hv_configBozza.squadre.find((x) => x.id === row.dataset.id);
    if (s) {
      s.nomeReale = row.querySelector(".cfg-nome-reale").value.trim();
      s.nomeFantasquadra = row.querySelector(".cfg-nome-fanta").value.trim();
    }
  });
}

document.getElementById("cfg-genera").addEventListener("click", async () => {
  await hv_applicaCampiConfig();

  const testo = JSON.stringify(hv_configBozza, null, 2);
  document.getElementById("cfg-output").value = testo;
  document.getElementById("cfg-output-wrap").classList.remove("hidden");

  const blob = new Blob([testo], { type: "application/json" });
  const link = document.getElementById("cfg-download");
  link.href = URL.createObjectURL(blob);
  link.classList.remove("hidden");
});

document.getElementById("cfg-salva-github").addEventListener("click", async () => {
  const stato = document.getElementById("cfg-stato-github");
  stato.textContent = "Salvataggio in corso...";
  stato.style.color = "var(--text-muted)";
  try {
    await hv_applicaCampiConfig();
    await hv_ghSalvaJSON("data/config.json", hv_configBozza, "Aggiorna config.json da admin.html", hv_configBozza);
    stato.textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
    stato.style.color = "var(--verde-prato)";
  } catch (err) {
    stato.textContent = "Errore: " + err.message;
    stato.style.color = "var(--wine-bright)";
  }
});
