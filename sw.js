const CACHE='ped-v4';
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
