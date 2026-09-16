/* Mercato & Scambi: registra scambi tra due fantasquadre e aggiorna rose + storico. */
(() => {
  let initialized = false;
  let config = null;
  let roseData = null;
  let mercatoData = null;

  const ruoloLabel = { POR: 'Portieri', DIF: 'Difensori', CEN: 'Centrocampisti', ATT: 'Attaccanti' };
  const ruoloOrdine = ['POR', 'DIF', 'CEN', 'ATT'];

  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const teamById = (id) => config?.squadre?.find((s) => s.id === id) || null;
  const rosaById = (id) => roseData?.rose?.find((r) => r.squadraId === id) || null;
  const nomeTeam = (id) => teamById(id)?.nomeFantasquadra || teamById(id)?.nomeReale || id;

  function formatoData(iso) {
    if (!iso) return '';
    const [y,m,d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  async function loadJSON(path, fallback) {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) return fallback;
      return await res.json();
    } catch { return fallback; }
  }

  function opzioniSquadre(escludi = '') {
    return ['<option value="">-- scegli --</option>']
      .concat((config.squadre || []).filter((s) => s.id !== escludi).map((s) => `<option value="${esc(s.id)}">${esc(s.nomeFantasquadra)} (${esc(s.nomeReale)})</option>`))
      .join('');
  }

  function playerKey(g, index) {
    return `${g.fantacalcioId || ''}::${g.nome || ''}::${g.ruolo || ''}::${index}`;
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
      index: Number(el.dataset.index), ruolo: el.dataset.ruolo, nome: el.dataset.nome,
    }));
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

  function aggiornaRiepilogo() {
    const a = selezionati('a'), b = selezionati('b');
    const idA = document.getElementById('mercato-squadra-a').value;
    const idB = document.getElementById('mercato-squadra-b').value;
    const valido = Boolean(idA && idB && idA !== idB && scambioValido(a,b));
    const wrap = document.getElementById('mercato-riepilogo');
    wrap.innerHTML = `
      <div><strong>${esc(nomeTeam(idA) || 'Squadra A')}</strong><span>${a.map((g)=>esc(g.nome)).join(', ') || 'Nessun giocatore'}</span><small>${sintesiRuoli(a)}</small></div>
      <div class="mercato-riepilogo-vs">⇄</div>
      <div><strong>${esc(nomeTeam(idB) || 'Squadra B')}</strong><span>${b.map((g)=>esc(g.nome)).join(', ') || 'Nessun giocatore'}</span><small>${sintesiRuoli(b)}</small></div>`;
    wrap.classList.toggle('is-valid', valido);
    document.getElementById('mercato-conferma').disabled = !valido;
  }

  function renderStorico() {
    const wrap = document.getElementById('mercato-storico-admin');
    const mov = [...(mercatoData?.movimenti || [])].sort((a,b) => String(b.data).localeCompare(String(a.data)));
    if (!mov.length) { wrap.innerHTML = '<p class="empty-state">Nessuno scambio registrato.</p>'; return; }
    wrap.innerHTML = '<h3 style="margin-top:18px;">Storico scambi</h3>' + mov.map((m) => {
      const a = (m.giocatoriA || []).map((g)=>g.nome).join(', ');
      const b = (m.giocatoriB || []).map((g)=>g.nome).join(', ');
      return `<div class="mercato-admin-history-row"><strong>${formatoData(m.data)}</strong><span>${esc(nomeTeam(m.squadraAId))}: ${esc(a)}</span><span>⇄</span><span>${esc(nomeTeam(m.squadraBId))}: ${esc(b)}</span></div>`;
    }).join('');
  }

  async function salvaScambio() {
    const stato = document.getElementById('mercato-stato');
    const btn = document.getElementById('mercato-conferma');
    const idA = document.getElementById('mercato-squadra-a').value;
    const idB = document.getElementById('mercato-squadra-b').value;
    const data = document.getElementById('mercato-data').value;
    const selA = selezionati('a'), selB = selezionati('b');
    if (!data) { stato.textContent = 'Scegli la data dello scambio.'; return; }
    if (!scambioValido(selA, selB)) { stato.textContent = 'Lo scambio deve avere lo stesso numero di giocatori e gli stessi ruoli.'; return; }

    const rosaA = rosaById(idA), rosaB = rosaById(idB);
    if (!rosaA || !rosaB) return;
    const giocA = selA.map((s) => rosaA.giocatori[s.index]);
    const giocB = selB.map((s) => rosaB.giocatori[s.index]);
    const testo = `Confermi lo scambio del ${formatoData(data)}?\n\n${nomeTeam(idA)} cede: ${giocA.map(g=>g.nome).join(', ')}\n${nomeTeam(idB)} cede: ${giocB.map(g=>g.nome).join(', ')}`;
    if (!confirm(testo)) return;

    btn.disabled = true;
    stato.style.color = 'var(--text-muted)';
    try {
      const idxA = new Set(selA.map((s)=>s.index));
      const idxB = new Set(selB.map((s)=>s.index));
      rosaA.giocatori = rosaA.giocatori.filter((_,i)=>!idxA.has(i)).concat(giocB.map((g)=>({...g})));
      rosaB.giocatori = rosaB.giocatori.filter((_,i)=>!idxB.has(i)).concat(giocA.map((g)=>({...g})));

      const movimento = {
        id: `scambio_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        tipo: 'scambio', data, squadraAId: idA, squadraBId: idB,
        giocatoriA: giocA.map((g)=>({...g})), giocatoriB: giocB.map((g)=>({...g})),
        creatoIl: new Date().toISOString(),
      };
      if (!mercatoData.movimenti) mercatoData.movimenti = [];
      mercatoData.movimenti.push(movimento);

      stato.textContent = 'Salvo le rose aggiornate su GitHub…';
      await hv_ghSalvaJSON('data/rose.json', roseData, `Scambio ${nomeTeam(idA)} ↔ ${nomeTeam(idB)} (${data})`, config, (sec) => {
        stato.textContent = `Attendo il turno GitHub: ${sec}s…`;
      });
      stato.textContent = 'Rose salvate. Salvo lo storico mercato…';
      await hv_ghSalvaJSON('data/mercato.json', mercatoData, `Registra scambio ${nomeTeam(idA)} ↔ ${nomeTeam(idB)} (${data})`, config, (sec) => {
        stato.textContent = `Rose salvate. Attendo ${sec}s per lo storico mercato…`;
      });
      stato.textContent = 'Scambio salvato ✓ — rose e storico aggiornati.';
      stato.style.color = 'var(--verde-prato)';
      document.getElementById('mercato-squadra-a').value = '';
      document.getElementById('mercato-squadra-b').value = '';
      renderRosa('a'); renderRosa('b'); renderStorico();
    } catch (err) {
      stato.textContent = `Errore: ${err.message}. Controlla rose e storico prima di ripetere lo scambio.`;
      stato.style.color = 'var(--wine-bright)';
    } finally { aggiornaRiepilogo(); }
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
    const a = document.getElementById('mercato-squadra-a');
    const b = document.getElementById('mercato-squadra-b');
    a.innerHTML = opzioniSquadre(); b.innerHTML = opzioniSquadre();
    document.getElementById('mercato-data').value = new Date().toISOString().slice(0,10);
    a.addEventListener('change', () => { const old=b.value; b.innerHTML=opzioniSquadre(a.value); if(old!==a.value)b.value=old; renderRosa('a'); renderRosa('b'); });
    b.addEventListener('change', () => { const old=a.value; a.innerHTML=opzioniSquadre(b.value); if(old!==b.value)a.value=old; renderRosa('a'); renderRosa('b'); });
    document.getElementById('mercato-conferma').addEventListener('click', salvaScambio);
    renderRosa('a'); renderRosa('b'); renderStorico();
  }
  window.hv_initMercatoAdmin = init;
})();
