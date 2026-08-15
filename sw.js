const CACHE='ped-v5'; // versão bumped: caixa.js e o JS/CSS inline de index.html viraram vários arquivos novos — força os navegadores a soltarem o cache antigo em vez de tentar servir caixa.js (que não existe mais) do cache
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch',e=>{
  // só cacheia GET, ignora Firebase e APIs externas
  if(e.request.method!=='GET')return;
  const url=e.request.url;
  if(url.includes('firestore')||url.includes('firebase')||url.includes('anthropic'))return;
  e.respondWith(
    caches.open(CACHE).then(cache=>
      fetch(e.request).then(res=>{
        if(res.ok)cache.put(e.request,res.clone());
        return res;
      }).catch(()=>caches.match(e.request))
    )
  );
});
