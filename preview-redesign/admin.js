const ROOT = "../";
const $ = id => document.getElementById(id);
let activeAdminModule = 1;
let resizeTimer = null;

function refreshIcons(){ if(window.lucide) lucide.createIcons(); }

async function getJson(path){
  const res = await fetch(ROOT + path,{cache:"no-store"});
  if(!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function renderAdminStatus(){
  try{
    const [config,rose,calendar] = await Promise.all([
      getJson("data/config.json"),
      getJson("data/rose.json"),
      getJson("data/calendario.json")
    ]);
    $("admin-team-count").textContent = config.squadre?.length ?? "—";
    const test = /test|casual/i.test(rose._leggimi || "");
    $("admin-roster-status").textContent = test ? "TEST" : ((rose.rose || []).length ? "CARICATE" : "VUOTE");
    $("admin-calendar-count").textContent = String((calendar.giornate || []).length);
  }catch(err){
    console.warn(err);
    $("admin-roster-status").textContent = "—";
  }
}

const FRAME_CSS = `
:root{--bg-void:#050a11!important;--bg-card:#0a121e!important;--bg-card-2:#0d1725!important;--border-hairline:rgba(88,126,178,.14)!important;--text-primary:#eef5ff!important;--text-muted:#7f8fa5!important;--verde-prato:#54a7ff!important;--giallo-neon:#d8ad5b!important;--wine:#55417f!important;--wine-bright:#a887e8!important;--font-display:'Space Grotesk',Inter,sans-serif!important;--font-body:Inter,sans-serif!important}
html,body{height:auto!important;min-height:0!important;background:#050a11!important;color:#eef5ff!important;font-family:Inter,sans-serif!important}body{margin:0!important;overflow-x:hidden!important}.app{height:auto!important;min-height:0!important;background:#050a11!important}.admin-wrap{max-width:none!important;margin:0!important;padding:22px!important}.site-header{display:none!important}.admin-wrap>.warn-box{display:none!important}.admin-box{position:relative!important;background:linear-gradient(155deg,rgba(11,20,33,.98),rgba(6,12,21,.99))!important;border:1px solid rgba(84,126,184,.14)!important;border-radius:18px!important;padding:24px!important;margin:0!important;box-shadow:0 15px 38px rgba(0,0,0,.18)!important}.admin-wrap>.admin-box:not(.warn-box){padding-top:28px!important}.admin-wrap>.admin-box:not(.warn-box):before{content:'MODULO OPERATIVO';display:block;margin-bottom:8px;color:#65778f;font-size:8px;font-weight:800;letter-spacing:.14em}.admin-box h2{font-family:'Space Grotesk',sans-serif!important;font-size:22px!important;font-weight:650!important;text-transform:none!important;letter-spacing:-.025em!important;color:#edf5ff!important;margin:0 0 8px!important}.admin-box p.desc{color:#7f8ea2!important;font-size:12px!important;line-height:1.65!important}.admin-box input[type=text],.admin-box input[type=number],.admin-box input[type=password],.admin-box input[type=datetime-local],.admin-box input[type=file],.admin-box textarea,.admin-box select,.assoc-select,.previsione-riga select{box-sizing:border-box!important;background:#07101b!important;border:1px solid rgba(93,132,183,.16)!important;color:#e7f0fb!important;border-radius:10px!important;padding:11px 12px!important;font:500 12px Inter,sans-serif!important;outline:none!important}.admin-box input:focus,.admin-box textarea:focus,.admin-box select:focus{border-color:rgba(86,157,246,.48)!important;box-shadow:0 0 0 3px rgba(59,131,222,.07)!important}.admin-box textarea{min-height:110px!important;font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important}.admin-box button,a.output-download{border:1px solid rgba(74,151,249,.22)!important;border-radius:10px!important;background:linear-gradient(145deg,#173b67,#102d52)!important;color:#dbeeff!important;padding:10px 15px!important;font:700 10px Inter,sans-serif!important;letter-spacing:.01em!important;box-shadow:none!important;cursor:pointer!important}.admin-box button:hover,a.output-download:hover{border-color:rgba(90,167,255,.44)!important;filter:brightness(1.08)!important}.admin-box button[id*=salva]{background:linear-gradient(145deg,#5d471b,#3a2b11)!important;border-color:rgba(226,180,82,.26)!important;color:#f1cd7a!important}.admin-box button[id*=rimuovi],.calendario-riga button{background:rgba(116,54,75,.08)!important;border-color:rgba(210,91,126,.18)!important;color:#e297ae!important}.campo-riga{gap:10px!important}.campo-titolo{color:#aebed1!important;font-size:12px!important}.cfg-squadra-row,.assoc-row,.pagella-field,.previsione-field,.calendario-riga{border-color:rgba(255,255,255,.045)!important}.cfg-squadra-row{gap:9px!important}.fascia-gruppo{background:#07101b!important;border:1px solid rgba(255,255,255,.04)!important;border-radius:12px!important;padding:13px!important}.fascia-gruppo h5{color:#d5ad61!important}.previsione-dettagli summary{color:#79b2f8!important}.csv-avviso{color:#d68ca6!important}.output-download{display:inline-flex!important;text-decoration:none!important;margin-top:10px!important}code{color:#9bc8ff!important;background:rgba(48,111,185,.08)!important;border-radius:5px!important;padding:1px 4px!important}.hidden{display:none!important}
#gate{box-sizing:border-box!important;max-width:520px!important;margin:42px auto!important;padding:34px!important;border:1px solid rgba(79,132,204,.16)!important;border-radius:22px!important;background:radial-gradient(circle at 50% 0,rgba(74,96,190,.12),transparent 40%),#08111c!important;box-shadow:0 24px 60px rgba(0,0,0,.28)!important;text-align:center!important}.gate-logo{width:76px!important;height:76px!important;object-fit:contain!important}.gate h1{font:700 30px 'Space Grotesk',sans-serif!important}.gate p{color:#8090a5!important;font-size:12px!important}.gate input{box-sizing:border-box!important;width:100%!important;margin:12px 0 10px!important;padding:13px!important;border:1px solid rgba(82,132,195,.18)!important;border-radius:11px!important;background:#050b13!important;color:#fff!important}.gate button{padding:11px 20px!important;border:1px solid rgba(77,151,247,.25)!important;border-radius:10px!important;background:#13345d!important;color:#dcedff!important;font-weight:700!important}#admin-negato{color:#9aabc0!important}
@media(max-width:720px){.admin-wrap{padding:12px!important}.admin-box{padding:17px!important;border-radius:15px!important}.admin-box h2{font-size:19px!important}.campo-riga,.cfg-squadra-row{flex-direction:column!important;align-items:stretch!important}.pf-voto{max-width:none!important}.previsione-griglia{grid-template-columns:1fr!important}}
`;

function getModules(doc){
  return [...doc.querySelectorAll(".admin-wrap > .admin-box:not(.warn-box)")];
}

function styleLegacyAdmin(doc){
  if(!doc.getElementById("hv-preview-admin-style")){
    const style = doc.createElement("style");
    style.id = "hv-preview-admin-style";
    style.textContent = FRAME_CSS;
    doc.head.appendChild(style);
  }
  const legacyLogo = doc.querySelector(".gate-logo");
  if(legacyLogo) legacyLogo.src = "https://raw.githubusercontent.com/Emmanuele94/hertavernello/main/assets/hertavernello-restyling.webp";
}

function setOuterActive(index){
  document.querySelectorAll("#admin-jump button").forEach(btn=>{
    btn.classList.toggle("active", Number(btn.dataset.index) === index);
  });
}

function applyActiveModule(doc,index = activeAdminModule){
  const modules = getModules(doc);
  if(!modules.length) return;
  activeAdminModule = Math.max(1,Math.min(index,modules.length));
  modules.forEach((module,i)=>{
    module.style.setProperty("display", i === activeAdminModule - 1 ? "block" : "none", "important");
  });
  setOuterActive(activeAdminModule);
}

function visibleFrameTarget(doc){
  const gate = doc.getElementById("gate");
  const denied = doc.getElementById("admin-negato");
  const app = doc.getElementById("app");
  if(gate && getComputedStyle(gate).display !== "none") return gate;
  if(denied && getComputedStyle(denied).display !== "none") return denied;
  if(app && getComputedStyle(app).display !== "none") return app;
  return doc.body;
}

function resizeFrame(frame){
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(()=>{
    try{
      const doc = frame.contentDocument;
      if(!doc) return;
      const target = visibleFrameTarget(doc);
      frame.style.height = "320px";
      requestAnimationFrame(()=>{
        const rect = target.getBoundingClientRect();
        const contentHeight = Math.max(target.scrollHeight,target.offsetHeight,rect.height);
        const top = Math.max(0,rect.top);
        frame.style.height = `${Math.max(520,Math.ceil(top + contentHeight + 28))}px`;
      });
    }catch(err){ console.warn(err); }
  },35);
}

function syncAdminView(frame){
  const doc = frame.contentDocument;
  if(!doc) return;
  styleLegacyAdmin(doc);
  const app = doc.getElementById("app");
  if(app && getComputedStyle(app).display !== "none") applyActiveModule(doc);
  resizeFrame(frame);
}

function setupFrame(){
  const frame = $("admin-frame");
  setOuterActive(activeAdminModule);

  frame.addEventListener("load",()=>{
    const doc = frame.contentDocument;
    if(!doc) return;
    styleLegacyAdmin(doc);
    $("admin-frame-loading").style.display = "none";
    syncAdminView(frame);

    const observer = new MutationObserver(()=>syncAdminView(frame));
    observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
    if(doc.body && window.ResizeObserver){
      const ro = new ResizeObserver(()=>resizeFrame(frame));
      ro.observe(doc.body);
    }
    setTimeout(()=>syncAdminView(frame),350);
    setTimeout(()=>syncAdminView(frame),1000);
  });

  document.querySelectorAll("#admin-jump button").forEach(btn=>btn.addEventListener("click",()=>{
    const next = Number(btn.dataset.index);
    const doc = frame.contentDocument;
    if(!doc) return;
    activeAdminModule = next;
    applyActiveModule(doc,next);
    resizeFrame(frame);
    const shellTop = $("admin-frame-shell").offsetTop - 84;
    window.scrollTo({top:shellTop,behavior:"smooth"});
  }));
}

async function init(){
  refreshIcons();
  await renderAdminStatus();
  setupFrame();
}

init();
