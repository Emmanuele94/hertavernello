(() => {
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function standings(data, girone) {
    const teams=data.gironi[girone] || [];
    const rows=teams.map(nome=>({nome,p:0,giocate:0,v:0,n:0,s:0,gf:0,gs:0,fanta:0}));
    const map=new Map(rows.map(r=>[r.nome,r]));
    (data.faseGironi||[]).filter(m=>m.girone===girone && m.giocata && Number.isFinite(Number(m.golCasa)) && Number.isFinite(Number(m.golTrasferta))).forEach(m=>{
      const a=map.get(m.casa),b=map.get(m.trasferta);if(!a||!b)return;
      const ga=Number(m.golCasa),gb=Number(m.golTrasferta);
      for(const [r,f,g,pt] of [[a,ga,gb,m.puntiCasa],[b,gb,ga,m.puntiTrasferta]]) {r.giocate++;r.gf+=f;r.gs+=g;if(pt!==null&&pt!==''&&Number.isFinite(+pt))r.fanta+=+pt;}
      if(ga>gb){a.p+=3;a.v++;b.s++;}else if(gb>ga){b.p+=3;b.v++;a.s++;}else{a.p++;b.p++;a.n++;b.n++;}
    });
    return rows.sort((a,b)=>b.p-a.p||b.fanta-a.fanta||b.gf-a.gf||((b.gf-b.gs)-(a.gf-a.gs))||a.gs-b.gs||a.nome.localeCompare(b.nome));
  }
  window.HVCoppa={standings,esc};
  async function init() {
    const wrap=document.getElementById('coppa-wrap');if(!wrap)return;
    try {
      const r=await fetch('data/coppa.json',{cache:'no-store'});if(!r.ok)throw Error('File della Coppa non disponibile');const data=await r.json();
      const groups=Object.keys(data.gironi||{});
      const render=(group)=>{
        const rows=standings(data,group);
        const matches=(data.faseGironi||[]).filter(m=>m.girone===group);
        wrap.innerHTML='<div class="hv-cup-tabs">'+groups.map(g=>`<button type="button" data-cup-group="${esc(g)}" aria-pressed="${g===group}">Girone ${esc(g)}</button>`).join('')+'</div>'+
          `<div class="hv-cup-muted">Girone ${esc(group)} · ${rows.reduce((n,r)=>n+r.giocate,0)/2} incontri disputati</div>`+
          '<table class="hv-cup-table"><thead><tr><th>#</th><th>Squadra</th><th>Pt</th><th>G</th><th>GF</th><th>GS</th></tr></thead><tbody>'+
          rows.map((s,i)=>`<tr><td>${i+1}</td><td>${esc(s.nome)}</td><td><strong>${s.p}</strong></td><td>${s.giocate}</td><td>${s.gf}</td><td>${s.gs}</td></tr>`).join('')+'</tbody></table>'+
          '<details class="hv-cup-card"><summary>Calendario e risultati del girone</summary>'+matches.map(m=>`<div class="hv-cup-row"><span><small>${m.giornata}ª · Serie A ${m.giornataSerieA}ª</small> ${esc(m.casa)} – ${esc(m.trasferta)}</span><strong>${m.giocata?esc(m.golCasa)+' - '+esc(m.golTrasferta):'Da giocare'}</strong></div>`).join('')+'</details>'+
          '<details class="hv-cup-card"><summary>Fase finale — quarti, semifinali, finale</summary><p class="hv-cup-muted">Il tabellone verrà aggiornato al termine della fase a gironi. Quarti e semifinali con andata e ritorno, finale secca.</p></details>';
        wrap.querySelectorAll('[data-cup-group]').forEach(btn=>btn.addEventListener('click',()=>render(btn.dataset.cupGroup)));
      };
      if(groups.length)render(groups[0]);else wrap.textContent='Gironi non ancora configurati.';
    } catch(e){wrap.textContent='Classifica Coppa non disponibile: '+e.message;}
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
