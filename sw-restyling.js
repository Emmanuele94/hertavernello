// Main release worker: fresh documents/data/icons; separate versioned asset cache.
const CACHE='hertavernello-main-restyling-20260915-d1';
const CORE=["index.html","squadre.html","quiz.html","archivio.html","feedback.html","admin.html","manifest.json","css/style.css?v=20260914-mobile2","css/restyling.css?v=20260914-mobile2","js/restyling-ui.js?v=20260914-mobile2","js/site-tools.js?v=20260914-mobile2","js/admin-icone-home.js?v=20260914-mobile2","js/versione-check.js?v=20260914-mobile2","js/auth.js?v=20260914-mobile2","js/github-api.js?v=20260914-mobile2","js/admin-feedback.js?v=20260914-mobile2","js/feedback.js?v=20260915-d1","js/admin-config.js?v=20260914-mobile2","js/importer.js?v=20260914-mobile2","js/admin-pagelle.js?v=20260914-mobile2","js/admin-previsioni.js?v=20260914-mobile2","js/api.js?v=20260914-mobile2","js/admin-calendario.js?v=20260914-mobile2","js/admin-calendario-excel.js?v=20260914-mobile2","js/risultati-utils.js?v=20260914-mobile2","js/parser-risultati.js?v=20260914-mobile2","js/ocr-risultati.js?v=20260914-mobile2","js/calcolo-derivati.js?v=20260914-mobile2","js/motore-news.js?v=20260914-mobile2","js/admin-risultati.js?v=20260914-mobile2","js/admin-archivia-stagione.js?v=20260914-mobile2","js/admin-disconnetti-tutti.js?v=20260914-mobile2","js/admin-regolamento.js?v=20260914-mobile2","js/regolamento-modal.js?v=20260914-mobile2","js/giocatori.js?v=20260914-mobile2","js/archivio.js?v=20260914-mobile2","js/cache.js?v=20260914-mobile2","js/main.js?v=20260914-mobile2","js/quiz.js?v=20260914-mobile2","js/squadre.js?v=20260914-mobile2","data/config.json","data/squadre-serie-a.json","data/nazioni.json","data/versione.json","assets/logo.png","assets/icone-app/icon-192.png","assets/icone-app/icon-512.png"]
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(CORE.map(url=>cache.add(url)))));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith('hertavernello-main-restyling-')&&n!==CACHE).map(n=>caches.delete(n)));await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.headers.has('range'))return; // audio/video/PDF a intervalli: mai intercettati, sempre dritti alla rete (metterli in cache rompe la riproduzione)
 const scope=new URL(self.registration.scope).pathname;
 if(!url.pathname.startsWith(scope))return;
 const relative=url.pathname.slice(scope.length);
 if(relative.startsWith('api/'))return; // API dinamiche: mai in cache, soprattutto segnalazioni Admin.
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
