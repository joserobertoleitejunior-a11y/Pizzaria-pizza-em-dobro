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
      // No Caixa, recarregar sozinho derruba a impressora Bluetooth no meio do expediente: só avisa,
      // e a atualização acontece quando a equipe tocar (ou na próxima vez que abrir o Caixa).
      if(/\/caixa\//.test(location.pathname)){
        var b=document.createElement('button'); b.type='button'; b.textContent='🔄 Nova versão do Caixa — tocar pra atualizar (depois conecte a impressora)';
        b.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:12px;z-index:99998;background:#141414;color:#fff;border:0;border-radius:999px;padding:12px 18px;font-weight:700;font-size:.85rem;box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:92vw';
        b.onclick=function(){ Promise.all(tarefasLimpar()).catch(function(){}).then(function(){ location.reload(); }); };
        (document.body?Promise.resolve():new Promise(function(r){ addEventListener('DOMContentLoaded',r); })).then(function(){ document.body.appendChild(b); });
        return;
      }
      function tarefasLimpar(){ var t=[];
        if(window.caches&&caches.keys) t.push(caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return caches.delete(k); })); }));
        if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations) t.push(navigator.serviceWorker.getRegistrations().then(function(rs){ return Promise.all(rs.map(function(r){ return r.update().catch(function(){}); })); }));
        return t; }
      var tarefas=[];
      if(window.caches&&caches.keys) tarefas.push(caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return caches.delete(k); })); }));
      if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations) tarefas.push(navigator.serviceWorker.getRegistrations().then(function(rs){ return Promise.all(rs.map(function(r){ return r.update().catch(function(){}); })); }));
      Promise.all(tarefas).catch(function(){}).then(function(){ location.reload(); });
    }).catch(function(){});
  }catch(e){}
})();
