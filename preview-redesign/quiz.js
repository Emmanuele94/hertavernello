const ROOT = "../";
const API = "https://hertavernello-api-proxy.emmanueletufano.workers.dev";
const STORAGE_KEY = "hv_preview_quiz_progress";
const $ = id => document.getElementById(id);

const state = {
  config: null,
  archive: null,
  matches: [],
  rounds: [],
  selectedRound: null,
  questions: [],
  index: 0,
  score: 0,
  answered: false,
};

function refreshIcons(){ if(window.lucide) lucide.createIcons(); }
function esc(v=""){ return String(v).replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[c])); }
async function getJson(path){ const r=await fetch(ROOT+path,{cache:"no-store"}); if(!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); }

function seeded(seed){
  let s = seed % 2147483647; if(s<=0) s += 2147483646;
  return () => { s = (s*16807)%2147483647; return (s-1)/2147483646; };
}
function shuffle(arr,rng){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function pick(arr,n,rng){ return shuffle(arr,rng).slice(0,n); }

function progress(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");}catch{return {};}
}
function saveProgress(round,score,total){
  const p=progress(); p[round]={score,total,date:new Date().toISOString()};
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(p));}catch{}
  updateHeroStats();
}

async function loadMatches(){
  const r=await fetch(`${API}/competitions/SA/matches`,{cache:"no-store"});
  if(!r.ok) throw new Error(`Serie A matches: ${r.status}`);
  const data=await r.json();
  state.matches=(data.matches||[]).map(m=>({
    id:m.id, round:Number(m.matchday), status:m.status, date:m.utcDate,
    home:m.homeTeam?.shortName||m.homeTeam?.name||"Casa",
    away:m.awayTeam?.shortName||m.awayTeam?.name||"Trasferta",
    hg:m.score?.fullTime?.home, ag:m.score?.fullTime?.away,
  })).filter(m=>m.round);
}

function buildRounds(){
  const by=new Map();
  state.matches.forEach(m=>{ if(!by.has(m.round)) by.set(m.round,[]); by.get(m.round).push(m); });
  state.rounds=[...by.entries()].map(([round,matches])=>({
    round,
    matches:matches.sort((a,b)=>new Date(a.date)-new Date(b.date)),
    available:matches.length>=8 && matches.every(m=>m.status==="FINISHED" && m.hg!=null && m.ag!=null),
  })).sort((a,b)=>a.round-b.round);
}

function historicalNames(){
  const set=new Set();
  (state.archive?.stagioni||[]).forEach(s=>{(s.campionato||[]).forEach(x=>set.add(x));(s.coppa||[]).forEach(x=>set.add(x));});
  return [...set];
}
function makeOptions(correct,distractors,rng){
  const pool=[...new Set(distractors.filter(x=>x && x!==correct))];
  const others=pick(pool,2,rng);
  if(others.length<2) return null;
  return shuffle([{text:correct,correct:true},...others.map(x=>({text:x,correct:false}))],rng);
}

function resultQuestion(m,rng){
  const correct=m.hg>m.ag?m.home:m.ag>m.hg?m.away:"Pareggio";
  const options=shuffle([
    {text:m.home,correct:correct===m.home},
    {text:m.away,correct:correct===m.away},
    {text:"Pareggio",correct:correct==="Pareggio"},
  ],rng);
  return {category:"SERIE A · RISULTATO",icon:"circle-dot",text:`Chi ha vinto ${m.home} — ${m.away}?`,options,explanation:`Risultato finale: ${m.home} ${m.hg}–${m.ag} ${m.away}.`};
}
function scoreQuestion(m,rng){
  const actual=`${m.hg} – ${m.ag}`;
  const candidates=[`${m.hg+1} – ${m.ag}`,`${m.hg} – ${m.ag+1}`,`${Math.max(0,m.hg-1)} – ${m.ag}`,`${m.hg} – ${Math.max(0,m.ag-1)}`,`${m.ag} – ${m.hg}`];
  const options=makeOptions(actual,candidates,rng);
  if(!options) return null;
  return {category:"SERIE A · PUNTEGGIO",icon:"goal",text:`Come è finita ${m.home} — ${m.away}?`,options,explanation:`Il punteggio finale è stato ${actual}.`};
}
function totalGoalsQuestion(matches,rng){
  const total=matches.reduce((n,m)=>n+m.hg+m.ag,0);
  const options=makeOptions(String(total),[String(Math.max(0,total-3)),String(total+3),String(Math.max(0,total-2)),String(total+2)],rng);
  return options?{category:"SERIE A · GIORNATA",icon:"sigma",text:"Quanti gol sono stati segnati complessivamente nella giornata?",options,explanation:`Le ${matches.length} partite hanno prodotto ${total} gol.`}:null;
}
function drawsQuestion(matches,rng){
  const n=matches.filter(m=>m.hg===m.ag).length;
  const options=makeOptions(String(n),[String(n+1),String(Math.max(0,n-1)),String(n+2),String(Math.max(0,n-2))],rng);
  return options?{category:"SERIE A · GIORNATA",icon:"equal",text:"Quante partite della giornata sono finite in pareggio?",options,explanation:`I pareggi sono stati ${n}.`}:null;
}
function biggestMarginQuestion(matches,rng){
  const ranked=matches.map(m=>({m,margin:Math.abs(m.hg-m.ag)})).filter(x=>x.margin>0).sort((a,b)=>b.margin-a.margin);
  if(ranked.length<3 || ranked.filter(x=>x.margin===ranked[0].margin).length!==1) return null;
  const top=ranked[0]; const correct=top.m.hg>top.m.ag?top.m.home:top.m.away;
  const distractors=ranked.slice(1).map(x=>x.m.hg>x.m.ag?x.m.home:x.m.away).filter(Boolean);
  const options=makeOptions(correct,distractors,rng); if(!options) return null;
  return {category:"SERIE A · GIORNATA",icon:"move-up-right",text:"Quale squadra ha ottenuto la vittoria con il margine più ampio?",options,explanation:`${correct} ha vinto con ${top.margin} gol di scarto.`};
}
function mostGoalsMatchQuestion(matches,rng){
  const ranked=matches.map(m=>({m,total:m.hg+m.ag})).sort((a,b)=>b.total-a.total);
  if(ranked.length<3 || ranked.filter(x=>x.total===ranked[0].total).length!==1) return null;
  const correct=`${ranked[0].m.home} — ${ranked[0].m.away}`;
  const options=makeOptions(correct,ranked.slice(1).map(x=>`${x.m.home} — ${x.m.away}`),rng); if(!options) return null;
  return {category:"SERIE A · GIORNATA",icon:"flame",text:"Quale partita ha avuto più gol complessivi?",options,explanation:`${correct} ha prodotto ${ranked[0].total} gol.`};
}

function historyQuestions(rng){
  const seasons=(state.archive?.stagioni||[]).filter(s=>!s.inCorso);
  const names=historicalNames();
  const pool=[];

  seasons.filter(s=>(s.campionato||[]).length===1).forEach(s=>{
    const correct=s.campionato[0]; const options=makeOptions(correct,names,rng); if(options) pool.push({category:"HERTAVERNELLO · STORIA",icon:"trophy",text:`Chi ha vinto il campionato Hertavernello ${s.anno}?`,options,explanation:`Il campione ${s.anno} è ${correct}.`});
  });
  seasons.filter(s=>(s.coppa||[]).length===1).forEach(s=>{
    const correct=s.coppa[0]; const options=makeOptions(correct,names,rng); if(options) pool.push({category:"HERTAVERNELLO · COPPA",icon:"award",text:`Chi ha vinto la Coppa Hertavernello ${s.anno}?`,options,explanation:`La Coppa ${s.anno} è stata vinta da ${correct}.`});
  });

  const leagueCount={}; seasons.forEach(s=>(s.campionato||[]).forEach(n=>leagueCount[n]=(leagueCount[n]||0)+1));
  const leagueRank=Object.entries(leagueCount).sort((a,b)=>b[1]-a[1]);
  if(leagueRank.length>=3 && leagueRank[0][1]>leagueRank[1][1]){
    const options=makeOptions(leagueRank[0][0],leagueRank.slice(1).map(x=>x[0]),rng);
    if(options) pool.push({category:"HERTAVERNELLO · ALBO D’ORO",icon:"crown",text:"Chi ha vinto più campionati Hertavernello nello storico registrato?",options,explanation:`${leagueRank[0][0]} guida con ${leagueRank[0][1]} titoli di campionato.`});
  }

  const total={}; seasons.forEach(s=>{(s.campionato||[]).forEach(n=>total[n]=(total[n]||0)+1);(s.coppa||[]).forEach(n=>total[n]=(total[n]||0)+1);});
  const totalRank=Object.entries(total).sort((a,b)=>b[1]-a[1]);
  if(totalRank.length>=3 && totalRank[0][1]>totalRank[1][1]){
    const options=makeOptions(totalRank[0][0],totalRank.slice(1).map(x=>x[0]),rng);
    if(options) pool.push({category:"HERTAVERNELLO · PALMARÈS",icon:"medal",text:"Chi ha più trofei complessivi tra campionato e coppa nello storico Hertavernello?",options,explanation:`${totalRank[0][0]} è in testa con ${totalRank[0][1]} trofei registrati.`});
  }
  return pool;
}

function buildQuestions(round){
  const entry=state.rounds.find(r=>r.round===round); if(!entry?.available) return [];
  const rng=seeded(round*9973+202627);
  const matches=entry.matches;
  const pool=[];

  matches.forEach(m=>{pool.push(resultQuestion(m,rng)); const q=scoreQuestion(m,rng); if(q) pool.push(q);});
  [totalGoalsQuestion(matches,rng),drawsQuestion(matches,rng),biggestMarginQuestion(matches,rng),mostGoalsMatchQuestion(matches,rng)].forEach(q=>q&&pool.push(q));
  pool.push(...historyQuestions(rng));

  const history=pool.filter(q=>q.category.startsWith("HERTAVERNELLO"));
  const seriea=pool.filter(q=>q.category.startsWith("SERIE A"));
  const chosen=[...pick(history,Math.min(4,history.length),rng),...pick(seriea,10-Math.min(4,history.length),rng)];
  if(chosen.length<10){
    const used=new Set(chosen.map(q=>q.text));
    chosen.push(...pick(pool.filter(q=>!used.has(q.text)),10-chosen.length,rng));
  }
  return shuffle(chosen,rng).slice(0,10);
}

function updateHeroStats(){
  const p=progress(); const available=state.rounds.filter(r=>r.available);
  $("available-count").textContent=String(available.length);
  const scores=Object.values(p); const best=scores.sort((a,b)=>b.score-a.score)[0];
  $("best-score").textContent=best?`${best.score}/${best.total}`:"—";
  const latest=Object.entries(p).sort((a,b)=>new Date(b[1].date)-new Date(a[1].date))[0];
  $("last-played").textContent=latest?`G${latest[0]}`:"—";
}

function renderRounds(){
  const wrap=$("round-list"), p=progress();
  if(!state.rounds.length){wrap.innerHTML=`<div class="quiz-game-empty"><p>Nessuna giornata Serie A trovata.</p></div>`;return;}
  wrap.innerHTML=state.rounds.map(r=>{
    const done=p[r.round]; const active=r.round===state.selectedRound;
    return `<button class="round-button${active?" active":""}" data-round="${r.round}" ${r.available?"":"disabled"}>
      <span class="round-number">G${r.round}</span>
      <span class="round-copy"><strong>Giornata ${r.round}</strong><small>${r.available?"Quiz disponibile":"In attesa dei finali"}</small></span>
      ${done?`<span class="round-score">${done.score}/${done.total}</span>`:`<span class="round-status ${r.available?"done":""}"><i data-lucide="${r.available?"play":"lock-keyhole"}"></i></span>`}
    </button>`;
  }).join("");
  wrap.querySelectorAll(".round-button:not(:disabled)").forEach(btn=>btn.addEventListener("click",()=>selectRound(Number(btn.dataset.round))));
  refreshIcons();
}

function selectRound(round){
  state.selectedRound=round; state.questions=buildQuestions(round); state.index=0; state.score=0; state.answered=false;
  renderRounds(); renderStart();
}

function renderStart(){
  const game=$("quiz-game");
  if(!state.selectedRound){
    game.innerHTML=`<div class="quiz-game-empty"><span><i data-lucide="lock-keyhole"></i></span><strong>Nessuna giornata ancora disponibile</strong><p>Il quiz si sblocca solo quando tutte le partite della giornata Serie A risultano concluse.</p></div>`; refreshIcons(); return;
  }
  if(state.questions.length<10){
    game.innerHTML=`<div class="quiz-game-empty"><span><i data-lucide="database-zap"></i></span><strong>Dati insufficienti per 10 domande</strong><p>Non completo il quiz con domande inventate. Appena i dati reali bastano, la giornata diventa giocabile.</p></div>`; refreshIcons(); return;
  }
  game.innerHTML=`<div class="quiz-start">
    <span class="quiz-start-icon"><i data-lucide="brain-circuit"></i></span>
    <small>GIORNATA ${state.selectedRound} · 10 DOMANDE</small>
    <h2>Pronto a giocare?</h2>
    <p>Risultati Serie A reali + storia Hertavernello. Il punteggio viene salvato solo su questo browser.</p>
    <button class="quiz-primary" id="start-quiz" type="button">Inizia il quiz <i data-lucide="play"></i></button>
  </div>`;
  $("start-quiz").addEventListener("click",()=>{state.index=0;state.score=0;renderQuestion();}); refreshIcons();
}

function renderQuestion(){
  const q=state.questions[state.index]; if(!q){renderResult();return;}
  state.answered=false;
  const letters=["A","B","C","D"];
  $("quiz-game").innerHTML=`<div class="quiz-run">
    <div class="quiz-run-head"><span class="quiz-question-count">DOMANDA ${state.index+1} / ${state.questions.length}</span><span class="quiz-category"><i data-lucide="${q.icon}"></i>${esc(q.category)}</span></div>
    <div class="quiz-progress"><span style="width:${((state.index+1)/state.questions.length)*100}%"></span></div>
    <div class="quiz-question"><h2>${esc(q.text)}</h2></div>
    <div class="quiz-options">${q.options.map((o,i)=>`<button class="quiz-option" data-i="${i}" type="button"><span class="quiz-option-letter">${letters[i]}</span><strong>${esc(o.text)}</strong></button>`).join("")}</div>
    <div class="quiz-feedback" id="quiz-feedback" hidden></div>
  </div>`;
  document.querySelectorAll(".quiz-option").forEach(btn=>btn.addEventListener("click",()=>answer(Number(btn.dataset.i)))); refreshIcons();
}

function answer(choice){
  if(state.answered) return; state.answered=true;
  const q=state.questions[state.index]; const selected=q.options[choice]; if(selected.correct) state.score++;
  document.querySelectorAll(".quiz-option").forEach((btn,i)=>{btn.disabled=true;if(q.options[i].correct)btn.classList.add("correct");else if(i===choice)btn.classList.add("wrong");});
  const feedback=$("quiz-feedback"); feedback.hidden=false;
  feedback.innerHTML=`<div class="quiz-feedback-copy"><i data-lucide="${selected.correct?"circle-check-big":"circle-x"}"></i><span>${selected.correct?"Risposta corretta.":"Risposta sbagliata."} ${esc(q.explanation||"")}</span></div><button class="quiz-next" id="quiz-next" type="button">${state.index===state.questions.length-1?"Risultato":"Prossima"} <i data-lucide="arrow-right"></i></button>`;
  $("quiz-next").addEventListener("click",()=>{state.index++; if(state.index>=state.questions.length)renderResult();else renderQuestion();}); refreshIcons();
}

function renderResult(){
  saveProgress(state.selectedRound,state.score,state.questions.length); renderRounds();
  const pct=Math.round((state.score/state.questions.length)*100);
  let title="Da rivedere"; if(pct>=90)title="Enciclopedia Hertavernello"; else if(pct>=70)title="Fantallenatore preparato"; else if(pct>=50)title="Buona base";
  $("quiz-game").innerHTML=`<div class="quiz-result">
    <div class="quiz-result-score"><div><strong>${state.score}/${state.questions.length}</strong><small>${pct}% CORRETTE</small></div></div>
    <h2>${title}</h2><p>Risultato della Giornata ${state.selectedRound}. Puoi riprovare: le domande restano coerenti con gli stessi dati reali.</p>
    <div class="quiz-result-actions"><button class="quiz-primary" id="retry-quiz" type="button"><i data-lucide="rotate-ccw"></i> Riprova</button><button class="quiz-secondary" id="choose-round" type="button">Scegli un’altra giornata</button></div>
  </div>`;
  $("retry-quiz").addEventListener("click",()=>{state.questions=buildQuestions(state.selectedRound);state.index=0;state.score=0;renderQuestion();});
  $("choose-round").addEventListener("click",()=>document.querySelector(".quiz-rounds-card")?.scrollIntoView({behavior:"smooth",block:"start"})); refreshIcons();
}

function setupPending(){
  const toast=$("preview-toast"); document.querySelectorAll(".preview-pending").forEach(el=>el.addEventListener("click",e=>{e.preventDefault();toast.classList.add("show");clearTimeout(window.__quizToast);window.__quizToast=setTimeout(()=>toast.classList.remove("show"),2200);}));
}

async function init(){
  try{
    const [config,archive]=await Promise.all([getJson("data/config.json"),getJson("data/albo-oro.json")]);
    state.config=config; state.archive=archive; $("brand-season").textContent=`Stagione ${config.lega.stagione}`;
    await loadMatches(); buildRounds(); updateHeroStats();
    const latest=[...state.rounds].reverse().find(r=>r.available); state.selectedRound=latest?.round||null;
    if(state.selectedRound) state.questions=buildQuestions(state.selectedRound);
    renderRounds(); renderStart();
  }catch(err){
    console.error(err); $("round-list").innerHTML=`<div class="quiz-side-intro">Non riesco a leggere i dati Serie A.</div>`;
    $("quiz-game").innerHTML=`<div class="quiz-game-empty"><span><i data-lucide="cloud-off"></i></span><strong>Quiz non disponibile</strong><p>La preview non genera domande di fallback: riproverà quando API e dati locali saranno raggiungibili.</p></div>`;
  }
  setupPending(); refreshIcons();
}

init();
