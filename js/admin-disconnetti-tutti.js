// "Disconnetti tutti" (Admin, sezione 8): aggiorna data/versione.json su
// GitHub con un nuovo valore. Tutti i browser aperti lo notano tramite
// js/versione-check.js — al più entro 2 minuti chi ha già una pagina aperta,
// subito chi la ricarica — e vengono disconnessi automaticamente.
document.getElementById("disconnetti-tutti-btn").addEventListener("click", async () => {
  const stato = document.getElementById("disconnetti-tutti-stato");
  if (!confirm("Disconnettere davvero tutti, te compreso? Dovrete rifare il login.")) return;

  stato.textContent = "Invio in corso...";
  stato.style.color = "var(--text-muted)";
  try {
    const configRes = await fetch("data/config.json");
    const config = await configRes.json();
    const { githubOwner: owner, githubRepo: repo } = config.lega;
    const token = hv_getGithubToken();
    if (!token || !owner || !repo) {
      throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");
    }

    const nuovaVersione = String(Date.now());
    await hv_scriviJsonConRitentativo(
      owner,
      repo,
      "data/versione.json",
      token,
      (obj) => ({ oggetto: { ...(obj || {}), v: nuovaVersione }, valore: nuovaVersione }),
      "Disconnetti tutti"
    );

    stato.textContent = "Fatto ✓ — tutti verranno disconnessi entro un paio di minuti (te compreso, tra poco).";
    stato.style.color = "var(--verde-prato)";
  } catch (err) {
    stato.textContent = "Errore: " + err.message;
    stato.style.color = "var(--wine-bright)";
  }
});
