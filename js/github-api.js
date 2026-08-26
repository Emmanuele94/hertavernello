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

// Carica/aggiorna lo screenshot previsione di una squadra e aggiorna previsioni.json di conseguenza.
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
