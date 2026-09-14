/* Presentation enhancement: no data changes or business event replacement. */
(() => {
 const gate = document.getElementById('gate');
 if (gate) {
   const eyebrow=document.createElement('span'); eyebrow.className='pv-eyebrow'; eyebrow.textContent='LA TUA LEGA. LA TUA STORIA.'; gate.prepend(eyebrow);
   const input=document.getElementById('gate-input');
   if(input){
     input.setAttribute('aria-label','Password della lega');
     const wrap=document.createElement('div'); wrap.className='pv-password'; input.before(wrap); wrap.append(input);
     const button=document.createElement('button'); button.type='button'; button.className='pv-reveal'; button.textContent='Mostra'; button.setAttribute('aria-pressed','false');
     button.addEventListener('click',()=>{const reveal=input.type==='password'; input.type=reveal?'text':'password';button.textContent=reveal?'Nascondi':'Mostra';button.setAttribute('aria-pressed',String(reveal));}); wrap.append(button);
   }
   document.getElementById('gate-error')?.setAttribute('role','alert');
   const note=document.createElement('span'); note.className='pv-gate-note';note.textContent='HERTAVERNELLO / FANTASY FOOTBALL CLUB';gate.append(note);
 }
 const app=document.getElementById('app');
 if(app){const skip=document.createElement('a');skip.href='#app';skip.className='pv-skip';skip.textContent='Vai al contenuto';document.body.prepend(skip);app.tabIndex=-1;}
 const page=location.pathname.split('/').pop()||'index.html';
 const titles={'index.html':['MATCH CENTER','Ogni giornata, una nuova storia.','Sfide, classifiche e protagonisti della tua lega.'],'squadre.html':['FANTALLENATORI','Una squadra. Infinite ambizioni.','Rose, statistiche e ambizioni: tutto parte dalla squadra.'],'archivio.html':['HALL OF FAME','Le stagioni passano. La gloria resta.','Rivivi i protagonisti e i momenti della lega.'],'quiz.html':['EXTRA TIME','Quanto conosci la tua lega?','Mettiti in gioco. Il prossimo punto è tuo.'],'rose.html':['LE SQUADRE','Il talento, ruolo per ruolo.','Esplora i giocatori della tua lega.'],'admin.html':['CONTROL ROOM','La regia della tua lega.','Aggiorna i contenuti, prepara la giornata, costruisci la prossima stagione.']};
 const header=document.querySelector('.site-header');
 if(header){
   const data=titles[page]||titles['index.html']; const hero=document.createElement('section');hero.className='pv-intro';
   const tag=document.createElement('span');tag.className='pv-eyebrow';tag.textContent=data[0];const title=document.createElement('h2');title.textContent=data[1];const desc=document.createElement('p');desc.textContent=data[2];hero.append(tag,title,desc);header.after(hero);
 }
 const admin=document.querySelector('.admin-wrap');
 if(admin){
   const panels=[...admin.children].filter(e=>e.classList.contains('admin-box')&&e.querySelector('h2'));
   const nav=document.createElement('nav');nav.className='pv-admin-nav';nav.setAttribute('aria-label','Strumenti amministrazione');
   panels.forEach((panel,i)=>{panel.id ||= 'pv-admin-'+i;const a=document.createElement('a');a.href='#'+panel.id;a.textContent=panel.querySelector('h2').textContent;nav.append(a);});
   document.querySelector('.pv-intro')?.after(nav);
 }
 const accessibleToggles=new WeakSet();
 const enhanceToggles=()=>document.querySelectorAll('.sezione-toggle').forEach(toggle=>{
 if(accessibleToggles.has(toggle))return;accessibleToggles.add(toggle);
   toggle.tabIndex=0;toggle.setAttribute('role','button');
   if(toggle.dataset.target)toggle.setAttribute('aria-controls',toggle.dataset.target);
   const sync=()=>toggle.setAttribute('aria-expanded',String(!toggle.classList.contains('collassato')));sync();
   new MutationObserver(sync).observe(toggle,{attributes:true,attributeFilter:['class']});
   toggle.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle.click();}});
 });
 // Wrap only tables: original table nodes, IDs and listeners are retained.
 const enhance=()=>{enhanceToggles();document.querySelectorAll('table').forEach(table=>{if(table.parentElement.classList.contains('pv-table-scroll'))return;const wrap=document.createElement('div');wrap.className='pv-table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Tabella scorrevole');table.before(wrap);wrap.append(table);});};
 let queued=false;const observer=new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;enhance();});}});
 if(app)observer.observe(app,{childList:true,subtree:true});enhance();
})();

/* UI revision: football login, unclipped flag tooltips and a balanced standings deck. */
(() => {
  const gate = document.getElementById('gate');
  if (gate) {
    const card = document.createElement('div');
    card.className = 'pv-login-card';
    while (gate.firstChild) card.append(gate.firstChild);
    const scene = document.createElement('div');
    scene.className = 'pv-football-scene';
    scene.innerHTML = `<span class="pv-match-label"><i></i> HERTAVERNELLO · FANTASY CLUB</span>
      <h2>La domenica<br>si decide <em>qui.</em></h2>
      <p>Undici in campo. Mille ripensamenti.<br>Una lega da vivere fino all’ultimo bonus.</p>
      <div class="pv-tactics" aria-hidden="true">
        <div class="pv-tactics-top"><span>LA TUA PROSSIMA FORMAZIONE</span><b>3 — 4 — 3</b></div>
        <svg viewBox="0 0 600 370" class="pv-pitch">
          <defs><linearGradient id="pv-turf" x2="0" y2="1"><stop stop-color="#163c34"/><stop offset="1" stop-color="#0b211f"/></linearGradient><radialGradient id="pv-field-glow"><stop stop-color="#b7ff5c" stop-opacity=".16"/><stop offset="1" stop-color="#b7ff5c" stop-opacity="0"/></radialGradient></defs>
          <rect x="25" y="15" width="550" height="340" rx="12" fill="url(#pv-turf)"/>
          <g fill="#b7ff5c" opacity=".035"><path d="M25 15h550v42H25zM25 99h550v42H25zM25 183h550v42H25zM25 267h550v42H25z"/></g>
          <ellipse cx="300" cy="180" rx="270" ry="160" fill="url(#pv-field-glow)"/>
          <g fill="none" stroke="#a2cfb2" stroke-opacity=".32" stroke-width="1.4"><rect x="43" y="30" width="514" height="310" rx="2"/><path d="M43 185h514M200 30v60h200V30M253 30v24h94V30M200 340v-60h200v60M253 340v-24h94v24"/><circle cx="300" cy="185" r="45"/><path d="M270 90q30 28 60 0M270 280q30-28 60 0"/></g>
          <path class="pv-pass" d="M300 309L144 245L240 173L302 80L425 170" fill="none" stroke="#b7ff5c" stroke-width="2" stroke-dasharray="5 8" opacity=".5"/>
          <g class="pv-players" fill="#0b201b" stroke="#b7ff5c" stroke-width="2">
            <circle cx="300" cy="309" r="16"/><circle cx="144" cy="245" r="16"/><circle cx="300" cy="245" r="16"/><circle cx="456" cy="245" r="16"/>
            <circle cx="100" cy="173" r="16"/><circle cx="240" cy="173" r="16"/><circle cx="370" cy="173" r="16"/><circle cx="500" cy="173" r="16"/>
            <circle cx="175" cy="80" r="16"/><circle cx="302" cy="80" r="16"/><circle cx="425" cy="80" r="16"/>
          </g>
          <g fill="#deffc6" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="700"><text x="300" y="309">P</text><text x="144" y="245">D</text><text x="300" y="245">D</text><text x="456" y="245">D</text><text x="100" y="173">C</text><text x="240" y="173">C</text><text x="370" y="173">C</text><text x="500" y="173">C</text><text x="175" y="80">A</text><text x="302" y="80">A</text><text x="425" y="80">A</text></g>
          <g class="pv-ball"><circle r="7" fill="#f4ffe8"/><path d="m0-4 4 3-1 4h-6l-1-4z" fill="#15362c"/></g>
        </svg>
        <div class="pv-bonus"><span>QUEL +3 CHE CAMBIA TUTTO</span><strong>+3 <small>GOL</small></strong></div>
      </div>
      <div class="pv-scene-footer"><span>ROSE</span><i></i><span>SFIDE</span><i></i><span>GLORIA</span></div>`;
    gate.append(scene, card);
    const button = document.getElementById('gate-btn');
    if (button) button.textContent = 'Entra nello spogliatoio →';
  }

  // A body-level fixed tooltip escapes the overflow containers used by tables.
  const portal = document.createElement('div');
  portal.className = 'pv-flag-tooltip'; portal.id = 'pv-flag-tooltip';
  portal.setAttribute('role', 'tooltip'); portal.hidden = true; document.body.append(portal);
  let active = null;
  const hide = () => { active?.removeAttribute('aria-describedby'); active = null; portal.hidden = true; };
  const place = () => {
    if (!active?.isConnected) return hide();
    const r = active.getBoundingClientRect();
    const scroll = active.closest('.pv-table-scroll'); const s = scroll?.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || (s && (r.right < s.left || r.left > s.right || r.bottom < s.top || r.top > s.bottom))) return hide();
    const w = portal.offsetWidth, h = portal.offsetHeight;
    portal.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    portal.style.top = (r.top > h + 16 ? r.top - h - 8 : r.bottom + 8) + 'px';
  };
  const show = flag => {
    if (!flag) return;
    if (active !== flag) hide();
    active = flag; portal.textContent = flag.querySelector('.bandiera-tooltip')?.textContent || flag.querySelector('img')?.alt || '';
    if (!portal.textContent) return hide();
    flag.setAttribute('aria-describedby', portal.id); portal.hidden = false; place();
  };
  document.addEventListener('pointerover', e => { if (e.pointerType !== 'touch') show(e.target.closest('.bandiera-wrap')); });
  document.addEventListener('pointerout', e => { if (active && !active.contains(e.relatedTarget) && e.target.closest('.bandiera-wrap') === active && !active.classList.contains('tooltip-attivo')) hide(); });
  document.addEventListener('click', e => {
    const flag = e.target.closest('.bandiera-wrap');
    if (flag?.classList.contains('tooltip-attivo')) show(flag); else hide();
  });
  document.addEventListener('focusin', e => show(e.target.closest('.bandiera-wrap')));
  document.addEventListener('focusout', e => { if (e.target === active) hide(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { active?.classList.remove('tooltip-attivo'); hide(); }
    const flag = e.target.closest('.bandiera-wrap');
    if (flag && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flag.click(); }
  });
  document.addEventListener('scroll', () => { if (active) place(); }, true);
  window.addEventListener('resize', () => { if (active) place(); });

  const deck = document.querySelector('.home-3col');
  if (deck) {
    const titles = ['Previsioni', 'Serie A', 'Marcatori'];
    const intro = document.createElement('div'); intro.className = 'pv-standings-heading';
    intro.innerHTML = '<div><span class="pv-eyebrow">TUTTI I NUMERI DELLA GIORNATA</span><h2>Il tabellone.</h2></div><p>La tua lega e il campionato, fianco a fianco.</p>';
    const nav = document.createElement('div'); nav.className = 'pv-standings-nav'; nav.setAttribute('role','group'); nav.setAttribute('aria-label','Scegli la classifica');
    deck.before(intro, nav);
    const panels = [...deck.children];
    panels.forEach((panel, i) => {
      panel.dataset.rank = String(i); panel.id = 'pv-standing-' + i;
      const heading = panel.querySelector('h2');
      [...heading.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).forEach(n => n.remove());
      const title = document.createElement('span'); title.textContent = titles[i]; heading.querySelector('.toggle-chevron').before(title);
      const b = document.createElement('button'); b.type = 'button'; b.textContent = titles[i]; b.setAttribute('aria-controls', panel.id);
      b.setAttribute('aria-pressed',String(i===0)); panel.classList.toggle('pv-rank-inactive',i!==0);
      b.addEventListener('click',()=>{panels.forEach((p,j)=>p.classList.toggle('pv-rank-inactive',j!==i));[...nav.children].forEach((c,j)=>c.setAttribute('aria-pressed',String(j===i)));}); nav.append(b);
    });
  }
  const enhance = () => {
    document.querySelectorAll('.bandiera-wrap:not([data-pv-flag])').forEach(flag => {
      flag.dataset.pvFlag = '1'; flag.tabIndex = 0; flag.setAttribute('role','button');
      flag.setAttribute('aria-label', flag.querySelector('.bandiera-tooltip')?.textContent || flag.querySelector('img')?.alt || 'Nazionalità');
    });
    for (const [id, name] of [['leaderboard-wrap','Fantallenatore'],['classifica-wrap','Squadra']]) {
      const table = document.querySelector('#'+id+' table');
      if (table && !table.tHead) { const tr=table.createTHead().insertRow(); for(const text of ['Pos',name,'Punti']) {const th=document.createElement('th');th.scope='col';th.textContent=text;tr.append(th);} }
    }
    if (active && !active.isConnected) hide();
  };
  let queued = false;
  const app = document.getElementById('app');
  if (app) new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;enhance();});}}).observe(app,{childList:true,subtree:true});
  enhance();
})();
