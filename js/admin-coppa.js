(() => {
  let data=null, config=null, loaded=false;
  const el=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function init(){
    if(loaded)return;loaded=true;
    const status=el('admin-coppa-status');if(!status)return;
    try {
      const [r,c]=await Promise.all([fetch('data/coppa.json',{cache:'no-store'}),fetch('data/config.json',{cache:'no-store'})]);
      if(!r.ok||!c.ok)throw Error('Impossibile caricare calendario Coppa o configurazione');
      data=await r.json();config=await c.json();
      render();
      el('admin-coppa-salva').addEventListener('click',save);
      status.textContent='Dati caricati. I risultati delle partite future sono vuoti.';
    }catch(e){status.textContent='Errore Coppa: '+e.message;}
  }
  function render(){
    el('admin-coppa-editor').innerHTML=[1,2,3,4,5,6].map(g=>{
      const arr=data.faseGironi.filter(m=>m.giornata===g);
      return `<details ${g===1?'open':''}><summary><strong>${g}ª giornata Coppa — ${arr[0]?.giornataSerieA||''}ª Serie A</strong></summary>`+arr.map(m=>{
        const idx=data.faseGironi.indexOf(m);const input=(key,value)=>`<label>${key}<input type="number" step="${key.startsWith('Punti')?'0.5':'1'}" min="0" data-idx="${idx}" data-field="${key==='Gol casa'?'golCasa':key==='Gol ospiti'?'golTrasferta':key==='Punti casa'?'puntiCasa':'puntiTrasferta'}" value="${value??''}" placeholder="—"></label>`;
        return `<div class="hv-cup-admin-match"><strong>Girone ${esc(m.girone)} · ${esc(m.casa)} – ${esc(m.trasferta)}</strong>`+input('Gol casa',m.giocata?m.golCasa:null)+input('Gol ospiti',m.giocata?m.golTrasferta:null)+input('Punti casa',m.giocata?m.puntiCasa:null)+input('Punti ospiti',m.giocata?m.puntiTrasferta:null)+'</div>';
      }).join('')+'</details>';
    }).join('');
  }
  async function save(){
    const status=el('admin-coppa-status');const btn=el('admin-coppa-salva');
    const next=JSON.parse(JSON.stringify(data));const inputGroups=new Map();
    el('admin-coppa-editor').querySelectorAll('input[data-idx]').forEach(input=>{
      const idx=Number(input.dataset.idx);if(!inputGroups.has(idx))inputGroups.set(idx,{});
      inputGroups.get(idx)[input.dataset.field]=input.value.trim();
    });
    for(const [idx,row] of inputGroups){
      const m=next.faseGironi[idx];const a=row.golCasa,b=row.golTrasferta;
      if((a==='')!==(b==='')){status.textContent=`Errore: inserire entrambi i gol per ${m.casa} – ${m.trasferta}.`;return;}
      if([a,b].every(x=>x==='')) {m.giocata=false;m.golCasa=null;m.golTrasferta=null;m.puntiCasa=null;m.puntiTrasferta=null;continue;}
      if([a,b].some(x=>!/^\d+$/.test(x))){status.textContent='I gol devono essere numeri interi non negativi.';return;}
      if([row.puntiCasa,row.puntiTrasferta].some(x=>x!==''&&(!Number.isFinite(+x)||+x<0))){status.textContent='Controlla i punti fantacalcio.';return;}
      m.giocata=true;m.golCasa=Number(a);m.golTrasferta=Number(b);m.puntiCasa=row.puntiCasa===''?null:Number(row.puntiCasa);m.puntiTrasferta=row.puntiTrasferta===''?null:Number(row.puntiTrasferta);
    }
    btn.disabled=true;status.textContent='Salvataggio GitHub in corso…';
    try{await hv_ghSalvaJSON('data/coppa.json',next,'Aggiorna risultati Winter Kebab Cup',config);data=next;status.textContent='Coppa salvata su GitHub. Aggiorna la Home dopo la pubblicazione.';}
    catch(e){status.textContent='Errore nel salvataggio: '+e.message;}finally{btn.disabled=false;}
  }
  window.hv_initAdminCoppa=init;
})();
