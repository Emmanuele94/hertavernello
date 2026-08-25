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

// Salva un oggetto JS come file JSON nel repository (crea o aggiorna).
async function hv_ghSalvaJSON(percorso, oggetto, messaggio, config) {
  const { githubOwner: owner, githubRepo: repo, githubToken: token } = config.lega;
  if (!token || !owner || !repo) {
    throw new Error("Manca githubToken/githubOwner/githubRepo in config.json.");
  }
  const esistente = await hv_ghGetFile(owner, repo, percorso, token);
  const contenuto = hv_utf8ToBase64(JSON.stringify(oggetto, null, 2));
  await hv_ghPutFile(owner, repo, percorso, token, contenuto, messaggio, esistente ? esistente.sha : null);
}

// Carica/aggiorna lo screenshot previsione di una squadra e aggiorna previsioni.json di conseguenza.
async function hv_caricaPrevisioneViaGitHub(squadraId, file, config) {
  const { githubOwner: owner, githubRepo: repo, githubToken: token } = config.lega;
  if (!token || !owner || !repo) {
    throw new Error("Manca githubToken/githubOwner/githubRepo in config.json.");
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
  entry.immagine = nomeFile;
  entry.linkEsterno = "";

  const nuovoContenuto = hv_utf8ToBase64(JSON.stringify(previsioniObj, null, 2));
  await hv_ghPutFile(owner, repo, "data/previsioni.json", token, nuovoContenuto, `Aggiorna previsioni.json (${squadraId})`, fileJson.sha);

  return percorsoImmagine;
}
