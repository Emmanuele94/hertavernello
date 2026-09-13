// Tasto "📄 Regolamento": apre un pannello con l'anteprima del PDF incorporata
// (funziona bene su desktop). Su telefoni dove l'anteprima incorporata non
// parte, resta sempre visibile il link "Apri in un'altra scheda", che usa il
// visualizzatore PDF nativo del telefono — funziona sempre, ovunque.
document.addEventListener("DOMContentLoaded", () => {
  const apriBtn = document.getElementById("hv-apri-regolamento");
  const overlay = document.getElementById("regolamento-overlay");
  const corpo = document.getElementById("regolamento-corpo");
  const chiudiBtn = document.getElementById("regolamento-chiudi");
  if (!apriBtn || !overlay) return;

  function apri(e) {
    e.preventDefault();
    if (!corpo.querySelector("iframe")) {
      corpo.innerHTML = `<iframe src="assets/regolamento.pdf" title="Regolamento"></iframe>`;
    }
    overlay.classList.remove("hidden");
  }

  function chiudi() {
    overlay.classList.add("hidden");
  }

  apriBtn.addEventListener("click", apri);
  chiudiBtn.addEventListener("click", chiudi);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) chiudi();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) chiudi();
  });
});
