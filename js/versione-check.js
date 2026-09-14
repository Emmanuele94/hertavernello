// Gestione separata di:
// 1) release del sito: aggiorna CSS/JS/service worker senza fare logout;
// 2) sessione globale: il comando Admin "Disconnetti tutti" cambia `v` e
//    continua a invalidare le sessioni su tutti i dispositivi.

const HV_CHIAVE_VERSIONE_VISTA = "hv_versione_vista";
const HV_CHIAVE_RELEASE_VISTA = "hv_release_vista";

function hv_pulisciSessioneELocale() {
  sessionStorage.clear();
  Object.keys(localStorage).forEach((chiave) => {
    if (chiave.indexOf("hv_cache_") === 0) localStorage.removeItem(chiave);
  });
}

function hv_urlRicaricaRelease() {
  const url = new URL(location.href);
  url.searchParams.set("_release", Date.now());
  return url.pathname + url.search + url.hash;
}

async function hv_aggiornaServiceWorkerERicarica() {
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    }
  } catch (_) {
    // Il versionamento degli asset nell'HTML garantisce comunque il refresh.
  }
  location.replace(hv_urlRicaricaRelease());
}

async function hv_controllaVersione(alCambioRicarica = true) {
  try {
    const res = await fetch("data/versione.json?_=" + Date.now(), { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();

    const versioneSessione = String(data.v ?? "");
    const release = String(data.release ?? "");
    const sessioneVista = localStorage.getItem(HV_CHIAVE_VERSIONE_VISTA);
    const releaseVista = localStorage.getItem(HV_CHIAVE_RELEASE_VISTA);

    // Prima visita: memorizza lo stato senza interrompere il login.
    if (!sessioneVista && versioneSessione) {
      localStorage.setItem(HV_CHIAVE_VERSIONE_VISTA, versioneSessione);
    }
    if (!releaseVista && release) {
      localStorage.setItem(HV_CHIAVE_RELEASE_VISTA, release);
    }

    // "Disconnetti tutti": è l'unico caso in cui la sessione viene cancellata.
    if (sessioneVista && versioneSessione && sessioneVista !== versioneSessione && alCambioRicarica) {
      hv_pulisciSessioneELocale();
      localStorage.setItem(HV_CHIAVE_VERSIONE_VISTA, versioneSessione);
      if (release) localStorage.setItem(HV_CHIAVE_RELEASE_VISTA, release);
      location.replace(hv_urlRicaricaRelease());
      return;
    }

    // Nuova release: aggiorna gli asset senza disconnettere l'utente.
    if (releaseVista && release && releaseVista !== release && alCambioRicarica) {
      localStorage.setItem(HV_CHIAVE_RELEASE_VISTA, release);
      await hv_aggiornaServiceWorkerERicarica();
    }
  } catch (_) {
    // Offline o file non raggiungibile: il sito resta utilizzabile e riprova dopo.
  }
}

hv_controllaVersione(true);
setInterval(() => hv_controllaVersione(true), 2 * 60 * 1000);
