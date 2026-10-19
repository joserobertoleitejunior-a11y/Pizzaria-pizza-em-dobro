// Garante que o celular/computador da loja nunca fique preso numa versão antiga do site.
// A cada abertura compara o número da versão publicada (/version.json, gerado no deploy) com o que
// este aparelho viu da última vez; se mudou, apaga o cache do aplicativo e recarrega UMA vez.
(function(){
  try{
    fetch('/version.json?t='+Date.now(),{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).then(function(d){
      if(!d||!d.v) return;
      var visto=null; try{ visto=localStorage.getItem('site_versao'); }catch(e){}
      if(visto===d.v) return;
      try{ localStorage.setItem('site_versao',d.v); }catch(e){}
      var jaRecarregou=false; try{ jaRecarregou=sessionStorage.getItem('site_recarregou')===d.v; sessionStorage.setItem('site_recarregou',d.v); }catch(e){}
      if(jaRecarregou) return; // trava contra laço de recarga
      var tarefas=[];
      if(window.caches&&caches.keys) tarefas.push(caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return caches.delete(k); })); }));
      if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations) tarefas.push(navigator.serviceWorker.getRegistrations().then(function(rs){ return Promise.all(rs.map(function(r){ return r.update().catch(function(){}); })); }));
      Promise.all(tarefas).catch(function(){}).then(function(){ location.reload(); });
    }).catch(function(){});
  }catch(e){}
})();
