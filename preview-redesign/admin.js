const ROOT = "../";
const $ = id => document.getElementById(id);

function refreshIcons(){ if(window.lucide) lucide.createIcons(); }

async function getJson(path){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(ROOT + path, { cache: "no-store", signal: controller.signal });
    if(!res.ok) throw new Error(`${path}: ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

async function renderAdminStatus(){
  try{
    const [config, rose, calendar] = await Promise.all([
      getJson("data/config.json"), getJson("data/rose.json"), getJson("data/calendario.json")
    ]);
    $("admin-team-count").textContent = config.squadre?.length ?? "—";
    const test = /test|casual/i.test(rose._leggimi || "");
    $("admin-roster-status").textContent = test ? "TEST" : ((rose.rose || []).length ? "CARICATE" : "VUOTE");
    $("admin-calendar-count").textContent = String((calendar.giornate || []).length);
  }catch(err){
    console.warn("Stato Admin non disponibile", err);
    if($("admin-roster-status")) $("admin-roster-status").textContent = "—";
  }
}

function activateTab(name){
  document.querySelectorAll("[data-admin-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.adminTab === name));
  document.querySelectorAll("[data-admin-view]").forEach(view => view.classList.toggle("active", view.dataset.adminView === name));
  history.replaceState(null, "", `#${name}`);
  refreshIcons();
}

function setupTabs(){
  document.querySelectorAll("[data-admin-tab]").forEach(btn => {
    btn.addEventListener("click", () => activateTab(btn.dataset.adminTab));
  });
  const requested = location.hash.replace("#", "");
  const allowed = ["config","rose","pagelle","previsioni","calendario"];
  activateTab(allowed.includes(requested) ? requested : "config");
}

window.hvPreviewAdminReady = function(){
  renderAdminStatus();
  refreshIcons();
};

setupTabs();
renderAdminStatus();
refreshIcons();
