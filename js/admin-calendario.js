let hv_calendarioBozza = [];
let hv_configCalendario = null;

function hv_nomeSquadraById(id) {
  const s = hv_configCalendario.squadre.find((x) => x.id === id);
  return s ? s.nomeReale : id;
}

function hv_selectCalendario() {
  return [...document.querySelectorAll("#calendario-form-coppie select")];
}

function hv_aggiornaOpzioniCalendario() {
  const selects = hv_selectCalendario();
  if (!hv_configCalendario || selects.length === 0) return;

  const valori = new Map(selects.map((sel) => [sel, sel.value]));
  const selezionate = new Set([...valori.values()].filter(Boolean));

  selects.forEach((sel) => {
    const corrente = valori.get(sel) || "";
    sel.innerHTML = '<option value="">—</option>';

    hv_configCalendario.squadre.forEach((squadra) => {
      if (squadra.id !== corrente && selezionate.has(squadra.id)) return;
      const option = document.createElement("option");
      option.value = squadra.id;
      option.textContent = squadra.nomeReale;
      option.selected = squadra.id === corrente;
      sel.appendChild(option);
    });
  });
}

function hv_validaIncontriGiornata(incontri) {
  const usati = new Set();
  for (const coppia of incontri || []) {
    for (const id of coppia || []) {
      if (!id) continue;
      if (usati.has(id)) return false;
      usati.add(id);
    }
  }
  return true;
}

function hv_validaCalendarioBozza() {
  return hv_calendarioBozza.every((g) => hv_validaIncontriGiornata(g.incontri));
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
  const opzioni = () =>
    `<option value="">—</option>` +
    squadre.map((s) => `<option value="${s.id}">${s.nomeReale}</option>`).join("");

  const nCoppie = Math.floor(squadre.length / 2);
  for (let i = 0; i < nCoppie; i++) {
    const row = document.createElement("div");
    row.className = "campo-riga cal-coppia";
    row.innerHTML = `
      <select class="cal-select-a">${opzioni()}</select>
      <span class="muted" style="align-self:center;">vs</span>
      <select class="cal-select-b">${opzioni()}</select>
    `;
    wrap.appendChild(row);
  }

  if (squadre.length % 2 === 1) {
    const row = document.createElement("div");
    row.className = "campo-riga";
    row.innerHTML = `
      <select class="cal-select-riposa">${opzioni()}</select>
      <span class="muted" style="align-self:center;">riposa questa giornata</span>
    `;
    wrap.appendChild(row);
  }

  hv_selectCalendario().forEach((select) => {
    select.addEventListener("change", hv_aggiornaOpzioniCalendario);
  });
  hv_aggiornaOpzioniCalendario();
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
  let errore = "";

  for (const row of document.querySelectorAll(".cal-coppia")) {
    const a = row.querySelector(".cal-select-a").value;
    const b = row.querySelector(".cal-select-b").value;

    if (a && b) {
      if (a === b || usati.has(a) || usati.has(b)) {
        errore = "Una squadra compare più di una volta in questa giornata — controlla gli accoppiamenti.";
        break;
      }
      usati.add(a);
      usati.add(b);
      incontri.push([a, b]);
    } else if (a || b) {
      errore = "C'è una coppia con una sola squadra selezionata — completala o lasciala vuota.";
      break;
    }
  }

  const riposaSel = document.getElementById("calendario-form-coppie").querySelector(".cal-select-riposa");
  if (!errore && riposaSel && riposaSel.value) {
    if (usati.has(riposaSel.value)) {
      errore = "La squadra indicata come riposo compare già in un incontro della giornata.";
    } else {
      usati.add(riposaSel.value);
      incontri.push([riposaSel.value]);
    }
  }

  if (errore || !hv_validaIncontriGiornata(incontri)) {
    avviso.textContent = errore || "Una squadra compare più di una volta in questa giornata — controlla gli accoppiamenti.";
    return;
  }

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
  if (!hv_validaCalendarioBozza()) {
    document.getElementById("cal-avviso").textContent = "Il calendario contiene una giornata con una squadra duplicata. Correggila prima di generare il file.";
    return;
  }
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

document.getElementById("calendario-salva-github").addEventListener("click", async () => {
  const stato = document.getElementById("calendario-stato-github");
  stato.textContent = "Salvataggio in corso...";
  stato.style.color = "var(--text-muted)";
  try {
    if (!hv_validaCalendarioBozza()) {
      throw new Error("Il calendario contiene una giornata con una squadra duplicata. Correggila prima di salvare.");
    }
    const ordinate = [...hv_calendarioBozza].sort((a, b) => a.giornata - b.giornata);
    const output = { _leggimi: "Generato da admin.html — sostituisci data/calendario.json", giornate: ordinate };
    await hv_ghSalvaJSON("data/calendario.json", output, "Aggiorna calendario.json da admin.html", hv_configCalendario);
    stato.textContent = "Salvato ✓ — il sito pubblico si aggiornerà tra circa un minuto.";
    stato.style.color = "var(--verde-prato)";
  } catch (err) {
    stato.textContent = "Errore: " + err.message;
    stato.style.color = "var(--wine-bright)";
  }
});
