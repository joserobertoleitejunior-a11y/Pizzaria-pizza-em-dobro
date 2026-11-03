// Tabela de entrega por bairro (arte oficial "Tabela de entrega — Pizza em Dobro Itapê").
// Só INFORMA o cliente na seção "Como chegar". A taxa cobrada no carrinho vem dos mesmos dados (shared/utils.js → ZONAS_ENTREGA).
(function(){
  var box=document.getElementById('taxas-box'); if(!box||typeof ZONAS_ENTREGA==='undefined') return;
  var R=function(v){ return 'R$ '+Number(v).toFixed(2).replace('.',','); };
  var norm=function(t){ return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); };
  var esc=function(t){ return String(t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var html='<input type="search" id="taxas-busca" class="taxas-busca" placeholder="🔎 Procure seu bairro..." autocomplete="off" aria-label="Procurar bairro">'+
    '<div id="taxas-res" class="taxas-res" aria-live="polite"></div><div class="taxas-zonas">';
  ZONAS_ENTREGA.forEach(function(z){
    html+='<details class="taxas-zona"><summary><b>Zona '+z.zona+'</b><span>'+R(z.taxa)+'</span></summary><ul>'+
      z.bairros.map(function(b){ return '<li data-n="'+esc(norm(b))+'">'+esc(b)+'</li>'; }).join('')+'</ul></details>';
  });
  html+='</div><p class="taxas-nota">Escolha o seu bairro no carrinho e a taxa já entra no total. Entrega grátis a partir de 3 pizzas. Não achou seu bairro? Chame no WhatsApp.</p>';
  box.innerHTML=html;
  var inp=document.getElementById('taxas-busca'), res=document.getElementById('taxas-res');
  inp.addEventListener('input',function(){
    var q=norm(inp.value), achados=[];
    if(q.length>=2) ZONAS_ENTREGA.forEach(function(z){ z.bairros.forEach(function(b){ if(norm(b).indexOf(q)>=0) achados.push({b:b,t:z.taxa,z:z.zona}); }); });
    if(q.length<2){ res.innerHTML=''; return; }
    res.innerHTML=achados.length
      ? achados.slice(0,6).map(function(a){ return '<div class="taxa-achado"><span>'+esc(a.b)+' <small>Zona '+a.z+'</small></span><b>'+R(a.t)+'</b></div>'; }).join('')
      : '<div class="taxa-achado nada">Bairro não encontrado. Chame no WhatsApp que a gente confirma a taxa.</div>';
  });
})();
