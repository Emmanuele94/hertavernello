/* Mercato & Scambi: bozze persistenti, modifica/elimina e applicazione finale in blocco. */
(() => {
  let initialized = false;
  let config = null;
  let roseData = null;
  let mercatoData = null;
  let bozze = [];
  let editingDraftId = null;
  let editingConfirmedId = null;
  let formRoseData = null;
  let formBaseErrors = [];

  const ruoloLabel = { POR: 'Portieri', DIF: 'Difensori', CEN: 'Centrocampisti', ATT: 'Attaccanti' };
  const ruoloOrdine = ['POR', 'DIF', 'CEN', 'ATT'];
  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const teamById = (id) => config?.squadre?.find((s) => s.id === id) || null;
  const nomeTeam = (id) => teamById(id)?.nomeFantasquadra || teamById(id)?.nomeReale || id || '';
  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  function formatoData(iso) {
    if (!iso) return '';
    const [y,m,d] = iso.split('-');
    return y && m && d ? `${d}/${m}/${y}` : iso;
  }

  function oggiLocale() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const g = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${g}`;
  }

  async function loadJSON(path, fallback) {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) return fallback;
      return await res.json();
    } catch { return fallback; }
  }

  function storageKey() {
    const stagione = String(config?.lega?.stagione || 'corrente').replace(/[^a-z0-9_-]+/gi, '_');
    return `hv_mercato_bozze_v2_${stagione}`;
  }

  function caricaBozzeLocali() {
    try {
      const raw = localStorage.getItem(storageKey());
      const parsed = raw ? JSON.parse(raw) : [];
      bozze = Array.isArray(parsed) ? parsed.filter((b) => b && b.id && b.squadraAId && b.squadraBId) : [];
    } catch {
      bozze = [];
    }
  }

  function salvaBozzeLocali() {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(bozze));
    } catch (err) {
      const stato = document.getElementById('mercato-stato');
      if (stato) stato.textContent = `Attenzione: non riesco a salvare le bozze nel browser (${err.message}).`;
    }
  }

  function normalizzaNome(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function playerIdentity(g) {
    if (g?.fantacalcioId !== undefined && g?.fantacalcioId !== null && String(g.fantacalcioId).trim()) {
      return `id:${String(g.fantacalcioId).trim()}`;
    }
    return `nr:${normalizzaNome(g?.nome)}:${String(g?.ruolo || '')}`;
  }

  function playerKey(g, index) {
    return `${playerIdentity(g)}::${index}`;
  }

  function rosaById(id, source = formRoseData || roseData) {
    return source?.rose?.find((r) => r.squadraId === id) || null;
  }

  function opzioniSquadre(escludi = '') {
    return ['<option value="">-- scegli --</option>']
      .concat((config?.squadre || []).filter((s) => s.id !== escludi).map((s) => `<option value="${esc(s.id)}">${esc(s.nomeFantasquadra)} (${esc(s.nomeReale)})</option>`))
      .join('');
  }

  function conteggioRuoli(lista) {
    const out = { POR:0,DIF:0,CEN:0,ATT:0 };
    lista.forEach((g) => { if (out[g.ruolo] !== undefined) out[g.ruolo]++; });
    return out;
  }

  function scambioValido(a,b) {
    if (!a.length || !b.length || a.length !== b.length) return false;
    const ca = conteggioRuoli(a), cb = conteggioRuoli(b);
    return ruoloOrdine.every((r) => ca[r] === cb[r]);
  }

  function sintesiRuoli(lista) {
    const c = conteggioRuoli(lista);
    return ruoloOrdine.filter((r) => c[r]).map((r) => `${c[r]} ${r}`).join(' · ') || 'nessuno';
  }

  function applicaBozzaSuRose(source, bozza) {
    const rosaA = source?.rose?.find((r) => r.squadraId === bozza.squadraAId);
    const rosaB = source?.rose?.find((r) => r.squadraId === bozza.squadraBId);
    if (!rosaA || !rosaB) return { ok:false, error:'Una delle due fantasquadre non esiste più nelle rose.' };
    if (bozza.squadraAId === bozza.squadraBId) return { ok:false, error:'Le due fantasquadre devono essere diverse.' };

    const snapA = Array.isArray(bozza.giocatoriA) ? bozza.giocatoriA : [];
    const snapB = Array.isArray(bozza.giocatoriB) ? bozza.giocatoriB : [];
    if (!scambioValido(snapA, snapB)) return { ok:false, error:'Numero di giocatori o ruoli non corrispondenti.' };

    const findActual = (rosa, snap) => {
      const id = playerIdentity(snap);
      return (rosa.giocatori || []).find((g) => playerIdentity(g) === id) || null;
    };
    const actualA = snapA.map((g) => findActual(rosaA, g));
    const actualB = snapB.map((g) => findActual(rosaB, g));
    const missingA = snapA.filter((_, i) => !actualA[i]).map((g) => g.nome);
    const missingB = snapB.filter((_, i) => !actualB[i]).map((g) => g.nome);
    if (missingA.length || missingB.length) {
      const pezzi = [];
      if (missingA.length) pezzi.push(`${nomeTeam(bozza.squadraAId)} non possiede più: ${missingA.join(', ')}`);
      if (missingB.length) pezzi.push(`${nomeTeam(bozza.squadraBId)} non possiede più: ${missingB.join(', ')}`);
      return { ok:false, error:pezzi.join(' · ') };
    }

    const keysA = new Set(actualA.map(playerIdentity));
    const keysB = new Set(actualB.map(playerIdentity));
    rosaA.giocatori = (rosaA.giocatori || []).filter((g) => !keysA.has(playerIdentity(g))).concat(actualB.map((g) => ({...g})));
    rosaB.giocatori = (rosaB.giocatori || []).filter((g) => !keysB.has(playerIdentity(g))).concat(actualA.map((g) => ({...g})));
    return { ok:true, giocatoriA:actualA.map((g) => ({...g})), giocatoriB:actualB.map((g) => ({...g})) };
  }

  function movimentiConfermati(source = mercatoData) {
    return (source?.movimenti || []).filter((m) => m && (m.tipo || 'scambio') === 'scambio');
  }

  function descriviMovimento(m) {
    const a = (m?.giocatoriA || []).map((g) => g.nome).join(', ') || '—';
    const b = (m?.giocatoriB || []).map((g) => g.nome).join(', ') || '—';
    return `${formatoData(m?.data)} — ${nomeTeam(m?.squadraAId)} (${a}) ⇄ ${nomeTeam(m?.squadraBId)} (${b})`;
  }

  function derivaRosePrimaDelMercato() {
    const virtual = clone(roseData || { rose:[] });
    const movimenti = movimentiConfermati();
    for (let i = movimenti.length - 1; i >= 0; i--) {
      const m = movimenti[i];
      const inverso = {
        squadraAId:m.squadraAId,
        squadraBId:m.squadraBId,
        giocatoriA:(m.giocatoriB || []).map((g) => ({...g})),
        giocatoriB:(m.giocatoriA || []).map((g) => ({...g})),
      };
      const result = applicaBozzaSuRose(virtual, inverso);
      if (!result.ok) {
        return {
          ok:false,
          error:`Non riesco a ricostruire le rose precedenti allo scambio “${descriviMovimento(m)}”. ${result.error} Prima di modificare lo storico verifica che rose.json e mercato.json siano allineati.`,
          movement:m,
          index:i,
        };
      }
    }
    return { ok:true, data:virtual };
  }

  function ricalcolaMovimenti(movimenti) {
    const base = derivaRosePrimaDelMercato();
    if (!base.ok) return base;
    const virtual = clone(base.data);
    const states = [];
    for (let i = 0; i < movimenti.length; i++) {
      const m = movimenti[i];
      const result = applicaBozzaSuRose(virtual, m);
      if (!result.ok) {
        return {
          ok:false,
          error:`Lo scambio successivo #${i + 1} (${descriviMovimento(m)}) non è più applicabile: ${result.error}`,
          movement:m,
          index:i,
          data:virtual,
          states,
        };
      }
      states.push({ movement:m, result });
    }
    return { ok:true, data:virtual, states };
  }

  function rosePrimaDiMovimento(id) {
    const movimenti = movimentiConfermati();
    const index = movimenti.findIndex((m) => m.id === id);
    if (index < 0) return { ok:false, error:'Scambio confermato non trovato.' };
    const base = derivaRosePrimaDelMercato();
    if (!base.ok) return base;
    const virtual = clone(base.data);
    for (let i = 0; i < index; i++) {
      const result = applicaBozzaSuRose(virtual, movimenti[i]);
      if (!result.ok) {
        return {
          ok:false,
          error:`Non riesco a ricostruire le rose prima dello scambio da modificare. Lo scambio precedente #${i + 1} (${descriviMovimento(movimenti[i])}) non è applicabile: ${result.error}`,
        };
      }
    }
    return { ok:true, data:virtual, index, movement:movimenti[index] };
  }

  async function salvaMercatoERose(nuovoMercato, nuoveRose, messaggioMercato, messaggioRose) {
    const stato = document.getElementById('mercato-stato');
    const mercatoPrecedente = clone(mercatoData || {_leggimi:'Storico mercato Hertavernello',movimenti:[]});
    let mercatoSalvato = false;
    try {
      stato.textContent = 'Salvo lo storico mercato aggiornato…';
      await hv_ghSalvaJSON('data/mercato.json', nuovoMercato, messaggioMercato, config, (sec) => {
        stato.textContent = `Attendo il turno GitHub per lo storico mercato: ${sec}s…`;
      });
      mercatoSalvato = true;
      stato.textContent = 'Storico salvato. Ora ricalcolo e salvo le rose…';
      await hv_ghSalvaJSON('data/rose.json', nuoveRose, messaggioRose, config, (sec) => {
        stato.textContent = `Storico salvato. Attendo il turno GitHub per le rose: ${sec}s…`;
      });
    } catch (err) {
      if (mercatoSalvato) {
        try {
          await hv_ghSalvaJSON('data/mercato.json', mercatoPrecedente, 'Ripristina storico mercato dopo errore aggiornamento rose', config);
        } catch {}
      }
      throw err;
    }
    mercatoData = nuovoMercato;
    roseData = nuoveRose;
  }

  function validaSequenza(limit = bozze.length) {
    const virtual = clone(roseData || { rose:[] });
    const states = new Map();
    const applied = new Map();
    let blocked = false;
    const max = Math.min(limit, bozze.length);

    for (let i = 0; i < max; i++) {
      const b = bozze[i];
      if (blocked) {
        states.set(b.id, { valid:false, error:'Bloccata da una bozza precedente da correggere.' });
        continue;
      }
      const result = applicaBozzaSuRose(virtual, b);
      if (!result.ok) {
        states.set(b.id, { valid:false, error:result.error });
        blocked = true;
      } else {
        states.set(b.id, { valid:true, error:'' });
        applied.set(b.id, result);
      }
    }
    return { data:virtual, states, applied, valid:!blocked };
  }

  function aggiornaFormBase() {
    if (editingConfirmedId) {
      const result = rosePrimaDiMovimento(editingConfirmedId);
      formRoseData = result.ok ? result.data : clone(roseData || {rose:[]});
      formBaseErrors = result.ok ? [] : [result.error];
      return;
    }
    if (editingDraftId) {
      const index = bozze.findIndex((b) => b.id === editingDraftId);
      const result = validaSequenza(index < 0 ? bozze.length : index);
      formRoseData = result.data;
      formBaseErrors = result.valid ? [] : Array.from(result.states.values()).filter((s) => !s.valid).map((s) => s.error);
    } else {
      const result = validaSequenza();
      formRoseData = result.data;
      formBaseErrors = result.valid ? [] : Array.from(result.states.values()).filter((s) => !s.valid).map((s) => s.error);
    }
  }

  function renderRosa(side) {
    const select = document.getElementById(`mercato-squadra-${side}`);
    const wrap = document.getElementById(`mercato-rosa-${side}`);
    const rosa = rosaById(select.value);
    wrap.innerHTML = '';
    if (!rosa) {
      wrap.innerHTML = '<p class="empty-state">Seleziona una fantasquadra.</p>';
      aggiornaRiepilogo();
      return;
    }
    ruoloOrdine.forEach((ruolo) => {
      const gruppo = document.createElement('fieldset');
      gruppo.className = 'mercato-role-group';
      gruppo.innerHTML = `<legend>${ruoloLabel[ruolo]}</legend>`;
      const giocatori = (rosa.giocatori || []).map((g, index) => ({g,index})).filter(({g}) => g.ruolo === ruolo);
      if (!giocatori.length) gruppo.insertAdjacentHTML('beforeend', '<p class="muted">Nessun giocatore.</p>');
      giocatori.forEach(({g,index}) => {
        const label = document.createElement('label');
        label.className = 'mercato-player-check';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.dataset.side = side;
        input.dataset.key = playerKey(g,index);
        input.dataset.identity = playerIdentity(g);
        input.dataset.index = String(index);
        input.dataset.ruolo = g.ruolo;
        input.dataset.nome = g.nome;
        input.addEventListener('change', aggiornaRiepilogo);
        const span = document.createElement('span');
        span.innerHTML = `<strong>${esc(g.nome)}</strong><small>${esc(g.ruolo)}${g.squadraReale ? ` · ${esc(g.squadraReale)}` : ''}</small>`;
        label.append(input, span);
        gruppo.appendChild(label);
      });
      wrap.appendChild(gruppo);
    });
    aggiornaRiepilogo();
  }

  function selezionati(side) {
    return Array.from(document.querySelectorAll(`#mercato-rosa-${side} input[type="checkbox"]:checked`)).map((el) => ({
      index: Number(el.dataset.index), ruolo: el.dataset.ruolo, nome: el.dataset.nome, identity: el.dataset.identity,
    }));
  }

  function aggiornaRiepilogo() {
    const a = selezionati('a'), b = selezionati('b');
    const idA = document.getElementById('mercato-squadra-a').value;
    const idB = document.getElementById('mercato-squadra-b').value;
    const validoForm = Boolean(idA && idB && idA !== idB && scambioValido(a,b));
    const baseOk = formBaseErrors.length === 0;
    const valido = validoForm && baseOk;
    const wrap = document.getElementById('mercato-riepilogo');
    wrap.innerHTML = `
      <div><strong>${esc(nomeTeam(idA) || 'Squadra A')}</strong><span>${a.map((g)=>esc(g.nome)).join(', ') || 'Nessun giocatore'}</span><small>${sintesiRuoli(a)}</small></div>
      <div class="mercato-riepilogo-vs">⇄</div>
      <div><strong>${esc(nomeTeam(idB) || 'Squadra B')}</strong><span>${b.map((g)=>esc(g.nome)).join(', ') || 'Nessun giocatore'}</span><small>${sintesiRuoli(b)}</small></div>`;
    wrap.classList.toggle('is-valid', valido);
    const btn = document.getElementById('mercato-conferma');
    btn.disabled = !valido;
    btn.textContent = editingConfirmedId ? 'Aggiorna scambio confermato' : (editingDraftId ? 'Aggiorna bozza' : 'Aggiungi alla lista');
    if (!baseOk) {
      const stato = document.getElementById('mercato-stato');
      stato.style.color = 'var(--wine-bright)';
      stato.textContent = 'Prima correggi una bozza precedente non valida: le rose temporanee non possono essere calcolate correttamente.';
    }
  }

  function draftFromForm(existing = null) {
    const idA = document.getElementById('mercato-squadra-a').value;
    const idB = document.getElementById('mercato-squadra-b').value;
    const data = document.getElementById('mercato-data').value;
    const selA = selezionati('a'), selB = selezionati('b');
    const rosaA = rosaById(idA), rosaB = rosaById(idB);
    if (!data) throw new Error('Scegli la data dello scambio.');
    if (!idA || !idB || idA === idB) throw new Error('Scegli due fantasquadre diverse.');
    if (!scambioValido(selA, selB)) throw new Error('Lo scambio deve avere lo stesso numero di giocatori e gli stessi ruoli.');
    if (!rosaA || !rosaB) throw new Error('Non riesco a leggere una delle due rose.');
    const giocA = selA.map((s) => rosaA.giocatori[s.index]).filter(Boolean).map((g) => ({...g}));
    const giocB = selB.map((s) => rosaB.giocatori[s.index]).filter(Boolean).map((g) => ({...g}));
    if (giocA.length !== selA.length || giocB.length !== selB.length) throw new Error('Uno dei giocatori selezionati non è più disponibile.');
    const now = new Date().toISOString();
    return {
      id: existing?.id || `bozza_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      data,
      squadraAId:idA,
      squadraBId:idB,
      giocatoriA:giocA,
      giocatoriB:giocB,
      creatoIl: existing?.creatoIl || now,
      aggiornatoIl: now,
    };
  }

  function resetForm({ keepDate = true } = {}) {
    const dataCorrente = document.getElementById('mercato-data')?.value || oggiLocale();
    editingDraftId = null;
    editingConfirmedId = null;
    aggiornaFormBase();
    const a = document.getElementById('mercato-squadra-a');
    const b = document.getElementById('mercato-squadra-b');
    a.innerHTML = opzioniSquadre();
    b.innerHTML = opzioniSquadre();
    a.value = '';
    b.value = '';
    document.getElementById('mercato-data').value = keepDate ? dataCorrente : oggiLocale();
    document.getElementById('mercato-annulla-modifica').hidden = true;
    renderRosa('a');
    renderRosa('b');
    aggiornaRiepilogo();
  }

  function movimentoConfermatoFromForm(existing) {
    const temp = draftFromForm({
      id: existing?.bozzaId || existing?.id || `storico_${Date.now()}`,
      creatoIl: existing?.creatoIl,
    });
    return {
      ...existing,
      tipo:'scambio',
      data:temp.data,
      squadraAId:temp.squadraAId,
      squadraBId:temp.squadraBId,
      giocatoriA:temp.giocatoriA,
      giocatoriB:temp.giocatoriB,
      aggiornatoIl:new Date().toISOString(),
    };
  }

  async function aggiornaScambioConfermatoDaForm() {
    const stato = document.getElementById('mercato-stato');
    const btn = document.getElementById('mercato-conferma');
    const existing = (mercatoData?.movimenti || []).find((m) => m.id === editingConfirmedId);
    if (!existing) throw new Error('Lo scambio confermato da modificare non esiste più nello storico.');
    if (formBaseErrors.length) throw new Error(formBaseErrors[0]);

    const aggiornato = movimentoConfermatoFromForm(existing);
    const nuovoMercato = clone(mercatoData || {_leggimi:'Storico mercato Hertavernello',movimenti:[]});
    const idx = (nuovoMercato.movimenti || []).findIndex((m) => m.id === existing.id);
    if (idx < 0) throw new Error('Non riesco a trovare lo scambio nello storico da aggiornare.');
    nuovoMercato.movimenti[idx] = aggiornato;

    const replay = ricalcolaMovimenti(movimentiConfermati(nuovoMercato));
    if (!replay.ok) {
      throw new Error(`Modifica bloccata per evitare rose incoerenti. ${replay.error}`);
    }

    const prima = descriviMovimento(existing);
    const dopo = descriviMovimento(aggiornato);
    if (!confirm(`Confermare la modifica dello scambio già applicato?\n\nPRIMA\n${prima}\n\nDOPO\n${dopo}\n\nLe rose verranno ricostruite e tutti gli scambi successivi saranno ricalcolati.`)) return;

    btn.disabled = true;
    stato.style.color = 'var(--text-muted)';
    await salvaMercatoERose(
      nuovoMercato,
      replay.data,
      `Modifica scambio mercato ${formatoData(aggiornato.data)}`,
      'Ricalcola rose dopo modifica scambio mercato'
    );

    resetForm({ keepDate:true });
    renderStorico();
    renderBozze();
    const draftCheck = validaSequenza();
    stato.style.color = draftCheck.valid ? 'var(--verde-prato)' : 'var(--giallo-neon)';
    stato.textContent = draftCheck.valid
      ? 'Scambio confermato aggiornato ✓ — rose e scambi successivi sono stati ricalcolati.'
      : 'Scambio aggiornato ✓. Attenzione: una o più bozze ora risultano incompatibili e vanno corrette prima di applicarle.';
  }

  function caricaScambioConfermatoInForm(id) {
    const movimento = (mercatoData?.movimenti || []).find((m) => m.id === id);
    if (!movimento) return;
    editingDraftId = null;
    editingConfirmedId = id;
    aggiornaFormBase();
    if (formBaseErrors.length) {
      const stato = document.getElementById('mercato-stato');
      stato.style.color = 'var(--wine-bright)';
      stato.textContent = formBaseErrors[0];
      editingConfirmedId = null;
      aggiornaFormBase();
      return;
    }

    const a = document.getElementById('mercato-squadra-a');
    const b = document.getElementById('mercato-squadra-b');
    a.innerHTML = opzioniSquadre(movimento.squadraBId);
    a.value = movimento.squadraAId;
    b.innerHTML = opzioniSquadre(movimento.squadraAId);
    b.value = movimento.squadraBId;
    document.getElementById('mercato-data').value = movimento.data || oggiLocale();
    renderRosa('a');
    renderRosa('b');

    const keysA = new Set((movimento.giocatoriA || []).map(playerIdentity));
    const keysB = new Set((movimento.giocatoriB || []).map(playerIdentity));
    document.querySelectorAll('#mercato-rosa-a input[type="checkbox"]').forEach((el) => { el.checked = keysA.has(el.dataset.identity); });
    document.querySelectorAll('#mercato-rosa-b input[type="checkbox"]').forEach((el) => { el.checked = keysB.has(el.dataset.identity); });
    document.getElementById('mercato-annulla-modifica').hidden = false;
    aggiornaRiepilogo();

    const stato = document.getElementById('mercato-stato');
    stato.style.color = 'var(--giallo-neon)';
    stato.textContent = 'Stai modificando uno scambio già confermato. Al salvataggio le rose verranno ricostruite e gli scambi successivi ricalcolati automaticamente.';
    document.getElementById('admin-mercato-panel')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  async function eliminaScambioConfermato(id) {
    const stato = document.getElementById('mercato-stato');
    const movimento = (mercatoData?.movimenti || []).find((m) => m.id === id);
    if (!movimento) return;

    const nuovoMercato = clone(mercatoData || {_leggimi:'Storico mercato Hertavernello',movimenti:[]});
    const idx = (nuovoMercato.movimenti || []).findIndex((m) => m.id === id);
    if (idx < 0) return;
    nuovoMercato.movimenti.splice(idx, 1);

    const replay = ricalcolaMovimenti(movimentiConfermati(nuovoMercato));
    if (!replay.ok) {
      const msg = `Non posso eliminare questo scambio perché renderebbe incompatibile uno scambio successivo.\n\n${replay.error}\n\nModifica o elimina prima lo scambio indicato, poi riprova.`;
      alert(msg);
      stato.style.color = 'var(--wine-bright)';
      stato.textContent = msg.replace(/\n+/g, ' ');
      return;
    }

    if (!confirm(`Eliminare definitivamente questo scambio dalla cronologia pubblica?\n\n${descriviMovimento(movimento)}\n\nLe rose verranno riportate allo stato corretto come se questo scambio non fosse mai avvenuto, poi tutti gli scambi successivi verranno riapplicati. Una copia resterà nello storico Admin come “Annullato”.`)) return;

    if (!Array.isArray(nuovoMercato.annullati)) nuovoMercato.annullati = [];
    nuovoMercato.annullati.push({
      ...clone(movimento),
      stato:'annullato',
      annullatoIl:new Date().toISOString(),
      motivoAnnullamento:'Eliminato da Admin',
    });

    stato.style.color = 'var(--text-muted)';
    try {
      await salvaMercatoERose(
        nuovoMercato,
        replay.data,
        `Annulla scambio mercato ${formatoData(movimento.data)}`,
        'Ricalcola rose dopo annullamento scambio mercato'
      );
      resetForm({ keepDate:true });
      renderStorico();
      renderBozze();
      const draftCheck = validaSequenza();
      stato.style.color = draftCheck.valid ? 'var(--verde-prato)' : 'var(--giallo-neon)';
      stato.textContent = draftCheck.valid
        ? 'Scambio annullato ✓ — rimosso dalla cronologia pubblica e conservato nello storico Admin.'
        : 'Scambio annullato ✓. Attenzione: una o più bozze sono diventate incompatibili e vanno corrette.';
    } catch (err) {
      stato.style.color = 'var(--wine-bright)';
      stato.textContent = `Errore durante l’annullamento: ${err.message}`;
    }
  }

  async function aggiungiOAggiornaBozza() {
    const stato = document.getElementById('mercato-stato');
    stato.style.color = 'var(--text-muted)';
    if (editingConfirmedId) {
      try {
        await aggiornaScambioConfermatoDaForm();
      } catch (err) {
        stato.style.color = 'var(--wine-bright)';
        stato.textContent = err.message;
        aggiornaRiepilogo();
      }
      return;
    }
    try {
      if (formBaseErrors.length) throw new Error('Correggi prima la bozza precedente segnalata come non valida.');
      const index = editingDraftId ? bozze.findIndex((b) => b.id === editingDraftId) : -1;
      const existing = index >= 0 ? bozze[index] : null;
      const draft = draftFromForm(existing);
      if (index >= 0) bozze[index] = draft;
      else bozze.push(draft);
      salvaBozzeLocali();
      renderBozze();
      stato.style.color = 'var(--verde-prato)';
      stato.textContent = index >= 0
        ? 'Bozza aggiornata ✓. Controlla la lista oppure prepara un nuovo scambio.'
        : 'Bozza aggiunta ✓. Le rose non sono ancora state modificate: puoi preparare il prossimo scambio.';
      resetForm({ keepDate:true });
    } catch (err) {
      stato.style.color = 'var(--wine-bright)';
      stato.textContent = err.message;
    }
  }

  function caricaBozzaInForm(id) {
    const draft = bozze.find((b) => b.id === id);
    if (!draft) return;
    editingConfirmedId = null;
    editingDraftId = id;
    aggiornaFormBase();
    if (formBaseErrors.length) {
      const stato = document.getElementById('mercato-stato');
      stato.style.color = 'var(--wine-bright)';
      stato.textContent = 'Questa bozza dipende da una bozza precedente non valida. Correggi prima quella che viene prima nella lista.';
      editingDraftId = null;
      aggiornaFormBase();
      return;
    }

    const a = document.getElementById('mercato-squadra-a');
    const b = document.getElementById('mercato-squadra-b');
    a.innerHTML = opzioniSquadre(draft.squadraBId);
    a.value = draft.squadraAId;
    b.innerHTML = opzioniSquadre(draft.squadraAId);
    b.value = draft.squadraBId;
    document.getElementById('mercato-data').value = draft.data || oggiLocale();
    renderRosa('a');
    renderRosa('b');

    const keysA = new Set((draft.giocatoriA || []).map(playerIdentity));
    const keysB = new Set((draft.giocatoriB || []).map(playerIdentity));
    document.querySelectorAll('#mercato-rosa-a input[type="checkbox"]').forEach((el) => { el.checked = keysA.has(el.dataset.identity); });
    document.querySelectorAll('#mercato-rosa-b input[type="checkbox"]').forEach((el) => { el.checked = keysB.has(el.dataset.identity); });
    document.getElementById('mercato-annulla-modifica').hidden = false;
    const stato = document.getElementById('mercato-stato');
    stato.style.color = 'var(--giallo-neon)';
    stato.textContent = 'Stai modificando una bozza: puoi cambiare data, squadre e giocatori. Premi “Aggiorna bozza” per salvare.';
    aggiornaRiepilogo();
    document.getElementById('admin-mercato-panel')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function eliminaBozza(id) {
    const draft = bozze.find((b) => b.id === id);
    if (!draft) return;
    const testo = `${formatoData(draft.data)} — ${nomeTeam(draft.squadraAId)} ⇄ ${nomeTeam(draft.squadraBId)}`;
    if (!confirm(`Eliminare questa bozza?\n\n${testo}\n\nLe rose del sito non verranno modificate.`)) return;
    bozze = bozze.filter((b) => b.id !== id);
    salvaBozzeLocali();
    if (editingDraftId === id) resetForm({ keepDate:true });
    else {
      aggiornaFormBase();
      renderRosa('a');
      renderRosa('b');
    }
    renderBozze();
    const stato = document.getElementById('mercato-stato');
    stato.style.color = 'var(--text-muted)';
    stato.textContent = 'Bozza eliminata. Nessuna rosa è stata modificata.';
  }

  function renderBozze() {
    const wrap = document.getElementById('mercato-bozze');
    const count = document.getElementById('mercato-bozze-count');
    const apply = document.getElementById('mercato-applica-tutti');
    if (!wrap || !count || !apply) return;
    const validation = validaSequenza();
    count.textContent = `${bozze.length} ${bozze.length === 1 ? 'bozza' : 'bozze'}`;
    apply.disabled = !bozze.length || !validation.valid;

    if (!bozze.length) {
      wrap.innerHTML = '<p class="empty-state">Nessuno scambio in attesa. Aggiungi una bozza e continua a preparare gli altri scambi.</p>';
      return;
    }

    wrap.innerHTML = bozze.map((b, index) => {
      const st = validation.states.get(b.id) || { valid:false, error:'Bozza non verificata.' };
      const a = (b.giocatoriA || []).map((g) => g.nome).join(', ');
      const bb = (b.giocatoriB || []).map((g) => g.nome).join(', ');
      return `<article class="mercato-draft-card ${st.valid ? 'is-valid' : 'is-error'}" data-draft-id="${esc(b.id)}">
        <div class="mercato-draft-top">
          <div><span class="mercato-draft-num">#${index + 1}</span><strong>${esc(formatoData(b.data))}</strong></div>
          <span class="mercato-draft-status">${st.valid ? 'Pronta' : 'Da correggere'}</span>
        </div>
        <div class="mercato-draft-exchange">
          <div><strong>${esc(nomeTeam(b.squadraAId))}</strong><span>${esc(a)}</span></div>
          <b>⇄</b>
          <div><strong>${esc(nomeTeam(b.squadraBId))}</strong><span>${esc(bb)}</span></div>
        </div>
        ${st.valid ? '' : `<p class="mercato-draft-error">${esc(st.error)}</p>`}
        <div class="mercato-draft-actions">
          <button type="button" class="mercato-draft-edit" data-id="${esc(b.id)}">✏️ Modifica</button>
          <button type="button" class="mercato-draft-delete" data-id="${esc(b.id)}">🗑️ Elimina</button>
        </div>
      </article>`;
    }).join('');

    wrap.querySelectorAll('.mercato-draft-edit').forEach((btn) => btn.addEventListener('click', () => caricaBozzaInForm(btn.dataset.id)));
    wrap.querySelectorAll('.mercato-draft-delete').forEach((btn) => btn.addEventListener('click', () => eliminaBozza(btn.dataset.id)));
  }

  function renderStorico() {
    const wrap = document.getElementById('mercato-storico-admin');
    if (!wrap) return;
    const mov = [...movimentiConfermati()];
    const annullati = [...(mercatoData?.annullati || [])].sort((a,b) => String(b.annullatoIl || '').localeCompare(String(a.annullatoIl || '')));

    const confermatiHtml = mov.length
      ? mov.map((m, index) => {
          const a = (m.giocatoriA || []).map((g)=>g.nome).join(', ');
          const b = (m.giocatoriB || []).map((g)=>g.nome).join(', ');
          return `<article class="mercato-confirmed-card" data-confirmed-id="${esc(m.id)}">
            <div class="mercato-confirmed-main">
              <div class="mercato-confirmed-meta"><span>#${index + 1}</span><strong>${esc(formatoData(m.data))}</strong><em>Confermato</em></div>
              <div class="mercato-confirmed-exchange">
                <div><strong>${esc(nomeTeam(m.squadraAId))}</strong><span>${esc(a)}</span></div>
                <b>⇄</b>
                <div><strong>${esc(nomeTeam(m.squadraBId))}</strong><span>${esc(b)}</span></div>
              </div>
            </div>
            <div class="mercato-confirmed-actions">
              <button type="button" class="mercato-confirmed-edit" data-id="${esc(m.id)}">✏️ Modifica</button>
              <button type="button" class="mercato-confirmed-delete" data-id="${esc(m.id)}">🗑️ Elimina</button>
            </div>
          </article>`;
        }).join('')
      : '<p class="empty-state">Nessuno scambio confermato.</p>';

    const annullatiHtml = annullati.length
      ? `<details class="mercato-cancelled-wrap">
          <summary>Storico annullati <span>${annullati.length}</span></summary>
          <div class="mercato-cancelled-list">${annullati.map((m) => {
            const a = (m.giocatoriA || []).map((g)=>g.nome).join(', ');
            const b = (m.giocatoriB || []).map((g)=>g.nome).join(', ');
            return `<div class="mercato-cancelled-row">
              <div><strong>${esc(formatoData(m.data))}</strong><span class="mercato-cancelled-badge">Annullato</span></div>
              <span>${esc(nomeTeam(m.squadraAId))}: ${esc(a)}</span>
              <span>⇄ ${esc(nomeTeam(m.squadraBId))}: ${esc(b)}</span>
              <small>Annullato il ${esc(m.annullatoIl ? new Date(m.annullatoIl).toLocaleString('it-IT') : '—')}</small>
            </div>`;
          }).join('')}</div>
        </details>`
      : '';

    wrap.innerHTML = `
      <div class="mercato-confirmed-head">
        <div><h3>Scambi confermati</h3><p>Puoi modificare o annullare anche gli scambi già applicati. Le rose vengono ricostruite automaticamente e gli scambi successivi ricalcolati.</p></div>
        <span>${mov.length}</span>
      </div>
      <div class="mercato-confirmed-list">${confermatiHtml}</div>
      ${annullatiHtml}`;

    wrap.querySelectorAll('.mercato-confirmed-edit').forEach((btn) => btn.addEventListener('click', () => caricaScambioConfermatoInForm(btn.dataset.id)));
    wrap.querySelectorAll('.mercato-confirmed-delete').forEach((btn) => btn.addEventListener('click', () => eliminaScambioConfermato(btn.dataset.id)));
  }

  function apriRiepilogoFinale() {
    const validation = validaSequenza();
    const stato = document.getElementById('mercato-stato');
    if (!bozze.length) return;
    if (!validation.valid) {
      stato.style.color = 'var(--wine-bright)';
      stato.textContent = 'Ci sono bozze da correggere. Apri quelle segnate in rosso prima di applicare gli scambi.';
      renderBozze();
      return;
    }
    const list = document.getElementById('mercato-final-list');
    list.innerHTML = bozze.map((b, i) => `<div class="mercato-final-row">
      <strong>${i + 1}. ${esc(formatoData(b.data))}</strong>
      <span>${esc(nomeTeam(b.squadraAId))} cede: ${esc((b.giocatoriA || []).map((g)=>g.nome).join(', '))}</span>
      <span>${esc(nomeTeam(b.squadraBId))} cede: ${esc((b.giocatoriB || []).map((g)=>g.nome).join(', '))}</span>
    </div>`).join('');
    const modal = document.getElementById('mercato-final-modal');
    modal.hidden = false;
    document.body.classList.add('mercato-modal-open');
    document.getElementById('mercato-final-confirm')?.focus();
  }

  function chiudiRiepilogoFinale() {
    document.getElementById('mercato-final-modal').hidden = true;
    document.body.classList.remove('mercato-modal-open');
  }

  async function applicaTutteLeBozze() {
    const stato = document.getElementById('mercato-stato');
    const btn = document.getElementById('mercato-final-confirm');
    const applyBtn = document.getElementById('mercato-applica-tutti');
    const validation = validaSequenza();
    if (!bozze.length || !validation.valid) {
      chiudiRiepilogoFinale();
      renderBozze();
      return;
    }

    btn.disabled = true;
    applyBtn.disabled = true;
    stato.style.color = 'var(--text-muted)';
    try {
      const nuoveRose = validation.data;
      const nuovoMercato = clone(mercatoData || {_leggimi:'Storico mercato Hertavernello',movimenti:[]});
      if (!Array.isArray(nuovoMercato.movimenti)) nuovoMercato.movimenti = [];
      const existingDraftIds = new Set(nuovoMercato.movimenti.map((m) => m.bozzaId).filter(Boolean));
      const now = new Date().toISOString();

      bozze.forEach((b) => {
        if (existingDraftIds.has(b.id)) return;
        const applied = validation.applied.get(b.id);
        nuovoMercato.movimenti.push({
          id: `scambio_${b.id.replace(/^bozza_/, '')}`,
          bozzaId: b.id,
          tipo:'scambio',
          data:b.data,
          squadraAId:b.squadraAId,
          squadraBId:b.squadraBId,
          giocatoriA:(applied?.giocatoriA || b.giocatoriA || []).map((g)=>({...g})),
          giocatoriB:(applied?.giocatoriB || b.giocatoriB || []).map((g)=>({...g})),
          creatoIl:b.creatoIl || now,
          aggiornatoIl:b.aggiornatoIl || now,
          applicatoIl:now,
        });
      });

      stato.textContent = `Applico ${bozze.length} scambi: salvo prima lo storico mercato…`;
      await hv_ghSalvaJSON('data/mercato.json', nuovoMercato, `Applica ${bozze.length} scambi mercato`, config, (sec) => {
        stato.textContent = `Attendo il turno GitHub per lo storico mercato: ${sec}s…`;
      });
      mercatoData = nuovoMercato;

      stato.textContent = 'Storico salvato. Ora aggiorno tutte le rose in un unico salvataggio…';
      await hv_ghSalvaJSON('data/rose.json', nuoveRose, `Aggiorna rose con ${bozze.length} scambi mercato`, config, (sec) => {
        stato.textContent = `Storico salvato. Attendo il turno GitHub per aggiornare le rose: ${sec}s…`;
      });
      roseData = nuoveRose;

      bozze = [];
      salvaBozzeLocali();
      chiudiRiepilogoFinale();
      resetForm({ keepDate:true });
      renderBozze();
      renderStorico();
      stato.style.color = 'var(--verde-prato)';
      stato.textContent = 'Tutti gli scambi applicati ✓ — rose e storico mercato sono aggiornati.';
    } catch (err) {
      chiudiRiepilogoFinale();
      stato.style.color = 'var(--wine-bright)';
      stato.textContent = `Errore durante l'applicazione: ${err.message}. Le bozze restano salvate nel browser, quindi puoi riprovare senza reinserirle.`;
      renderBozze();
    } finally {
      btn.disabled = false;
      applyBtn.disabled = !bozze.length || !validaSequenza().valid;
    }
  }

  function injectUI() {
    if (document.getElementById('mercato-bozze-wrap')) return;
    const panel = document.getElementById('admin-mercato-panel');
    const conferma = document.getElementById('mercato-conferma');
    const storico = document.getElementById('mercato-storico-admin');
    if (!panel || !conferma || !storico) return;

    conferma.textContent = 'Aggiungi alla lista';
    const annulla = document.createElement('button');
    annulla.type = 'button';
    annulla.id = 'mercato-annulla-modifica';
    annulla.hidden = true;
    annulla.className = 'mercato-secondary-btn';
    annulla.textContent = 'Annulla modifica';
    conferma.insertAdjacentElement('afterend', annulla);

    const draftsWrap = document.createElement('section');
    draftsWrap.id = 'mercato-bozze-wrap';
    draftsWrap.className = 'mercato-bozze-wrap';
    draftsWrap.innerHTML = `
      <div class="mercato-bozze-head">
        <div><h3>Scambi da applicare</h3><p>Le bozze restano salvate in questo browser anche se ricarichi o chiudi la pagina.</p></div>
        <span id="mercato-bozze-count" class="mercato-bozze-count">0 bozze</span>
      </div>
      <div id="mercato-bozze"></div>
      <div class="mercato-bozze-footer">
        <button type="button" id="mercato-applica-tutti" disabled>Applica tutti gli scambi</button>
        <small>Le rose del sito cambiano soltanto dopo questa conferma finale.</small>
      </div>`;
    storico.insertAdjacentElement('beforebegin', draftsWrap);

    const modal = document.createElement('div');
    modal.id = 'mercato-final-modal';
    modal.className = 'mercato-final-modal';
    modal.hidden = true;
    modal.innerHTML = `<div class="mercato-final-backdrop" data-close="1"></div>
      <div class="mercato-final-dialog" role="dialog" aria-modal="true" aria-labelledby="mercato-final-title">
        <h3 id="mercato-final-title">Conferma tutti gli scambi</h3>
        <p>Controlla il riepilogo. Dopo la conferma verranno aggiornati insieme lo storico mercato e le rose del sito.</p>
        <div id="mercato-final-list" class="mercato-final-list"></div>
        <div class="mercato-final-actions">
          <button type="button" id="mercato-final-cancel" class="mercato-secondary-btn">Torna alle bozze</button>
          <button type="button" id="mercato-final-confirm">Conferma e applica</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const style = document.createElement('style');
    style.id = 'hv-mercato-bozze-style';
    style.textContent = `
      .mercato-secondary-btn{margin-left:8px!important;background:var(--bg-card-2)!important;color:var(--text-primary)!important;border:1px solid var(--border-hairline)!important}
      .mercato-bozze-wrap{margin:22px 0 18px;padding:16px;border:1px solid var(--border-hairline);border-radius:14px;background:var(--bg-void)}
      .mercato-bozze-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}
      .mercato-bozze-head h3{margin:0 0 4px;font-size:15px}.mercato-bozze-head p{margin:0;color:var(--text-muted);font-size:12px;line-height:1.45}
      .mercato-bozze-count{flex:0 0 auto;padding:5px 9px;border:1px solid var(--border-hairline);border-radius:999px;color:var(--text-muted);font-size:11px;font-weight:800}
      #mercato-bozze{display:grid;gap:10px}.mercato-draft-card{padding:12px;border:1px solid var(--border-hairline);border-radius:12px;background:var(--bg-card)}
      .mercato-draft-card.is-valid{border-color:rgba(92,214,113,.45)}.mercato-draft-card.is-error{border-color:var(--wine-bright)}
      .mercato-draft-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}.mercato-draft-top>div{display:flex;align-items:center;gap:8px}
      .mercato-draft-num{font-family:var(--font-mono);font-size:11px;color:var(--text-muted)}.mercato-draft-status{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:var(--verde-prato)}
      .mercato-draft-card.is-error .mercato-draft-status{color:var(--wine-bright)}
      .mercato-draft-exchange{display:grid;grid-template-columns:minmax(0,1fr) 26px minmax(0,1fr);gap:8px;align-items:center}.mercato-draft-exchange>div{display:flex;flex-direction:column;gap:3px;min-width:0}.mercato-draft-exchange span{font-size:12px;color:var(--text-muted);overflow-wrap:anywhere}.mercato-draft-exchange b{text-align:center;color:var(--giallo-neon)}
      .mercato-draft-error{margin:9px 0 0;color:var(--wine-bright);font-size:11.5px}.mercato-draft-actions{display:flex;gap:7px;justify-content:flex-end;margin-top:10px}.mercato-draft-actions button{padding:7px 10px!important;font-size:11px!important}.mercato-draft-delete{background:transparent!important;color:var(--wine-bright)!important;border:1px solid var(--wine)!important}
      .mercato-bozze-footer{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid var(--border-hairline)}.mercato-bozze-footer small{color:var(--text-muted);font-size:11px}.mercato-bozze-footer button:disabled{opacity:.45;cursor:not-allowed}
      .mercato-final-modal[hidden]{display:none!important}.mercato-final-modal{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:18px}.mercato-final-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72)}
      .mercato-final-dialog{position:relative;width:min(680px,100%);max-height:min(82vh,760px);overflow:auto;padding:20px;border:1px solid var(--border-hairline);border-radius:16px;background:var(--bg-card);box-shadow:0 24px 80px rgba(0,0,0,.45)}.mercato-final-dialog h3{margin:0 0 6px}.mercato-final-dialog>p{margin:0 0 14px;color:var(--text-muted);font-size:12px;line-height:1.5}
      .mercato-final-list{display:grid;gap:9px}.mercato-final-row{display:grid;gap:4px;padding:10px 12px;border:1px solid var(--border-hairline);border-radius:11px;background:var(--bg-void);font-size:12px}.mercato-final-row span{color:var(--text-muted)}
      .mercato-final-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:16px}.mercato-modal-open{overflow:hidden}
      .mercato-confirmed-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin:22px 0 12px;padding-top:18px;border-top:1px solid var(--border-hairline)}
      .mercato-confirmed-head h3{margin:0 0 4px;font-size:15px}.mercato-confirmed-head p{margin:0;color:var(--text-muted);font-size:12px;line-height:1.45;max-width:760px}.mercato-confirmed-head>span{flex:0 0 auto;padding:5px 9px;border:1px solid var(--border-hairline);border-radius:999px;color:var(--text-muted);font-size:11px;font-weight:800}
      .mercato-confirmed-list{display:grid;gap:10px}.mercato-confirmed-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px;border:1px solid var(--border-hairline);border-radius:12px;background:var(--bg-card)}
      .mercato-confirmed-meta{display:flex;align-items:center;gap:8px;margin-bottom:8px}.mercato-confirmed-meta span{font-family:var(--font-mono);font-size:10px;color:var(--text-muted)}.mercato-confirmed-meta em{font-style:normal;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:var(--verde-prato);padding:3px 6px;border:1px solid rgba(92,214,113,.35);border-radius:999px}
      .mercato-confirmed-exchange{display:grid;grid-template-columns:minmax(0,1fr) 26px minmax(0,1fr);gap:8px;align-items:center}.mercato-confirmed-exchange>div{display:flex;flex-direction:column;gap:3px;min-width:0}.mercato-confirmed-exchange span{font-size:12px;color:var(--text-muted);overflow-wrap:anywhere}.mercato-confirmed-exchange b{text-align:center;color:var(--giallo-neon)}
      .mercato-confirmed-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.mercato-confirmed-actions button{padding:7px 10px!important;font-size:11px!important}.mercato-confirmed-delete{background:transparent!important;color:var(--wine-bright)!important;border:1px solid var(--wine)!important}
      .mercato-cancelled-wrap{margin-top:14px;border:1px solid var(--border-hairline);border-radius:12px;background:var(--bg-void);overflow:hidden}.mercato-cancelled-wrap summary{cursor:pointer;list-style:none;padding:11px 12px;font-size:12px;font-weight:800;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center}.mercato-cancelled-wrap summary::-webkit-details-marker{display:none}.mercato-cancelled-wrap summary span{font-size:10px;padding:3px 7px;border:1px solid var(--border-hairline);border-radius:999px}
      .mercato-cancelled-list{display:grid;gap:8px;padding:0 10px 10px}.mercato-cancelled-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px 12px;align-items:center;padding:9px 10px;border:1px solid var(--border-hairline);border-radius:10px;background:var(--bg-card);font-size:11px}.mercato-cancelled-row>div{display:flex;gap:7px;align-items:center}.mercato-cancelled-row small{grid-column:1/-1;color:var(--text-muted)}.mercato-cancelled-badge{font-size:9px;font-weight:900;text-transform:uppercase;color:var(--wine-bright);border:1px solid var(--wine);border-radius:999px;padding:2px 5px}
      @media(max-width:720px){.mercato-bozze-head,.mercato-confirmed-head{flex-direction:column}.mercato-draft-exchange,.mercato-confirmed-exchange{grid-template-columns:1fr}.mercato-draft-exchange b,.mercato-confirmed-exchange b{transform:rotate(90deg)}.mercato-draft-actions,.mercato-confirmed-actions{justify-content:stretch}.mercato-draft-actions button,.mercato-confirmed-actions button{flex:1}.mercato-confirmed-card{grid-template-columns:1fr}.mercato-cancelled-row{grid-template-columns:1fr}.mercato-secondary-btn{margin-left:0!important;margin-top:8px}.mercato-final-actions button{width:100%;margin:0!important}}
    `;
    document.head.appendChild(style);
  }

  async function init() {
    if (initialized || window.hv_role !== 'admin') return;
    const panel = document.getElementById('admin-mercato-panel');
    if (!panel) return;
    initialized = true;
    [config, roseData, mercatoData] = await Promise.all([
      loadJSON('data/config.json', {squadre:[]}),
      loadJSON('data/rose.json', {rose:[]}),
      loadJSON('data/mercato.json', {_leggimi:'Storico mercato Hertavernello',movimenti:[]}),
    ]);
    if (!mercatoData.movimenti) mercatoData.movimenti = [];
    mercatoData.movimenti.forEach((m, index) => {
      if (!m.id) m.id = `scambio_legacy_${String(m.data || 'senza_data').replace(/[^0-9a-z_-]+/gi, '_')}_${index + 1}`;
      if (!m.tipo) m.tipo = 'scambio';
    });
    if (!Array.isArray(mercatoData.annullati)) mercatoData.annullati = [];
    caricaBozzeLocali();
    injectUI();
    aggiornaFormBase();

    const a = document.getElementById('mercato-squadra-a');
    const b = document.getElementById('mercato-squadra-b');
    a.innerHTML = opzioniSquadre();
    b.innerHTML = opzioniSquadre();
    document.getElementById('mercato-data').value = oggiLocale();

    a.addEventListener('change', () => {
      const old = b.value;
      b.innerHTML = opzioniSquadre(a.value);
      if (old !== a.value) b.value = old;
      renderRosa('a');
      renderRosa('b');
    });
    b.addEventListener('change', () => {
      const old = a.value;
      a.innerHTML = opzioniSquadre(b.value);
      if (old !== b.value) a.value = old;
      renderRosa('a');
      renderRosa('b');
    });

    document.getElementById('mercato-conferma').addEventListener('click', aggiungiOAggiornaBozza);
    document.getElementById('mercato-annulla-modifica').addEventListener('click', () => {
      const eraConfermato = Boolean(editingConfirmedId);
      resetForm({ keepDate:true });
      const stato = document.getElementById('mercato-stato');
      stato.style.color = 'var(--text-muted)';
      stato.textContent = eraConfermato
        ? 'Modifica annullata. Lo scambio confermato è rimasto invariato.'
        : 'Modifica annullata. La bozza originale è rimasta invariata.';
    });
    document.getElementById('mercato-applica-tutti').addEventListener('click', apriRiepilogoFinale);
    document.getElementById('mercato-final-cancel').addEventListener('click', chiudiRiepilogoFinale);
    document.getElementById('mercato-final-confirm').addEventListener('click', applicaTutteLeBozze);
    document.querySelector('#mercato-final-modal .mercato-final-backdrop')?.addEventListener('click', chiudiRiepilogoFinale);
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !document.getElementById('mercato-final-modal')?.hidden) chiudiRiepilogoFinale();
    });

    renderRosa('a');
    renderRosa('b');
    renderBozze();
    renderStorico();

    if (bozze.length) {
      const stato = document.getElementById('mercato-stato');
      stato.style.color = 'var(--giallo-neon)';
      stato.textContent = `Ripristinate ${bozze.length} ${bozze.length === 1 ? 'bozza salvata' : 'bozze salvate'} nel browser.`;
    }
  }

  window.hv_initMercatoAdmin = init;
})();
