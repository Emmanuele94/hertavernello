let hv_calendarioBozza = [];
let hv_configCalendario = null;

function hv_nomeSquadraById(id) {
  const s = hv_configCalendario.squadre.find((x) => x.id === id);
  return s ? s.nomeReale : id;
}

function hv_renderBozzaCalendario() {
  const wrap = document.getElementById("calendario-lista");
  if (hv_calendarioBozza.length === 0) {
    wrap.innerHTML = '<p class="empty-state" style="padding:8px 0;">Nessuna giornata inserita ancora.</p>';
    return;
  }

  const ordinate = [...hv_calendarioBozza].sort((a, b) => a.giornata - b.giornata);
  wrap.innerHTML = ordinate
    .map((g) => {
      const desc = g.incontri
        .map((coppia) =>
          coppia.length === 2
            ? `${hv_nomeSquadraById(coppia[0])} vs ${hv_nomeSquadraById(coppia[1])}`
            : `${hv_nomeSquadraById(coppia[0])} riposa`
        )
        .join(" · ");
      return `
        <div class="calendario-riga">
          <span><strong>Giornata ${g.giornata}</strong> — ${desc}</span>
          <button class="cal-rimuovi" data-giornata="${g.giornata}">Rimuovi</button>
        </div>`;
    })
    .join("");

  wrap.querySelectorAll(".cal-rimuovi").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = Number(btn.dataset.giornata);
      hv_calendarioBozza = hv_calendarioBozza.filter((x) => x.giornata !== g);
      hv_renderBozzaCalendario();
    });
  });
}

function hv_costruisciFormCalendario() {
  const wrap = document.getElementById("calendario-form-coppie");
  wrap.innerHTML = "";

  const squadre = hv_configCalendario.squadre;
  const opzioni = (selezionata) =>
    `<option value="">—</option>` +
    squadre.map((s) => `<option value="${s.id}" ${s.id === selezionata ? "selected" : ""}>${s.nomeReale}</option>`).join("");

  const nCoppie = Math.floor(squadre.length / 2);
  for (let i = 0; i < nCoppie; i++) {
    const row = document.createElement("div");
    row.className = "campo-riga cal-coppia";
    row.innerHTML = `
      <select class="cal-select-a">${opzioni("")}</select>
      <span class="muted" style="align-self:center;">vs</span>
      <select class="cal-select-b">${opzioni("")}</select>
    `;
    wrap.appendChild(row);
  }

  if (squadre.length % 2 === 1) {
    const row = document.createElement("div");
    row.className = "campo-riga";
    row.innerHTML = `
      <select class="cal-select-riposa">${opzioni("")}</select>
      <span class="muted" style="align-self:center;">riposa questa giornata</span>
    `;
    wrap.appendChild(row);
  }
}

async function hv_initCalendarioForm() {
  const [configRes, calendarioRes] = await Promise.all([
    fetch("data/config.json"),
    fetch("data/calendario.json"),
  ]);
  hv_configCalendario = await configRes.json();
  const calData = await calendarioRes.json();
  hv_calendarioBozza = calData.giornate || [];

  hv_costruisciFormCalendario();
  hv_renderBozzaCalendario();

  const usate = hv_calendarioBozza.map((g) => g.giornata);
  const suggerimentoEl = document.getElementById("cal-suggerimento");

  let base = 1;
  if (hv_calendarioBozza.length === 0 && hv_configCalendario.lega.footballDataApiKey) {
    try {
      const corrente = await hv_getGiornataCorrente(hv_configCalendario.lega.footballDataApiKey);
      if (corrente) {
        base = corrente;
        suggerimentoEl.textContent = `Suggerimento: la giornata reale di Serie A in corso ora è la ${corrente} — probabilmente è da lì che parte la vostra prima giornata di lega.`;
      }
    } catch (err) {
      // silenzioso: si tiene il default 1, l'admin può comunque scrivere il numero giusto a mano
    }
  }

  let n = base;
  while (usate.includes(n)) n++;
  document.getElementById("cal-giornata").value = n;
}

document.getElementById("cal-aggiungi").addEventListener("click", () => {
  const giornata = Number(document.getElementById("cal-giornata").value);
  const avviso = document.getElementById("cal-avviso");
  avviso.textContent = "";

  if (!giornata || giornata < 1) {
    avviso.textContent = "Inserisci un numero di giornata valido.";
    return;
  }

  const incontri = [];
  const usati = new Set();

  document.querySelectorAll(".cal-coppia").forEach((row) => {
    const a = row.querySelector(".cal-select-a").value;
    const b = row.querySelector(".cal-select-b").value;
    if (a && b) {
      if (usati.has(a) || usati.has(b)) {
        avviso.textContent = "Una squadra compare più di una volta in questa giornata — controlla gli accoppiamenti.";
        return;
      }
      usati.add(a);
      usati.add(b);
      incontri.push([a, b]);
    } else if (a || b) {
      avviso.textContent = "C'è una coppia con una sola squadra selezionata — completala o lasciala vuota.";
    }
  });

  const riposaSel = document.getElementById("calendario-form-coppie").querySelector(".cal-select-riposa");
  if (riposaSel && riposaSel.value) incontri.push([riposaSel.value]);

  if (avviso.textContent) return;

  if (incontri.length === 0) {
    avviso.textContent = "Compila almeno una coppia prima di aggiungere la giornata.";
    return;
  }

  hv_calendarioBozza = hv_calendarioBozza.filter((g) => g.giornata !== giornata);
  hv_calendarioBozza.push({ giornata, incontri });
  hv_renderBozzaCalendario();
  hv_costruisciFormCalendario();
  document.getElementById("cal-giornata").value = giornata + 1;
});

document.getElementById("calendario-genera").addEventListener("click", () => {
  const ordinate = [...hv_calendarioBozza].sort((a, b) => a.giornata - b.giornata);
  const output = { _leggimi: "Generato da admin.html — sostituisci data/calendario.json", giornate: ordinate };
  const testo = JSON.stringify(output, null, 2);

  document.getElementById("calendario-output").value = testo;
  document.getElementById("calendario-output-wrap").classList.remove("hidden");

  const blob = new Blob([testo], { type: "application/json" });
  const link = document.getElementById("calendario-download");
  link.href = URL.createObjectURL(blob);
  link.classList.remove("hidden");
});

hv_initCalendarioForm();
