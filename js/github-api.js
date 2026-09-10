// Wrapper minimo per la Contents API di GitHub.
// Serve solo a leggere/scrivere singoli file nel repository — niente altro.

const HV_GH_API = "https://api.github.com";

function hv_utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function hv_base64ToUtf8(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// Il token GitHub non viene MAI salvato nel repository: GitHub lo revocherebbe
// in automatico appena lo trovasse in un commit di un repository pubblico.
// Vive solo in sessionStorage di questa scheda del browser: si incolla una
// volta, sparisce chiudendo la scheda o il browser.
function hv_getGithubToken() {
  let token = sessionStorage.getItem("hv_gh_token");
  if (token) return token;

  token = prompt(
    "Incolla il token GitHub (github_pat_...).\n\nResta solo in questa scheda del browser, non viene MAI salvato nel repository — dovrai reincollarlo se chiudi e riapri il browser."
  );
  if (token) {
    token = token.trim();
    sessionStorage.setItem("hv_gh_token", token);
  }
  return token;
}

function hv_cambiaGithubToken() {
  sessionStorage.removeItem("hv_gh_token");
  return hv_getGithubToken();
}

async function hv_ghGetFile(owner, repo, path, token, branch = "main") {
  const res = await fetch(`${HV_GH_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub GET ${path} → ${res.status}`);
  }
  return res.json();
}

async function hv_ghPutFile(owner, repo, path, token, contentBase64, message, sha, branch = "main") {
  const body = { message, content: contentBase64, branch };
  if (sha) body.sha = sha;

  const res = await fetch(`${HV_GH_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub PUT ${path} → ${res.status}`);
  }
  return res.json();
}

async function hv_ghDeleteFile(owner, repo, path, token, sha, message, branch = "main") {
  const res = await fetch(`${HV_GH_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, sha, branch }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub DELETE ${path} → ${res.status}`);
  }
  return res.json();
}

// Salva un oggetto JS come file JSON nel repository (crea o aggiorna).
async function hv_ghSalvaJSON(percorso, oggetto, messaggio, config) {
  const { githubOwner: owner, githubRepo: repo } = config.lega;
  const token = hv_getGithubToken();
  if (!token || !owner || !repo) {
    throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");
  }
  const esistente = await hv_ghGetFile(owner, repo, percorso, token);
  const contenuto = hv_utf8ToBase64(JSON.stringify(oggetto, null, 2));
  await hv_ghPutFile(owner, repo, percorso, token, contenuto, messaggio, esistente ? esistente.sha : null);
}

// Carica/aggiorna il logo personalizzato di una fantasquadra e aggiorna loghi-fantasquadre.json.
async function hv_caricaLogoSquadraViaGitHub(squadraId, file, config) {
  const { githubOwner: owner, githubRepo: repo } = config.lega;
  const token = hv_getGithubToken();
  if (!token || !owner || !repo) {
    throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const nomeFile = `${squadraId}.${ext}`;
  const percorsoImmagine = `assets/stemmi/${nomeFile}`;

  const contentBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Impossibile leggere il file selezionato."));
    reader.readAsDataURL(file);
  });

  const esistenteImg = await hv_ghGetFile(owner, repo, percorsoImmagine, token);
  await hv_ghPutFile(owner, repo, percorsoImmagine, token, contentBase64, `Aggiorna logo ${squadraId}`, esistenteImg ? esistenteImg.sha : null);

  const fileJson = await hv_ghGetFile(owner, repo, "data/loghi-fantasquadre.json", token);
  if (!fileJson) throw new Error("Non trovo data/loghi-fantasquadre.json nel repository.");

  const loghiObj = JSON.parse(hv_base64ToUtf8(fileJson.content));
  if (!loghiObj.loghi) loghiObj.loghi = [];
  let entry = loghiObj.loghi.find((p) => p.squadraId === squadraId);
  if (!entry) {
    entry = { squadraId, immagine: "" };
    loghiObj.loghi.push(entry);
  }

  const vecchioNomeFile = entry.immagine;
  if (vecchioNomeFile && vecchioNomeFile !== nomeFile) {
    try {
      const vecchioFile = await hv_ghGetFile(owner, repo, `assets/stemmi/${vecchioNomeFile}`, token);
      if (vecchioFile) {
        await hv_ghDeleteFile(owner, repo, `assets/stemmi/${vecchioNomeFile}`, token, vecchioFile.sha, `Rimuovi vecchio logo ${squadraId}`);
      }
    } catch (e) {}
  }

  entry.immagine = nomeFile;

  const nuovoContenuto = hv_utf8ToBase64(JSON.stringify(loghiObj, null, 2));
  await hv_ghPutFile(owner, repo, "data/loghi-fantasquadre.json", token, nuovoContenuto, `Aggiorna loghi-fantasquadre.json (${squadraId})`, fileJson.sha);

  return percorsoImmagine;
}

// Ridimensiona un'immagine lato client (canvas) prima di caricarla — così
// qualunque foto carichi l'admin, il file salvato resta piccolo e quadrato
// al massimo 512x512, senza dover installare nulla o pre-ridimensionare a mano.
function hv_ridimensionaImmagine(file, latoMax) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scala = Math.min(1, latoMax / Math.max(img.width, img.height));
        const w = Math.round(img.width * scala);
        const h = Math.round(img.height * scala);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Impossibile elaborare l'immagine."))), "image/png");
      };
      img.onerror = () => reject(new Error("File immagine non valido."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Impossibile leggere il file selezionato."));
    reader.readAsDataURL(file);
  });
}

// Logo piccolo (512x512): stesso principio del logo grande, ma salvato in una
// cartella diversa (assets/stemmi-piccoli/) e in un campo diverso dello stesso
// data/loghi-fantasquadre.json — pensato per le classifiche, non per l'intestazione.
async function hv_caricaLogoPiccoloSquadraViaGitHub(squadraId, file, config) {
  const { githubOwner: owner, githubRepo: repo } = config.lega;
  const token = hv_getGithubToken();
  if (!token || !owner || !repo) {
    throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");
  }

  const blobRidimensionato = await hv_ridimensionaImmagine(file, 512);
  const nomeFile = `${squadraId}.png`;
  const percorsoImmagine = `assets/stemmi-piccoli/${nomeFile}`;

  const contentBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Impossibile leggere l'immagine ridimensionata."));
    reader.readAsDataURL(blobRidimensionato);
  });

  const esistenteImg = await hv_ghGetFile(owner, repo, percorsoImmagine, token);
  await hv_ghPutFile(owner, repo, percorsoImmagine, token, contentBase64, `Aggiorna logo piccolo ${squadraId}`, esistenteImg ? esistenteImg.sha : null);

  const fileJson = await hv_ghGetFile(owner, repo, "data/loghi-fantasquadre.json", token);
  if (!fileJson) throw new Error("Non trovo data/loghi-fantasquadre.json nel repository.");

  const loghiObj = JSON.parse(hv_base64ToUtf8(fileJson.content));
  if (!loghiObj.loghi) loghiObj.loghi = [];
  let entry = loghiObj.loghi.find((p) => p.squadraId === squadraId);
  if (!entry) {
    entry = { squadraId, immagine: "" };
    loghiObj.loghi.push(entry);
  }
  entry.immaginePiccola = nomeFile;

  const nuovoContenuto = hv_utf8ToBase64(JSON.stringify(loghiObj, null, 2));
  await hv_ghPutFile(owner, repo, "data/loghi-fantasquadre.json", token, nuovoContenuto, `Aggiorna logo piccolo ${squadraId} in loghi-fantasquadre.json`, fileJson.sha);
  return percorsoImmagine;
}

// Video "Highlights" della fantasquadra (es. i momenti dell'asta) — stesso file
// loghi-fantasquadre.json, un campo in più per squadra, nessun file nuovo.
// "video" è un ARRAY: come in Archivio, se ne possono aggiungere quanti si vuole.
// I video highlights sono legati alla STAGIONE (config.lega.stagione, es.
// "2026/2027"): entry.video è un oggetto { "2026/2027": [...], "2025/2026":
// [...] }, mai un array unico — così caricare gli highlights di un'asta
// nuova non sovrascrive mai quelli di quella vecchia.
async function hv_salvaVideoHighlightViaGitHub(squadraId, stagioneAttuale, videoArray, config) {
  const { githubOwner: owner, githubRepo: repo } = config.lega;
  const token = hv_getGithubToken();
  if (!token || !owner || !repo) {
    throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");
  }

  const fileJson = await hv_ghGetFile(owner, repo, "data/loghi-fantasquadre.json", token);
  if (!fileJson) throw new Error("Non trovo data/loghi-fantasquadre.json nel repository.");

  const loghiObj = JSON.parse(hv_base64ToUtf8(fileJson.content));
  if (!loghiObj.loghi) loghiObj.loghi = [];
  let entry = loghiObj.loghi.find((p) => p.squadraId === squadraId);
  if (!entry) {
    entry = { squadraId, immagine: "" };
    loghiObj.loghi.push(entry);
  }
  // Se una versione vecchia del sito aveva salvato qui un array semplice
  // (formato pre-2026), lo scarto: non è recuperabile in modo affidabile
  // per una singola stagione, meglio ripartire puliti che tenerlo sbagliato.
  if (!entry.video || Array.isArray(entry.video)) entry.video = {};
  entry.video[stagioneAttuale] = videoArray;

  const nuovoContenuto = hv_utf8ToBase64(JSON.stringify(loghiObj, null, 2));
  await hv_ghPutFile(owner, repo, "data/loghi-fantasquadre.json", token, nuovoContenuto, `Aggiorna video highlights ${squadraId} (${stagioneAttuale})`, fileJson.sha);
}

// Duplica un file già presente nel repository su un nuovo percorso (usata
// per congelare stemmi/loghi al momento dell'archiviazione: così anche se il
// file originale viene sostituito in futuro, la copia archiviata resta
// intatta). Ritorna il nuovo percorso, o null se il file di origine non
// esiste (es. quella fantasquadra non ha ancora caricato un logo).
async function hv_copiaFileGitHub(owner, repo, percorsoOrigine, percorsoDestinazione, token, messaggio) {
  const origine = await hv_ghGetFile(owner, repo, percorsoOrigine, token);
  if (!origine) return null;
  await hv_ghPutFile(owner, repo, percorsoDestinazione, token, origine.content, messaggio, null);
  return percorsoDestinazione;
}

// Video di una STAGIONE in Archivio (data/albo-oro.json) — array di link,
// stesso principio del video di Squadre ma per anno invece che per squadraId.
async function hv_salvaVideoStagioneViaGitHub(annoStagione, videoArray, config) {
  const { githubOwner: owner, githubRepo: repo } = config.lega;
  const token = hv_getGithubToken();
  if (!token || !owner || !repo) {
    throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");
  }

  const fileJson = await hv_ghGetFile(owner, repo, "data/albo-oro.json", token);
  if (!fileJson) throw new Error("Non trovo data/albo-oro.json nel repository.");

  const alboObj = JSON.parse(hv_base64ToUtf8(fileJson.content));
  const stagione = (alboObj.stagioni || []).find((s) => s.anno === annoStagione);
  if (!stagione) throw new Error(`Stagione ${annoStagione} non trovata in albo-oro.json.`);
  stagione.video = videoArray;

  const nuovoContenuto = hv_utf8ToBase64(JSON.stringify(alboObj, null, 2));
  await hv_ghPutFile(owner, repo, "data/albo-oro.json", token, nuovoContenuto, `Aggiorna video stagione ${annoStagione}`, fileJson.sha);
}

function hv_slugifyNomeFile(testo) {
  return (
    (testo || "foto")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "foto"
  );
}

// Foto caricata a mano per UN giocatore storico (data/foto-storiche.json +
// il file immagine su assets/calciatori-storici/). Sostituisce l'eventuale
// foto già caricata per lo stesso nome+squadra reale, cancellando il vecchio
// file. Ritorna la voce salvata, così archivio.js può aggiornare subito la
// sua copia in memoria senza dover ricaricare tutto il JSON da GitHub.
async function hv_caricaFotoStoricaViaGitHub(nome, squadraReale, file, config) {
  const { githubOwner: owner, githubRepo: repo } = config.lega;
  const token = hv_getGithubToken();
  if (!token || !owner || !repo) {
    throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const nomeFile = `${hv_slugifyNomeFile(nome)}-${Date.now()}.${ext}`;
  const percorsoImmagine = `assets/calciatori-storici/${nomeFile}`;

  const contentBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Impossibile leggere il file selezionato."));
    reader.readAsDataURL(file);
  });

  await hv_ghPutFile(owner, repo, percorsoImmagine, token, contentBase64, `Aggiungi foto storica ${nome}`, null);

  const fileJson = await hv_ghGetFile(owner, repo, "data/foto-storiche.json", token);
  const fotoObj = fileJson ? JSON.parse(hv_base64ToUtf8(fileJson.content)) : { foto: [] };
  if (!fotoObj.foto) fotoObj.foto = [];

  let entry = fotoObj.foto.find((f) => f.nome === nome && (f.squadraReale || "") === (squadraReale || ""));
  const vecchiaImmagine = entry ? entry.immagine : null;
  if (!entry) {
    entry = { nome, squadraReale: squadraReale || "" };
    fotoObj.foto.push(entry);
  }
  entry.immagine = percorsoImmagine;

  const nuovoContenuto = hv_utf8ToBase64(JSON.stringify(fotoObj, null, 2));
  await hv_ghPutFile(owner, repo, "data/foto-storiche.json", token, nuovoContenuto, `Aggiorna foto-storiche.json (${nome})`, fileJson ? fileJson.sha : null);

  if (vecchiaImmagine && vecchiaImmagine !== percorsoImmagine) {
    try {
      const vecchioFile = await hv_ghGetFile(owner, repo, vecchiaImmagine, token);
      if (vecchioFile) await hv_ghDeleteFile(owner, repo, vecchiaImmagine, token, vecchioFile.sha, `Rimuovi vecchia foto storica ${nome}`);
    } catch (e) {}
  }

  return { nome: entry.nome, squadraReale: entry.squadraReale, immagine: entry.immagine };
}

// Rose di una STAGIONE in Archivio (data/albo-oro.json) — stesso principio
// di video/pagelle: sostituisce l'intero array "rose" della stagione.
async function hv_salvaRoseStagioneViaGitHub(annoStagione, roseArray, config) {
  const { githubOwner: owner, githubRepo: repo } = config.lega;
  const token = hv_getGithubToken();
  if (!token || !owner || !repo) {
    throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");
  }

  const fileJson = await hv_ghGetFile(owner, repo, "data/albo-oro.json", token);
  if (!fileJson) throw new Error("Non trovo data/albo-oro.json nel repository.");

  const alboObj = JSON.parse(hv_base64ToUtf8(fileJson.content));
  const stagione = (alboObj.stagioni || []).find((s) => s.anno === annoStagione);
  if (!stagione) throw new Error(`Stagione ${annoStagione} non trovata in albo-oro.json.`);
  stagione.rose = roseArray;

  const nuovoContenuto = hv_utf8ToBase64(JSON.stringify(alboObj, null, 2));
  await hv_ghPutFile(owner, repo, "data/albo-oro.json", token, nuovoContenuto, `Aggiorna rose stagione ${annoStagione}`, fileJson.sha);
}

// Pagelle di una STAGIONE in Archivio (data/albo-oro.json) — stesso principio
// dei video: un array di { nome, testo }, quanti se ne vuole.
async function hv_salvaPagelleStagioneViaGitHub(annoStagione, pagelleArray, config) {
  const { githubOwner: owner, githubRepo: repo } = config.lega;
  const token = hv_getGithubToken();
  if (!token || !owner || !repo) {
    throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");
  }

  const fileJson = await hv_ghGetFile(owner, repo, "data/albo-oro.json", token);
  if (!fileJson) throw new Error("Non trovo data/albo-oro.json nel repository.");

  const alboObj = JSON.parse(hv_base64ToUtf8(fileJson.content));
  const stagione = (alboObj.stagioni || []).find((s) => s.anno === annoStagione);
  if (!stagione) throw new Error(`Stagione ${annoStagione} non trovata in albo-oro.json.`);
  stagione.pagelle = pagelleArray;

  const nuovoContenuto = hv_utf8ToBase64(JSON.stringify(alboObj, null, 2));
  await hv_ghPutFile(owner, repo, "data/albo-oro.json", token, nuovoContenuto, `Aggiorna pagelle stagione ${annoStagione}`, fileJson.sha);
}


async function hv_caricaPrevisioneViaGitHub(squadraId, file, config) {
  const { githubOwner: owner, githubRepo: repo } = config.lega;
  const token = hv_getGithubToken();
  if (!token || !owner || !repo) {
    throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const nomeFile = `${squadraId}.${ext}`;
  const percorsoImmagine = `assets/previsioni/${nomeFile}`;

  const contentBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Impossibile leggere il file selezionato."));
    reader.readAsDataURL(file);
  });

  const esistenteImg = await hv_ghGetFile(owner, repo, percorsoImmagine, token);
  await hv_ghPutFile(owner, repo, percorsoImmagine, token, contentBase64, `Aggiorna previsione ${squadraId}`, esistenteImg ? esistenteImg.sha : null);

  const fileJson = await hv_ghGetFile(owner, repo, "data/previsioni.json", token);
  if (!fileJson) throw new Error("Non trovo data/previsioni.json nel repository.");

  const previsioniObj = JSON.parse(hv_base64ToUtf8(fileJson.content));
  let entry = (previsioniObj.previsioni || []).find((p) => p.squadraId === squadraId);
  if (!entry) {
    entry = { squadraId, immagine: "", linkEsterno: "", fasce: {} };
    previsioniObj.previsioni.push(entry);
  }

  // se esisteva già un'immagine con nome diverso (es. estensione diversa), la cancello
  // per non lasciare file orfani in giro nella cartella.
  const vecchioNomeFile = entry.immagine;
  if (vecchioNomeFile && vecchioNomeFile !== nomeFile) {
    try {
      const vecchioFile = await hv_ghGetFile(owner, repo, `assets/previsioni/${vecchioNomeFile}`, token);
      if (vecchioFile) {
        await hv_ghDeleteFile(owner, repo, `assets/previsioni/${vecchioNomeFile}`, token, vecchioFile.sha, `Rimuovi vecchia previsione ${squadraId}`);
      }
    } catch (e) {
      // non blocco l'upload principale se la pulizia del vecchio file fallisce
    }
  }

  entry.immagine = nomeFile;
  entry.linkEsterno = "";

  const nuovoContenuto = hv_utf8ToBase64(JSON.stringify(previsioniObj, null, 2));
  await hv_ghPutFile(owner, repo, "data/previsioni.json", token, nuovoContenuto, `Aggiorna previsioni.json (${squadraId})`, fileJson.sha);

  return percorsoImmagine;
}

// Audio storici (Archivio): data/audio-storici.json + i file veri su
// assets/audio-storici/. Limite di peso lato client per non appesantire il
// repository (l'utente l'ha chiesto esplicitamente: avviso sopra i 5 MB).
const HV_LIMITE_AUDIO_BYTE = 5 * 1024 * 1024;

async function hv_caricaAudioStoricoViaGitHub(testo, file, config) {
  const { githubOwner: owner, githubRepo: repo } = config.lega;
  const token = hv_getGithubToken();
  if (!token || !owner || !repo) {
    throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");
  }
  if (file.size > HV_LIMITE_AUDIO_BYTE) {
    throw new Error(`Il file pesa ${(file.size / 1024 / 1024).toFixed(1)} MB, sopra il limite di 5 MB. Comprimilo o accorcia la clip prima di ricaricarlo.`);
  }

  const ext = (file.name.split(".").pop() || "mp3").toLowerCase();
  const id = `${Date.now()}`;
  const percorso = `assets/audio-storici/${id}.${ext}`;

  const contentBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Impossibile leggere il file selezionato."));
    reader.readAsDataURL(file);
  });

  await hv_ghPutFile(owner, repo, percorso, token, contentBase64, `Aggiungi audio storico: ${testo.slice(0, 60)}`, null);

  const fileJson = await hv_ghGetFile(owner, repo, "data/audio-storici.json", token);
  const audioObj = fileJson ? JSON.parse(hv_base64ToUtf8(fileJson.content)) : { audio: [] };
  if (!audioObj.audio) audioObj.audio = [];
  const voce = { id, testo, file: percorso };
  audioObj.audio.push(voce);

  const nuovoContenuto = hv_utf8ToBase64(JSON.stringify(audioObj, null, 2));
  await hv_ghPutFile(owner, repo, "data/audio-storici.json", token, nuovoContenuto, `Aggiungi audio storico: ${testo.slice(0, 60)}`, fileJson ? fileJson.sha : null);

  return voce;
}

async function hv_rimuoviAudioStoricoViaGitHub(id, config) {
  const { githubOwner: owner, githubRepo: repo } = config.lega;
  const token = hv_getGithubToken();
  if (!token || !owner || !repo) {
    throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");
  }

  const fileJson = await hv_ghGetFile(owner, repo, "data/audio-storici.json", token);
  if (!fileJson) throw new Error("Non trovo data/audio-storici.json nel repository.");
  const audioObj = JSON.parse(hv_base64ToUtf8(fileJson.content));
  const voce = (audioObj.audio || []).find((a) => a.id === id);
  audioObj.audio = (audioObj.audio || []).filter((a) => a.id !== id);

  const nuovoContenuto = hv_utf8ToBase64(JSON.stringify(audioObj, null, 2));
  await hv_ghPutFile(owner, repo, "data/audio-storici.json", token, nuovoContenuto, `Rimuovi audio storico ${id}`, fileJson.sha);

  if (voce && voce.file) {
    try {
      const fileAudio = await hv_ghGetFile(owner, repo, voce.file, token);
      if (fileAudio) await hv_ghDeleteFile(owner, repo, voce.file, token, fileAudio.sha, `Rimuovi file audio ${id}`);
    } catch (e) {}
  }
}
