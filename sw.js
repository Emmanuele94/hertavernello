// Service Worker di Hertavernello: rende il sito installabile come app e
// disponibile anche offline dopo la prima visita.
//
// Strategia: le pagine e i file principali vengono salvati subito
// all'installazione; tutto il resto (loghi, bandiere, stemmi, ecc.) viene
// aggiunto alla cache automaticamente man mano che viene visitato/caricato,
// così non serve elencare a mano ogni singolo file — anche le nuove bandiere
// o i nuovi loghi caricati in futuro finiscono in cache al primo utilizzo.
//
// Cambia HV_CACHE_VERSIONE quando aggiorni pagine importanti, così i
// dispositivi dei tuoi amici scaricano la versione fresca invece di quella
// vecchia salvata.
const HV_CACHE_VERSIONE = "hertavernello-v2";

const HV_PRECACHE = [
  "index.html",
  "squadre.html",
  "quiz.html",
  "archivio.html",
  "admin.html",
  "manifest.json",
  "css/style.css",
  "js/auth.js",
  "js/api.js",
  "js/cache.js",
  "js/main.js",
  "js/squadre.js",
  "js/quiz.js",
  "js/github-api.js",
  "js/importer.js",
  "js/admin-config.js",
  "js/admin-pagelle.js",
  "js/admin-previsioni.js",
  "js/admin-calendario.js",
  "js/admin-calendario-excel.js",
  "data/config.json",
  "data/squadre-serie-a.json",
  "data/nazioni.json",
  "assets/logo.png",
  "assets/icone-app/icon-192.png",
  "assets/icone-app/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(HV_CACHE_VERSIONE)
      .then((cache) => cache.addAll(HV_PRECACHE))
      .catch(() => {}) // se un file manca non blocco l'installazione del resto
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nomi) => Promise.all(nomi.filter((n) => n !== HV_CACHE_VERSIONE).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Solo richieste GET dello stesso sito: le chiamate all'API di football-data.org
  // (via Worker) restano fuori, gestite già dalla cache in localStorage del sito.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Navigazione tra pagine (click su un link, indirizzo digitato): provo
  // SEMPRE prima la rete, così non resti mai bloccato su una versione vecchia
  // quando internet c'è. La cache interviene solo se sei davvero offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((risposta) => {
          const copia = risposta.clone();
          caches.open(HV_CACHE_VERSIONE).then((cache) => cache.put(event.request, copia));
          return risposta;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match("index.html")))
    );
    return;
  }

  // Tutto il resto (css, js, immagini, loghi, bandiere): cache-first per
  // velocità, aggiornato comunque in background quando la rete risponde.
  event.respondWith(
    caches.match(event.request).then((risposteCache) => {
      const dalNetwork = fetch(event.request)
        .then((risposta) => {
          if (risposta && risposta.status === 200) {
            const copia = risposta.clone();
            caches.open(HV_CACHE_VERSIONE).then((cache) => cache.put(event.request, copia));
          }
          return risposta;
        })
        .catch(() => risposteCache); // offline: ripiego sulla cache se la rete non risponde

      // Se ho già una copia in cache la uso subito (veloce), aggiornandola in
      // background; altrimenti aspetto la rete.
      return risposteCache || dalNetwork;
    })
  );
});
