(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const norm = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const defs = ['gol','assist','rigoriSegnati','autogol','ammonizioni','espulsioni','rigoriParati','rigoriSbagliati'];
  const labels = {gol:'Gol',assist:'Assist',rigoriSegnati:'Rigore segnato',autogol:'Autogol',ammonizioni:'Ammonizione',espulsioni:'Espulsione',rigoriParati:'Rigore parato',rigoriSbagliati:'Rigore sbagliato'};
  let payload=null, matches=[], db=[], teams=[], config=null, saved=null;
  let initialized=false; let uid=0; const newId=()=>`ev-${++uid}`;
  function status(s){$('hv-bulk-stato').textContent=s;}
  function optionList(players, selected){return '<option value="">— Associa il giocatore —</option>'+players.map(p=>`<option value="${esc(p.fantacalcioId||'')}" ${String(p.fantacalcioId)===String(selected)?'selected':''}>${esc(p.nome)} (${esc(p.ruolo||'')})</option>`).join('');}
  function scoreOf(m,side){return Number(m?.[side])>=0?Number(m[side]):null;}
  function resolveTeam(label){const value=norm(label); const aliases={'internazionale':'INT','inter milan':'INT','ac milan':'MIL','ac monza':'MON','hellas verona':'VER','udinese calcio':'UDI','ssc napoli':'NAP','as roma':'ROM','juventus turin':'JUV','torino fc':'TOR','us lecce':'LEC','us sassuolo':'SAS','como 1907':'COM'};
    let code=aliases[value]; if(code && teams.some(t=>t.codice===code))return code;
    let found=teams.find(t=>norm(t.nome)===value);if(found)return found.codice;
    found=teams.find(t=>norm(t.nome).startsWith(value)||value.startsWith(norm(t.nome)));return found?.codice||'';
  }
  function playerMatch(name, code){const wanted=norm(name);const players=db.filter(p=>p.squadraCodice===code);let hits=players.filter(p=>norm(p.nome)===wanted);if(hits.length===1)return hits[0];
    hits=players.filter(p=>norm(p.nome).startsWith(wanted)||wanted.startsWith(norm(p.nome)));return hits.length===1?hits[0]:null;
  }
  function findExisting(m){return (saved?.partite||[]).find(r=>(m.id&&String(r.fonteId||r.matchId||'')===String(m.id)) || (String(r.casaCodice)===m.casaCodice&&String(r.trasfertaCodice)===m.trasfertaCodice&&Number(r.giornata)===Number(m.giornata)));}
  const number = x => Math.max(0,Math.min(20,Math.floor(Number(x)||0)));
  function readEditor(){
    document.querySelectorAll('.hv-bulk-card').forEach(card=>{
      const i=Number(card.dataset.matchIndex),m=matches[i];if(!m)return;
      m.casaCodice=card.querySelector('[data-field="casaCodice"]').value;
      m.trasfertaCodice=card.querySelector('[data-field="trasfertaCodice"]').value;
      m.giornata=number(card.querySelector('[data-field="giornata"]').value);
      for(const key of ['golCasa','golTrasferta']){const el=card.querySelector(`[data-field="${key}"]`);m[key]=el.value===''?null:number(el.value);}
      m.entries.forEach(e=>{
        const row=card.querySelector(`[data-entry="${e.uid}"]`);if(!row)return;
        e.side=row.querySelector('[data-p="side"]').value;
        e.personType=row.querySelector('[data-p="kind"]').value;
        e.selectedId=row.querySelector('[data-p="player"]').value;
        e.nome=row.querySelector('[data-p="name"]').value.trim();
        e.eventi={};for(const k of defs){const v=number(row.querySelector(`[data-event="${k}"]`).value);if(v)e.eventi[k]=v;}
      });
      m.importSelected=card.querySelector('[data-import]').checked;
      m.warningsConfirmed=!!card.querySelector('[data-warnings]')?.checked;
    });
  }
  function playerOptions(e,m){const code=e.side==='home'?m.casaCodice:m.trasfertaCodice;
    const players=db.filter(p=>p.squadraCodice===code).sort((a,b)=>a.nome.localeCompare(b.nome,'it'));
    const guess=e.selectedId||playerMatch(e.nome,code)?.fantacalcioId||'';
    return `<option value="">— Cerca e seleziona —</option>`+players.map(p=>`<option value="${esc(p.fantacalcioId)}" ${String(p.fantacalcioId)===String(guess)?'selected':''}>${esc(p.nome)} · ${esc(p.ruolo)}</option>`).join('');
  }
  function entryHtml(e,m,i){
    return `<div class="hv-bulk-editrow" data-entry="${esc(e.uid)}">
      <div class="hv-bulk-edithead"><input data-p="name" value="${esc(e.nome)}" aria-label="Nome originale o corretto" placeholder="Nome calciatore"><select data-p="side" aria-label="Squadra giocatore"><option value="home" ${e.side==='home'?'selected':''}>${esc(m.casa)} (casa)</option><option value="away" ${e.side==='away'?'selected':''}>${esc(m.trasferta)} (trasferta)</option></select><button type="button" data-delete="${esc(e.uid)}" class="hv-bulk-danger" aria-label="Elimina evento">✕</button></div>
      <label class="hv-bulk-kind-label">Identità<select data-p="kind" aria-label="Tipo nominativo"><option value="player" ${e.personType==='player'?'selected':''}>Calciatore · abbina al database</option><option value="staff" ${e.personType==='staff'?'selected':''}>Allenatore / Staff · storico separato</option><option value="ignore" ${e.personType==='ignore'?'selected':''}>Ignora · non salvare</option></select></label>
      ${e.personType==='player'&&!e.selectedId&&!playerMatch(e.nome,e.side==='away'?m.trasfertaCodice:m.casaCodice)?'<p class="hv-bulk-unknown">⚠ Nome non trovato: è un allenatore/staff? Se sì, scegli l’opzione qui sopra; altrimenti associa manualmente il giocatore.</p>':''}
      <select data-p="player" aria-label="Abbina al database Hertavernello" ${e.personType==='staff'||e.personType==='ignore'?'disabled':''}>${playerOptions(e,m)}</select>
      <div class="hv-bulk-eventgrid">${defs.map(k=>`<label>${esc(labels[k])}<input data-event="${k}" type="number" min="0" max="20" step="1" value="${number(e.eventi?.[k])}"></label>`).join('')}</div>
    </div>`;
  }
  function teamChoices(value){return '<option value="">— Squadra —</option>'+teams.map(t=>`<option value="${esc(t.codice)}" ${t.codice===value?'selected':''}>${esc(t.nome)}</option>`).join('');}
  function render(){const target=$('hv-bulk-anteprima');if(!matches.length){target.innerHTML='';return;}
    target.innerHTML=matches.map((m,i)=>{const existing=findExisting(m);const warnings=Array.isArray(m.nonRiconosciuti)?m.nonRiconosciuti:[];
      return `<article class="hv-bulk-card" data-match-index="${i}"><details open><summary><strong>${esc(m.casa)} ${m.golCasa??'–'}–${m.golTrasferta??'–'} ${esc(m.trasferta)}</strong> · ${m.entries.length} nominativi ${existing?'· ⚠ storico già presente':''}</summary>
       <div class="hv-bulk-gamefields"><label>Casa<select data-field="casaCodice">${teamChoices(m.casaCodice)}</select></label><label>Gol casa<input type="number" data-field="golCasa" min="0" max="30" value="${m.golCasa??''}"></label><label>Trasferta<select data-field="trasfertaCodice">${teamChoices(m.trasfertaCodice)}</select></label><label>Gol trasferta<input type="number" data-field="golTrasferta" min="0" max="30" value="${m.golTrasferta??''}"></label><label>Giornata<input type="number" data-field="giornata" min="1" max="38" value="${m.giornata||''}"></label></div>
       <p class="hv-bulk-helper">Se un nominativo non è nel database, seleziona “Allenatore / Staff” per conservarlo senza bonus fantasy oppure “Ignora”. I nomi non riconosciuti non bloccano gli altri incontri.</p>
       <div class="hv-bulk-eventlist">${m.entries.map(e=>entryHtml(e,m,i)).join('')}</div>
       <button type="button" data-add="${i}" class="hv-bulk-add">＋ Aggiungi calciatore/evento</button>
       ${warnings.length?`<details><summary>⚠ ${warnings.length} avvisi da controllare</summary>${warnings.map(w=>`<p>${esc(w)}</p>`).join('')}</details><label class="hv-bulk-choice"><input type="checkbox" data-warnings ${m.warningsConfirmed?'checked':''}> Ho verificato gli avvisi e completato gli eventi</label>`:''}
       <p class="hv-bulk-diagnostic" data-diagnostic="${i}"></p>
       <label class="hv-bulk-choice"><input type="checkbox" data-import ${m.importSelected?'checked':''}> ${existing?'Sostituisci questa partita già salvata, dopo averla verificata':'Salva questa partita verificata'}</label></details></article>`;
    }).join('');validateEditor(); status(`${matches.length} partite pronte: modifica liberamente eventi, calciatori, squadre e risultati prima di salvare.`);
  }
  function validateEditor(){document.querySelectorAll('.hv-bulk-card').forEach(card=>{
    const i=Number(card.dataset.matchIndex),m=matches[i];if(!m)return;
    const totals={home:0,away:0};m.entries.forEach(e=>{const src=e.side==='away'?'away':'home';const dst=src==='home'?'away':'home';totals[src]+=number(e.eventi.gol)+number(e.eventi.rigoriSegnati);totals[dst]+=number(e.eventi.autogol);});
    const diag=card.querySelector('[data-diagnostic]');if(diag)diag.textContent=(m.golCasa!==null&&m.golTrasferta!==null&&(totals.home!==m.golCasa||totals.away!==m.golTrasferta))?`⚠ Risultato ${m.golCasa}-${m.golTrasferta}; reti dagli eventi ${totals.home}-${totals.away}. Verifica gol/autogol o correggi il risultato.`:`✓ Reti dagli eventi: ${totals.home}-${totals.away}`;
  });}
  function parseInput(){try{payload=JSON.parse($('hv-bulk-input').value.trim());if(payload?.format!=='hertavernello-diretta-events-v1'||!Array.isArray(payload.partite))throw Error('Formato non riconosciuto. Usa “Copia giornata” di Tampermonkey.');if(payload.partite.length>50)throw Error('Massimo 50 partite.');
    matches=payload.partite.map(m=>({...m,giornata:Number(m.giornata)||Number($('hv-bulk-giornata').value)||null,casaCodice:resolveTeam(m.casa),trasfertaCodice:resolveTeam(m.trasferta),golCasa:scoreOf(m,'golCasa'),golTrasferta:scoreOf(m,'golTrasferta'),importSelected:!findExisting({id:m.id,casaCodice:resolveTeam(m.casa),trasfertaCodice:resolveTeam(m.trasferta),giornata:m.giornata}),warningsConfirmed:false,entries:(m.eventi||[]).filter(e=>e?.nome&&['home','away'].includes(e.side)).map(e=>({...e,uid:newId(),selectedId:'',personType:'player',eventi:Object.fromEntries(defs.map(k=>[k,number(e.eventi?.[k])]).filter(([,v])=>v))}))}));if(!matches.length)throw Error('Nessuna partita presente.');render();
   }catch(e){matches=[];$('hv-bulk-anteprima').innerHTML='';status('Errore importazione: '+e.message);}}
  function editorChange(ev){const card=ev.target.closest('.hv-bulk-card');if(!card)return;const i=Number(card.dataset.matchIndex),m=matches[i];if(!m)return;
    if(ev.target.matches('[data-p="side"],[data-p="kind"],[data-field="casaCodice"],[data-field="trasfertaCodice"]')){readEditor();render();return;}
    if(ev.target.matches('[data-p="player"]')&&ev.target.value){const p=db.find(p=>String(p.fantacalcioId)===ev.target.value);if(p){const e=m.entries.find(x=>x.uid===ev.target.closest('[data-entry]').dataset.entry);if(e){e.nome=p.nome;e.selectedId=p.fantacalcioId;}readEditor();if(e){e.nome=p.nome;e.selectedId=p.fantacalcioId;}render();return;}}
    readEditor();validateEditor();
  }
  function editorClick(ev){const add=ev.target.closest('[data-add]'),del=ev.target.closest('[data-delete]');if(!add&&!del)return;readEditor();
    if(add){matches[Number(add.dataset.add)].entries.push({uid:newId(),nome:'',side:'home',eventi:{},selectedId:'',personType:'player'});}
    else{const card=del.closest('.hv-bulk-card'),m=matches[Number(card.dataset.matchIndex)];m.entries=m.entries.filter(e=>e.uid!==del.dataset.delete);}
    render();
  }
  async function saveAll(){readEditor();const selected=matches.filter(m=>m.importSelected);if(!selected.length){status('Seleziona almeno una partita.');return;}
    const items=[];for(const m of selected){if(m.nonRiconosciuti?.length&&!m.warningsConfirmed){status(`Verifica gli avvisi di ${m.casa} - ${m.trasferta}.`);return;}
      if(!m.casaCodice||!m.trasfertaCodice||m.casaCodice===m.trasfertaCodice){status(`Squadre non valide per ${m.casa} - ${m.trasferta}.`);return;}
      if(!Number.isInteger(m.giornata)||m.giornata<1||m.giornata>38){status(`Indica la giornata per ${m.casa} - ${m.trasferta}.`);return;}
      const perPlayer=new Map(),perStaff=new Map();for(const e of m.entries){if(e.personType==='ignore'||!Object.values(e.eventi).some(v=>v>0))continue;
        if(e.personType==='staff'){const originalName=e.nome.trim();if(!originalName){status(`Indica il nome dello staff in ${m.casa}-${m.trasferta}.`);return;}const staffKey=`${e.side}:${norm(originalName)}`;const staffEntry=perStaff.get(staffKey)||{nome:originalName,squadraCodice:e.side==='away'?m.trasfertaCodice:m.casaCodice,tipo:'staff',eventi:{}};for(const [k,v] of Object.entries(e.eventi))if(defs.includes(k)&&v)staffEntry.eventi[k]=(staffEntry.eventi[k]||0)+v;perStaff.set(staffKey,staffEntry);continue;}
        const code=e.side==='home'?m.casaCodice:m.trasfertaCodice;const p=db.find(p=>String(p.fantacalcioId)===String(e.selectedId));
        if(!p){status(`Associa il calciatore «${e.nome}» nella partita ${m.casa}-${m.trasferta}.`);return;}
        if(p.squadraCodice!==code){status(`Squadra non coerente per ${p.nome}.`);return;}
        const key=String(p.fantacalcioId),entry=perPlayer.get(key)||{fantacalcioId:key,nome:p.nome,squadraCodice:code,ruolo:p.ruolo,eventi:{}};
        for(const [k,v] of Object.entries(e.eventi))if(defs.includes(k)&&v)entry.eventi[k]=(entry.eventi[k]||0)+v;perPlayer.set(key,entry);
      }items.push({m,eventi:[...perPlayer.values()],eventiStaff:[...perStaff.values()]});
    }
    const duplicate=new Set();for(const {m} of items){const key=`${m.giornata}:${m.casaCodice}:${m.trasfertaCodice}`;if(duplicate.has(key)){status('Partita duplicata nel batch: '+key);return;}duplicate.add(key);}
    if(!confirm(`Confermare ${items.length} partite verificate? Gli incontri già archiviati selezionati saranno sostituiti. I dati non selezionati rimarranno invariati.`))return;
    const btn=$('hv-bulk-save');btn.disabled=true;try{const latest=await window.HVMatchEvents.load();const next=structuredClone(latest);let replacements=0;
      for(const {m,eventi,eventiStaff} of items){const original=(next.partite||[]).findIndex(r=>String(r.casaCodice)===m.casaCodice&&String(r.trasfertaCodice)===m.trasfertaCodice&&Number(r.giornata)===Number(m.giornata));
        const prev=original>=0?next.partite[original]:{};const record={...prev,matchId:prev.matchId||`g${m.giornata}-${m.casaCodice}-${m.trasfertaCodice}`,giornata:m.giornata,casaCodice:m.casaCodice,trasfertaCodice:m.trasfertaCodice,casaNome:teams.find(t=>t.codice===m.casaCodice)?.nome||m.casa,trasfertaNome:teams.find(t=>t.codice===m.trasfertaCodice)?.nome||m.trasferta,golCasa:m.golCasa,golTrasferta:m.golTrasferta,data:m.data||prev.data||null,stato:'FINALE',fonte:'Diretta.it (Tampermonkey, rivisto Admin)',fonteUrl:m.url||'',aggiornatoIl:new Date().toISOString(),eventi,eventiStaff};
        if(original>=0){next.partite[original]=record;replacements++;}else next.partite.push(record);
      }
      status('Salvataggio su GitHub in corso…');if(typeof hv_ghSalvaJSON!=='function')throw Error('Modulo GitHub non disponibile.');await hv_ghSalvaJSON('data/eventi-partite.json',next,`Revisione eventi Serie A: ${items.length} partite`,config);
      saved=next;matches.forEach(m=>m.importSelected=false);render();status(`Salvate ${items.length} partite (${replacements} sostituite). Archivio aggiornato.`);$('admin-eventi-archivio-refresh')?.click();
    }catch(e){status('Salvataggio non completato: '+e.message);}finally{btn.disabled=false;}
  }
  async function init(){if(initialized||window.hv_role!=='admin'||!$('hv-bulk-input'))return; initialized=true;try{const [players,teamRes,confRes,old]=await Promise.all([fetch('data/giocatori.json',{cache:'no-store'}).then(r=>r.json()),fetch('data/squadre-serie-a.json',{cache:'no-store'}).then(r=>r.json()),fetch('data/config.json',{cache:'no-store'}).then(r=>r.json()),window.HVMatchEvents.load()]);db=players.giocatori||players;teams=teamRes.squadre||[];config=confRes;saved=old;status('Incolla il JSON copiato da Tampermonkey.');}catch(e){status('Errore caricamento database: '+e.message);return;}
    $('hv-bulk-parse').addEventListener('click',parseInput);$('hv-bulk-save').addEventListener('click',saveAll);$('hv-bulk-anteprima').addEventListener('change',editorChange);$('hv-bulk-anteprima').addEventListener('input',editorChange);$('hv-bulk-anteprima').addEventListener('click',editorClick);
  }
  window.hv_initBulkEventi=init;
})();
