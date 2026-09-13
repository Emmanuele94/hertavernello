document.getElementById("regolamento-carica-btn").addEventListener("click", async () => {
  const stato = document.getElementById("regolamento-admin-stato");
  const file = document.getElementById("regolamento-file-input").files[0];
  if (!file) {
    stato.textContent = "Scegli un file PDF.";
    stato.style.color = "var(--wine-bright)";
    return;
  }

  stato.textContent = "Caricamento in corso...";
  stato.style.color = "var(--text-muted)";
  try {
    const configRes = await fetch("data/config.json");
    const config = await configRes.json();
    await hv_caricaRegolamentoViaGitHub(file, config, (secondi) => {
      stato.textContent = `Aspetto ${secondi}s (limite di GitHub tra un caricamento e l'altro)...`;
      stato.style.color = "var(--text-muted)";
    });
    stato.textContent = "Caricato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
    stato.style.color = "var(--verde-prato)";
  } catch (err) {
    stato.textContent = "Errore: " + err.message;
    stato.style.color = "var(--wine-bright)";
  }
});
