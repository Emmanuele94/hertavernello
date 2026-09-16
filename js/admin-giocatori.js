/* Gestione giocatori batch: squadra reale, nazionalità e foto con un solo salvataggio finale. */
(() => {
  let initialized = false;
  let config = null;
  let giocatoriData = null;
  let squadreRef = null;
  let nazioni = null;
  let corrente = null;
  const queue = [];

  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  async function load(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Non riesco a leggere ${path}`);
    return res.json();
  }

  function nazioneDaInput(value) {
    const m = String(value || '').match(/\(([a-z]{2})\)\s*$/i);
    if (m) return m[1].toLowerCase();
    const norm = String(value || '').trim().toLowerCase();
    const voce = Object.entries(nazioni || {}).find(([code,name]) => code.toLowerCase() === norm || String(name).toLowerCase() === norm);
    return voce ? voce[0] : '';
  }

  function labelNazione(code) {
    if (!code) return '';
    return `${nazioni?.[code] || code.toUpperCase()} (${code})`;
  }

  function renderSearch(query) {
    const wrap = document.getElementById('admin-player-search-results');
    const q = hv_normalizzaNomeGiocatore(query || '');
    if (q.length < 2) { wrap.classList.add('hidden'); wrap.innerHTML=''; return; }
    const results = (giocatoriData.giocatori || []).filter((g) => hv_normalizzaNomeGiocatore(g.nome).includes(q)).slice(0, 12);
    if (!results.length) { wrap.innerHTML='<p class="empty-state">Nessun giocatore trovato.</p>'; wrap.classList.remove('hidden'); return; }
    wrap.innerHTML = results.map((g, index) => `<button type="button" data-index="${(giocatoriData.giocatori || []).indexOf(g)}"><strong>${esc(g.nome)}</strong><small>${esc(g.ruolo || '')} · ${esc(g.squadraReale || g.squadraCodice || '')}${g.fantacalcioId ? ` · ID ${esc(g.fantacalcioId)}` : ''}</small></button>`).join('');
    wrap.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => scegliGiocatore(Number(b.dataset.index))));
    wrap.classList.remove('hidden');
  }

  function scegliGiocatore(index) {
    corrente = { index, player: giocatoriData.giocatori[index] };
    const g = corrente.player;
    document.getElementById('admin-player-search').value = g.nome;
    document.getElementById('admin-player-search-results').classList.add('hidden');
    document.getElementById('admin-player-editor').classList.remove('hidden');
    document.getElementById('admin-player-name').textContent = g.nome;
    document.getElementById('admin-player-meta').textContent = `${g.ruolo || 'Ruolo n.d.'}${g.fantacalcioId ? ` · Fantacalcio ID ${g.fantacalcioId}` : ''}`;
    const img = document.getElementById('admin-player-current-photo');
    if (g.foto) { img.src = g.foto; img.classList.remove('is-empty'); }
    else { img.removeAttribute('src'); img.classList.add('is-empty'); }
    document.getElementById('admin-player-team').value = g.squadraCodice || '';
    document.getElementById('admin-player-nation').value = labelNazione(g.nazionalitaCodice);
    document.getElementById('admin-player-photo').value = '';
  }

  function queueKey(entry) {
    return entry.fantacalcioId ? `id:${entry.fantacalcioId}` : `name:${hv_normalizzaNomeGiocatore(entry.nome)}`;
  }

  function renderQueue() {
    const wrap = document.getElementById('admin-player-queue');
    const save = document.getElementById('admin-player-save-all');
    if (!queue.length) { wrap.innerHTML=''; save.classList.add('hidden'); return; }
    wrap.innerHTML = '<h3>Modifiche in attesa</h3>' + queue.map((q,i) => {
      const team = squadreRef.squadre.find((s)=>s.codice===q.squadraCodice)?.nome || q.squadraCodice;
      return `<div class="admin-player-queue-row"><div><strong>${esc(q.nome)}</strong><span>${esc(team || 'Squadra invariata')} · ${esc(labelNazione(q.nazionalitaCodice) || 'Nazione invariata')}${q.file ? ' · 📷 foto assegnata' : ''}</span></div><button type="button" data-remove="${i}" aria-label="Rimuovi modifica">✕</button></div>`;
    }).join('');
    wrap.querySelectorAll('[data-remove]').forEach((b)=>b.addEventListener('click',()=>{queue.splice(Number(b.dataset.remove),1);renderQueue();}));
    save.classList.remove('hidden');
  }

  function addQueue() {
    const stato = document.getElementById('admin-player-status');
    if (!corrente) { stato.textContent='Seleziona prima un giocatore.'; return; }
    const squadraCodice = document.getElementById('admin-player-team').value;
    const nazionalitaCodice = nazioneDaInput(document.getElementById('admin-player-nation').value);
    if (!squadraCodice) { stato.textContent='Scegli la squadra reale.'; return; }
    if (!nazionalitaCodice || !nazioni[nazionalitaCodice]) { stato.textContent='Scegli una nazionalità valida dalla lista.'; return; }
    const file = document.getElementById('admin-player-photo').files[0] || null;
    const g = corrente.player;
    const entry = { nome:g.nome, fantacalcioId:g.fantacalcioId || '', squadraCodice, nazionalitaCodice, file };
    const key = queueKey(entry);
    const existing = queue.findIndex((q)=>queueKey(q)===key);
    if (existing >= 0) queue[existing] = entry; else queue.push(entry);
    stato.textContent = `${g.nome}: modifica aggiunta alla lista.`;
    stato.style.color='var(--verde-prato)';
    renderQueue();
  }

  async function fileToBase64(blob) {
    return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(String(r.result).split(',')[1]); r.onerror=()=>reject(new Error('Impossibile leggere la foto.')); r.readAsDataURL(blob); });
  }

  function trovaPlayer(db, q) {
    if (q.fantacalcioId) {
      const byId = (db.giocatori || []).find((g)=>String(g.fantacalcioId || '')===String(q.fantacalcioId));
      if (byId) return byId;
    }
    return (db.giocatori || []).find((g)=>hv_normalizzaNomeGiocatore(g.nome)===hv_normalizzaNomeGiocatore(q.nome));
  }

  async function saveAll() {
    const btn = document.getElementById('admin-player-save-all');
    const stato = document.getElementById('admin-player-status');
    if (!queue.length) return;
    btn.disabled=true; stato.style.color='var(--text-muted)';
    try {
      const { githubOwner:owner, githubRepo:repo } = config.lega;
      const token = hv_getGithubToken();
      if (!token) throw new Error('Serve il token GitHub.');
      const live = await hv_ghGetFile(owner,repo,'data/giocatori.json',token);
      if (!live) throw new Error('Non trovo data/giocatori.json.');
      const db = JSON.parse(hv_base64ToUtf8(live.content));

      for (let i=0;i<queue.length;i++) {
        const q = queue[i];
        const g = trovaPlayer(db,q);
        if (!g) throw new Error(`Giocatore non trovato nel database: ${q.nome}`);
        const team = squadreRef.squadre.find((s)=>s.codice===q.squadraCodice);
        g.squadraCodice = q.squadraCodice;
        g.squadraReale = team ? team.nome : g.squadraReale;
        g.nazionalitaCodice = q.nazionalitaCodice;
        if (q.file) {
          stato.textContent = `Preparo la foto di ${q.nome} (${i+1}/${queue.length})…`;
          const blob = await hv_ridimensionaImmagine(q.file, 512);
          const base64 = await fileToBase64(blob);
          const folder = team ? team.nome : 'Altro';
          const baseName = `${q.fantacalcioId || hv_slugifyNomeFile(q.nome)}-${hv_slugifyNomeFile(q.nome)}.png`;
          const path = `assets/calciatori/${folder}/${baseName}`;
          const existing = await hv_ghGetFile(owner,repo,path,token);
          await hv_ghPutFile(owner,repo,path,token,base64,`Aggiorna foto giocatore ${q.nome}`,existing?.sha || null,'main',(sec)=>{stato.textContent=`Attendo il turno GitHub: ${sec}s · foto ${i+1}/${queue.length}`;});
          g.foto = path;
        }
      }

      stato.textContent='Salvo tutte le modifiche in giocatori.json…';
      const latest = await hv_ghGetFile(owner,repo,'data/giocatori.json',token);
      await hv_ghPutFile(owner,repo,'data/giocatori.json',token,hv_utf8ToBase64(JSON.stringify(db,null,2)),`Aggiorna ${queue.length} giocatori da Admin`,latest?.sha || live.sha,'main',(sec)=>{stato.textContent=`Attendo il turno GitHub: ${sec}s · salvataggio database…`;});
      giocatoriData = db;
      queue.splice(0,queue.length); renderQueue();
      stato.textContent='Modifiche salvate ✓ — nazionalità, squadra e foto sono state associate.';
      stato.style.color='var(--verde-prato)';
      corrente=null; document.getElementById('admin-player-editor').classList.add('hidden'); document.getElementById('admin-player-search').value='';
    } catch (err) {
      stato.textContent='Errore: '+err.message; stato.style.color='var(--wine-bright)';
    } finally { btn.disabled=false; }
  }

  async function init() {
    if (initialized || window.hv_role !== 'admin') return;
    if (!document.getElementById('admin-giocatori-panel')) return;
    initialized=true;
    try {
      [config, giocatoriData, squadreRef, nazioni] = await Promise.all([load('data/config.json'),load('data/giocatori.json'),load('data/squadre-serie-a.json'),load('data/nazioni.json').then((d)=>d.nazioni)]);
      const team = document.getElementById('admin-player-team');
      team.innerHTML='<option value="">-- scegli squadra --</option>'+squadreRef.squadre.map((s)=>`<option value="${esc(s.codice)}">${esc(s.nome)} (${esc(s.codice)})</option>`).join('');
      const dl = document.getElementById('admin-player-nations');
      dl.innerHTML=Object.entries(nazioni).sort((a,b)=>a[1].localeCompare(b[1],'it')).map(([c,n])=>`<option value="${esc(n)} (${esc(c)})"></option>`).join('');
      const input=document.getElementById('admin-player-search');
      input.addEventListener('input',()=>renderSearch(input.value));
      input.addEventListener('focus',()=>renderSearch(input.value));
      document.addEventListener('click',(e)=>{ if(!e.target.closest('.admin-player-search-wrap')) document.getElementById('admin-player-search-results').classList.add('hidden'); });
      document.getElementById('admin-player-add-queue').addEventListener('click',addQueue);
      document.getElementById('admin-player-save-all').addEventListener('click',saveAll);
    } catch (e) {
      document.getElementById('admin-player-status').textContent='Errore inizializzazione: '+e.message;
    }
  }
  window.hv_initAdminGiocatori = init;
})();
