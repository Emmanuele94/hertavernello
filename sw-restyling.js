// Main release worker: fresh documents/data/icons; separate versioned asset cache.
const CACHE='hertavernello-main-restyling-20260914-restyling-main1-fixaudio';
const CORE=["index.html","squadre.html","quiz.html","archivio.html","admin.html","manifest.json","css/style.css","js/auth.js","js/api.js","js/cache.js","js/main.js","js/squadre.js","js/quiz.js","js/github-api.js","js/importer.js","js/admin-config.js","js/admin-pagelle.js","js/admin-previsioni.js","js/admin-calendario.js","js/admin-calendario-excel.js","data/config.json","data/squadre-serie-a.json","data/nazioni.json","assets/logo.png","assets/icone-app/icon-192.png","assets/icone-app/icon-512.png","css/style.css?v=20260914a","css/restyling.css?v=20260914-restyling-main1","js/restyling-ui.js?v=20260914-restyling-main1","js/admin-icone-home.js?v=20260914-restyling-main1","js/versione-check.js?v=20260914a","js/auth.js?v=20260914a","js/github-api.js?v=20260914a","js/admin-config.js?v=20260914a","js/importer.js?v=20260914a","js/admin-pagelle.js?v=20260914a","js/admin-previsioni.js?v=20260914a","js/api.js?v=20260914a","js/admin-calendario.js?v=20260914a","js/admin-calendario-excel.js?v=20260914a","js/risultati-utils.js?v=20260914a","js/parser-risultati.js?v=20260914a","js/ocr-risultati.js?v=20260914a","js/calcolo-derivati.js?v=20260914a","js/motore-news.js?v=20260914a","js/admin-risultati.js?v=20260914a","js/admin-archivia-stagione.js?v=20260914a","js/admin-disconnetti-tutti.js?v=20260914a","js/admin-regolamento.js?v=20260914a","js/regolamento-modal.js?v=20260914a","js/giocatori.js?v=20260914a","js/archivio.js?v=20260914a","js/cache.js?v=20260914a","js/main.js?v=20260914a","js/quiz.js?v=20260914a","js/rose.js","js/squadre.js?v=20260914a","rose.html"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(CORE.map(url=>cache.add(url)))));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith('hertavernello-main-restyling-')&&n!==CACHE).map(n=>caches.delete(n)));await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.headers.has('range'))return; // audio/video/PDF a intervalli: mai intercettati, sempre dritti alla rete (metterli in cache rompe la riproduzione)
 const scope=new URL(self.registration.scope).pathname;
 if(!url.pathname.startsWith(scope))return;
 const relative=url.pathname.slice(scope.length);
 const fresh=request.mode==='navigate'||relative.startsWith('data/')||relative.startsWith('assets/icone/')||relative==='assets/logo.png';
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  // Normalize cache keys for JSON; polling timestamps must not create unbounded entries.
  const key=relative.startsWith('data/')?url.origin+url.pathname:request;
  const cached=await cache.match(key);
  const network=async()=>{const response=await fetch(request,{cache:fresh?'no-cache':'default'});if(response.ok)await cache.put(key,response.clone());return response;};
  if(fresh){try{const response=await network();return response.ok?response:(cached||response);}catch{return cached||(request.mode==='navigate'?await cache.match(new URL('index.html',self.registration.scope).href):null)||Response.error();}}
  if(cached)return cached;
  try{return await network();}catch{return Response.error();}
 })());
});
