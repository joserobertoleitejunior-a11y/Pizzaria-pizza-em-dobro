const CACHE='ped-v16'; // versão bumped: reforma visual completa (cores, splash, imagens geradas por
// código) — sem isso o service worker antigo (sem clients.claim()) ficava "preso" controlando
// as abas já abertas até o cliente fechar TODAS as abas do site manualmente, então toda
// atualização de verdade parecia "não ter saído do ar" pra quem já tinha visitado antes.
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim()) // assume o controle das abas já abertas AGORA, sem esperar
      // reload manual — é a diferença entre "o cliente vê a atualização na hora" e "só vê depois
      // de fechar e abrir o site de novo", que é o que estava acontecendo até aqui.
  );
});
self.addEventListener('fetch',e=>{
  // só cacheia GET, ignora Firebase e APIs externas
  if(e.request.method!=='GET')return;
  const url=e.request.url;
  if(url.includes('firestore')||url.includes('firebase')||url.includes('anthropic'))return;
  // estáticos pesados que quase nunca mudam (fotos, logo, fontes, 3D): cache primeiro, atualiza por trás
  if(/\.(png|jpe?g|webp|svg|woff2?)(\?|$)/.test(url)||url.includes('/assets/vendor/')||url.includes('fonts.gstatic.com')){
    e.respondWith(caches.open(CACHE).then(cache=>cache.match(e.request).then(hit=>{
      const rede=fetch(e.request).then(res=>{ if(res.ok)cache.put(e.request,res.clone()); return res; }).catch(()=>hit);
      return hit||rede;
    })));
    return;
  }
  e.respondWith(
    caches.open(CACHE).then(cache=>
      fetch(e.request).then(res=>{
        if(res.ok)cache.put(e.request,res.clone());
        return res;
      }).catch(()=>caches.match(e.request))
    )
  );
});
