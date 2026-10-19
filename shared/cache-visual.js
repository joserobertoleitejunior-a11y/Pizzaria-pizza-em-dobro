// Mostra na hora a última tela vista (guardada neste aparelho, vale 10 min) enquanto os dados novos
// chegam — a troca Loja → Dashboard → Caixa parece estática, sem "Carregando…". Os dados novos
// substituem o conteúdo assim que chegam.
(function(){
  var TTL=600000;
  function chave(id){ return 'cv1:'+location.pathname+'#'+id; }
  window.cacheVisual=function(ids){
    ids.forEach(function(id){
      var el=document.getElementById(id); if(!el) return;
      try{
        var r=JSON.parse(localStorage.getItem(chave(id))||'null');
        if(r&&Date.now()-r.t<TTL&&(el.querySelector('.sk-wrap')||!el.innerHTML.trim())) el.innerHTML=r.h;
      }catch(e){}
      var tm;
      new MutationObserver(function(){
        clearTimeout(tm);
        tm=setTimeout(function(){
          if(el.querySelector('.sk-wrap')||!el.innerHTML.trim()) return;
          try{ localStorage.setItem(chave(id),JSON.stringify({t:Date.now(),h:el.innerHTML.slice(0,200000)})); }catch(e){}
        },400);
      }).observe(el,{childList:true,subtree:true});
    });
  };
  window.limparCacheVisual=function(){
    try{ Object.keys(localStorage).filter(function(k){return k.indexOf('cv1:')===0;}).forEach(function(k){localStorage.removeItem(k);}); }catch(e){}
  };
})();
