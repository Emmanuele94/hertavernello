(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const norm = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const defs = ['gol','assist','rigoriSegnati','autogol','ammonizioni','espulsioni','rigoriParati','rigoriSbagliati'];
  const labels = {gol:'Gol',assist:'Assist',rigoriSegnati:'Rigore segnato',autogol:'Autogol',ammonizioni:'Ammonizione',espulsioni:'Espulsione',rigoriParati:'Rigore parato',rigoriSbagliati:'Rigore sbagliato'};
  let payload=null, matches=[], db=[], teams=[], config=null, saved=null;
  let initialized=false;
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
  function render(){const target=$('hv-bulk-anteprima'); if(!matches.length){target.innerHTML='';return;}
    target.innerHTML=matches.map((m,i)=>{const existing=findExisting(m); const people=m.entries.map((e,j)=>{
      const choices=db.filter(p=>p.squadraCodice===(e.side==='home'?m.casaCodice:m.trasfertaCodice));const selected=e.selectedId||playerMatch(e.nome,e.side==='home'?m.casaCodice:m.trasfertaCodice)?.fantacalcioId||'';
      const iconText=defs.filter(k=>e.eventi?.[k]).map(k=>`${labels[k]} ×${e.eventi[k]}`).join(' · ');
      return `<div class="hv-bulk-event-row"><span>${esc(e.nome)} <small>(${e.side==='home'?'Casa':'Trasferta'})</small><br><small>${esc(iconText)}</small></span><select data-match="${i}" data-person="${j}" class="hv-bulk-person">${optionList(choices,selected)}</select></div>`;
    }).join('');const same=existing?'⚠️ Dati già presenti: il valore predefinito conserva lo storico.':'Nuova partita'; const warnings=Array.isArray(m.nonRiconosciuti)?m.nonRiconosciuti:[];
    return `<article class="hv-bulk-card" data-match-index="${i}"><h4>${esc(m.casa)} ${m.golCasa??'–'}–${m.golTrasferta??'–'} ${esc(m.trasferta)}</h4><p class="muted">${esc(same)} · ${m.entries.length} calciatori con eventi</p>${!m.casaCodice||!m.trasfertaCodice?'<p style="color:#ffb86a">Squadra non riconosciuta: correggi i nomi nella sorgente prima di procedere.</p>':''}${people||'<p>Nessun evento rilevato in questa partita.</p>'}${warnings.length?`<details style="color:#ffc876"><summary>⚠ ${warnings.length} righe non riconosciute: verifica manuale richiesta</summary>${warnings.map(w=>`<p>${esc(w)}</p>`).join('')}</details><label class="hv-bulk-choice"><input type="checkbox" data-warnings="${i}"> Ho controllato le righe non riconosciute e completerò gli eventi mancanti manualmente</label>`:''}<label class="hv-bulk-choice"><input type="checkbox" data-import="${i}" ${!existing?'checked':''}> ${existing?'Sostituisci gli eventi salvati di questa partita (conferma esplicita)':'Importa questa partita'}</label></article>`;
  }).join('');status(`${matches.length} partite lette. Associa gli eventuali giocatori non riconosciuti e controlla prima di salvare.`);
  }
  function parseInput(){try {payload=JSON.parse($('hv-bulk-input').value.trim()); if(payload?.format!=='hertavernello-diretta-events-v1'||!Array.isArray(payload.partite))throw Error('Formato non riconosciuto. Usa il pulsante “Copia giornata” di Tampermonkey.');
      if(payload.partite.length>50)throw Error('Massimo 50 partite per importazione.');
      matches=payload.partite.map(m=>({ ...m, giornata:Number(m.giornata)||Number($('hv-bulk-giornata').value)||null,casaCodice:resolveTeam(m.casa),trasfertaCodice:resolveTeam(m.trasferta),golCasa:scoreOf(m,'golCasa'),golTrasferta:scoreOf(m,'golTrasferta'),entries:(m.eventi||[]).filter(e=>e?.nome&&['home','away'].includes(e.side)).map(e=>({ ...e, eventi:Object.fromEntries(defs.map(k=>[k,Math.max(0,Math.min(9,Number(e.eventi?.[k])||0))]).filter(([,v])=>v)) }))}));
      if(!matches.length)throw Error('Nessuna partita presente.');render();
    }catch(e){matches=[];$('hv-bulk-anteprima').innerHTML='';status('Errore importazione: '+e.message);}
  }
  async function saveAll(){const selected=[...document.querySelectorAll('.hv-bulk-card input[data-import]:checked')].map(x=>Number(x.dataset.import));if(!selected.length){status('Seleziona almeno una partita da importare.');return;}
    const items=[];
    for (const i of selected){const m=matches[i];if(m.nonRiconosciuti?.length&&!document.querySelector(`input[data-warnings="${i}"]`)?.checked){status(`Controlla prima le righe non riconosciute di ${m.casa} - ${m.trasferta}.`);return;}if(!m.casaCodice||!m.trasfertaCodice||m.casaCodice===m.trasfertaCodice){status(`Squadre non riconosciute per ${m.casa} - ${m.trasferta}.`);return;}
      const perPlayer=new Map();for(let j=0;j<m.entries.length;j++){const e=m.entries[j];const select=document.querySelector(`.hv-bulk-person[data-match="${i}"][data-person="${j}"]`); const player=db.find(p=>String(p.fantacalcioId)===String(select?.value));if(!player){status(`Associa prima ${e.nome} (${m.casa} - ${m.trasferta}).`);return;}
        const code=e.side==='home'?m.casaCodice:m.trasfertaCodice;if(player.squadraCodice!==code){status(`Squadra non coerente per ${e.nome}.`);return;}
        const key=String(player.fantacalcioId);if(!perPlayer.has(key))perPlayer.set(key,{fantacalcioId:key,nome:player.nome,squadraCodice:code,ruolo:player.ruolo,eventi:{}});
        for(const [k,v] of Object.entries(e.eventi||{}))if(defs.includes(k))perPlayer.get(key).eventi[k]=(perPlayer.get(key).eventi[k]||0)+v;
      }
      items.push({m,eventi:[...perPlayer.values()]});
    }
    if(!confirm(`Confermi l'importazione di ${items.length} partite? Le partite selezionate già presenti saranno SOSTITUITE; le altre rimarranno intatte.`))return;
    const btn=$('hv-bulk-save');btn.disabled=true;try{const latest=await window.HVMatchEvents.load();const next=structuredClone(latest);let replacements=0;
      for(const {m,eventi} of items){const original=(next.partite||[]).findIndex(r=>String(r.casaCodice)===m.casaCodice&&String(r.trasfertaCodice)===m.trasfertaCodice&&Number(r.giornata)===Number(m.giornata));
        if(!m.giornata){throw Error(`Indica la giornata Serie A per ${m.casa} - ${m.trasferta}.`);}
        const prev=original>=0?next.partite[original]:{};
        const record={...prev,matchId:prev.matchId||`g${m.giornata}-${m.casaCodice}-${m.trasfertaCodice}`,giornata:m.giornata,casaCodice:m.casaCodice,trasfertaCodice:m.trasfertaCodice,casaNome:teams.find(t=>t.codice===m.casaCodice)?.nome||m.casa,trasfertaNome:teams.find(t=>t.codice===m.trasfertaCodice)?.nome||m.trasferta,golCasa:m.golCasa,golTrasferta:m.golTrasferta,data:m.data||prev.data||null,stato:'FINALE',fonte:'Diretta.it (Tampermonkey, verificato Admin)',fonteUrl:m.url||'',aggiornatoIl:new Date().toISOString(),eventi};
        if(original>=0){next.partite[original]=record;replacements++;}else next.partite.push(record);
      }
      status('Salvataggio su GitHub in corso…');if(typeof hv_ghSalvaJSON!=='function')throw Error('Modulo GitHub non disponibile.');await hv_ghSalvaJSON('data/eventi-partite.json',next,`Importa eventi Serie A: ${items.length} partite`,config);
      saved=next;status(`Salvati ${items.length} incontri (${replacements} sostituiti). Archivio aggiornato.`);render();window.hv_initAdminEventiPartite && $('admin-eventi-archivio-refresh')?.click();
    }catch(e){status('Salvataggio non completato: '+e.message);}finally{btn.disabled=false;}
  }
  async function init(){if(initialized||window.hv_role!=='admin'||!$('hv-bulk-input'))return; initialized=true;try{const [players,teamRes,confRes,old]=await Promise.all([fetch('data/giocatori.json',{cache:'no-store'}).then(r=>r.json()),fetch('data/squadre-serie-a.json',{cache:'no-store'}).then(r=>r.json()),fetch('data/config.json',{cache:'no-store'}).then(r=>r.json()),window.HVMatchEvents.load()]);db=players.giocatori||players;teams=teamRes.squadre||[];config=confRes;saved=old;status('Incolla il JSON copiato da Tampermonkey.');}catch(e){status('Errore caricamento database: '+e.message);return;}
    $('hv-bulk-parse').addEventListener('click',parseInput);$('hv-bulk-save').addEventListener('click',saveAll);
  }
  window.hv_initBulkEventi=init;
})();
