// Rende un anno/stagione sicuro da usare in un nome di file (niente slash).
function hv_slugAnnoArchivio(anno) {
  return (anno || "stagione").replace(/[\\/]+/g, "-").replace(/\s+/g, "");
}

// Archivia una "fase" della stagione in corso (asta iniziale o asta di
// riparazione) dentro data/albo-oro.json, leggendo quello che c'è ORA in
// data/rose.json, data/pagelle.json e data/loghi-fantasquadre.json. Non
// tocca mai questi file live: è una copia, non uno spostamento. Trova la
// stagione da usare tramite il flag "inCorso": true, non tramite il nome
// scritto a mano, per evitare disallineamenti di formato (es. "2026/2027"
// in config.json contro "2026/27" in albo-oro.json).
async function hv_archiviaFaseStagione(fase) {
  const stato = document.getElementById("archivia-stato");
  stato.textContent = "Archiviazione in corso...";
  stato.style.color = "var(--text-muted)";

  try {
    const [configRes, roseRes, pagelleRes, loghiRes] = await Promise.all([
      fetch("data/config.json"),
      fetch("data/rose.json"),
      fetch("data/pagelle.json"),
      fetch("data/loghi-fantasquadre.json"),
    ]);
    const config = await configRes.json();
    const roseData = await roseRes.json();
    const pagelleData = await pagelleRes.json();
    const loghiData = await loghiRes.json();

    const { githubOwner: owner, githubRepo: repo } = config.lega;
    const token = hv_getGithubToken();
    if (!token || !owner || !repo) {
      throw new Error("Serve il token GitHub (e githubOwner/githubRepo in config.json).");
    }

    const fileJson = await hv_ghGetFile(owner, repo, "data/albo-oro.json", token);
    if (!fileJson) throw new Error("Non trovo data/albo-oro.json nel repository.");
    const alboObj = JSON.parse(hv_base64ToUtf8(fileJson.content));

    const stagione = (alboObj.stagioni || []).find((s) => s.inCorso === true);
    if (!stagione) throw new Error('Nessuna stagione segnata come "in corso" in albo-oro.json: niente da archiviare.');

    const stagioneAttuale = config.lega.stagione;
    const slugAnno = hv_slugAnnoArchivio(stagione.anno);

    // Solo con la fase "iniziale" congelo anche video e stemmi: sono legati
    // all'asta (come le pagelle), non cambiano alla riparazione. Le
    // immagini vengono DUPLICATE su un percorso dedicato all'archivio, così
    // restano intatte anche se in futuro carichi un nuovo stemma.
    const rosePromesse = (config.squadre || []).map(async (squadra) => {
      const rosaLive = (roseData.rose || []).find((r) => r.squadraId === squadra.id);
      const voce = { squadra: squadra.nomeFantasquadra, fase, giocatori: rosaLive ? rosaLive.giocatori : [] };

      if (fase === "iniziale") {
        const logo = (loghiData.loghi || []).find((l) => l.squadraId === squadra.id);
        const videoPerAnno = logo && logo.video && !Array.isArray(logo.video) ? logo.video : {};
        if (videoPerAnno[stagioneAttuale] && videoPerAnno[stagioneAttuale].length) {
          voce.video = videoPerAnno[stagioneAttuale];
        }

        if (logo && logo.immagine) {
          const ext = (logo.immagine.split(".").pop() || "jpeg").toLowerCase();
          const destinazione = `assets/stemmi-storici/${squadra.id}-${slugAnno}.${ext}`;
          const copiato = await hv_copiaFileGitHub(
            owner,
            repo,
            `assets/stemmi/${logo.immagine}`,
            destinazione,
            token,
            `Archivia stemma ${squadra.id} (${stagione.anno})`
          );
          if (copiato) voce.stemma = copiato;
        }
        if (logo && logo.immaginePiccola) {
          const extP = (logo.immaginePiccola.split(".").pop() || "png").toLowerCase();
          const destinazioneP = `assets/stemmi-storici/${squadra.id}-${slugAnno}-piccolo.${extP}`;
          const copiatoP = await hv_copiaFileGitHub(
            owner,
            repo,
            `assets/stemmi-piccoli/${logo.immaginePiccola}`,
            destinazioneP,
            token,
            `Archivia stemma piccolo ${squadra.id} (${stagione.anno})`
          );
          if (copiatoP) voce.stemmaPiccolo = copiatoP;
        }
      }

      return voce;
    });
    const roseNuove = await Promise.all(rosePromesse);

    // Tolgo prima le eventuali voci già archiviate per QUESTA fase (per
    // poter rilanciare il bottone se correggi qualcosa), ma non tocco
    // l'altra fase.
    const roseEsistenti = (stagione.rose || []).filter(
      (r) => !roseNuove.some((n) => n.squadra === r.squadra && (r.fase || "iniziale") === fase)
    );
    stagione.rose = [...roseEsistenti, ...roseNuove];

    // Pagelle: solo con la fase "iniziale" (sono legate all'asta, non si
    // ripetono alla riparazione). L'emoji sul sito si sceglie da sola dal
    // voto (vedi Archivio); non serve portare il badge scelto a mano qui.
    if (fase === "iniziale") {
      const pagelleNuove = (config.squadre || [])
        .map((squadra) => {
          const p = (pagelleData.pagelle || []).find((x) => x.squadraId === squadra.id);
          if (!p) return null;
          const voce = { nome: squadra.nomeFantasquadra, testo: p.commento || "" };
          if (p.voto != null && p.voto !== "") voce.voto = p.voto;
          return voce;
        })
        .filter(Boolean);
      if (pagelleNuove.length) stagione.pagelle = pagelleNuove;

      // Regolamento: è un unico documento per tutto il sito (non per
      // fantasquadra), quindi lo copio una sola volta, non dentro il ciclo
      // sopra. Anche questo solo con l'iniziale — se cambia a stagione in
      // corso, quello archiviato resta comunque quello di inizio anno.
      // hv_copiaFileGitHub ritorna null da sola se non è mai stato caricato
      // nessun regolamento: nessun errore, semplicemente non lo archivio.
      try {
        const destinazioneRegolamento = `assets/regolamento-storico/regolamento-${slugAnno}.pdf`;
        const copiato = await hv_copiaFileGitHub(
          owner,
          repo,
          "assets/regolamento.pdf",
          destinazioneRegolamento,
          token,
          `Archivia regolamento (${stagione.anno})`
        );
        if (copiato) stagione.regolamento = copiato;
      } catch (e) {}
    }

    const nuovoContenuto = hv_utf8ToBase64(JSON.stringify(alboObj, null, 2));
    await hv_ghPutFile(owner, repo, "data/albo-oro.json", token, nuovoContenuto, `Archivia stagione (${fase})`, fileJson.sha);

    const messaggioFase = fase === "iniziale" ? "prima parte (rose + pagelle + video + stemmi + regolamento)" : "rose dopo la riparazione";
    stato.textContent = `Archiviata ✓ la ${messaggioFase}. Resta nascosta in Archivio finché la stagione è segnata "in corso".`;
    stato.style.color = "var(--verde-prato)";
  } catch (err) {
    stato.textContent = "Errore: " + err.message;
    stato.style.color = "var(--wine-bright)";
  }
}

document.getElementById("archivia-iniziale-btn").addEventListener("click", () => hv_archiviaFaseStagione("iniziale"));
document.getElementById("archivia-riparazione-btn").addEventListener("click", () => hv_archiviaFaseStagione("riparazione"));
