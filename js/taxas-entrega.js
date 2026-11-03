// Tabela de entrega por bairro (arte oficial "Tabela de entrega — Pizza em Dobro Itapê").
// Só INFORMA o cliente na seção "Como chegar". A taxa cobrada no carrinho ainda é R$ 8,00 fixa (ver js/carrinho.js).
window.TAXAS_ENTREGA=[{"zona": 1, "taxa": 8, "bairros": ["Jd. Deise", "Vila Máximo", "Jd. Shangri-Lá", "Parque Atenas do Sul", "Vila Rio Branco", "Vila São José", "Labrunetti", "Vila Barth I", "Vila Barth II", "Vila Nastri I", "Vila Nastri II", "Vila Carolina", "Bairro 4L", "Jd. Bela Vista", "Cambuí", "Parque São Bento", "Vila Cubatão", "Vila Rosa", "Jd. Itália", "Vila Nova Itapetininga", "Vila Regina"]}, {"zona": 2, "taxa": 9, "bairros": ["Jd. Brasil", "Jd. Paulista", "Jd. Maricota", "Jd. Fogaça", "Vila Olho d'Água", "Vila São João", "Jd. Santa Inês", "Vila Santana", "Vila Piedade", "Vila Salém", "Vila Asem", "Vila Sônia", "Chapadinha", "Vila Apolo", "Estância Conceição"]}, {"zona": 3, "taxa": 10, "bairros": ["Belo Horizonte", "Jd. Casa Grande", "Vila Célia", "Região da Unimed", "Vila Arruda", "Vila Prado", "Taboãozinho", "Gramados 1", "Gramados 2", "Novo Aeroporto", "Vila Sotemo", "Vila Mazzei", "Residencial Nascentes", "Pacaembu 1", "Pacaembu 2", "Pacaembu 3"]}, {"zona": 4, "taxa": 15, "bairros": ["Monte Santo", "Chapada Grande", "Parque Itapê", "3M", "Duratex", "GDBR", "Fábrica de Costura", "Grupo RB", "Itacol", "Castrolanda"]}];
(function(){
  var box=document.getElementById('taxas-box'); if(!box||!window.TAXAS_ENTREGA) return;
  var R=function(v){ return 'R$ '+Number(v).toFixed(2).replace('.',','); };
  var norm=function(t){ return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); };
  var esc=function(t){ return String(t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var html='<input type="search" id="taxas-busca" class="taxas-busca" placeholder="🔎 Procure seu bairro..." autocomplete="off" aria-label="Procurar bairro">'+
    '<div id="taxas-res" class="taxas-res" aria-live="polite"></div><div class="taxas-zonas">';
  window.TAXAS_ENTREGA.forEach(function(z){
    html+='<details class="taxas-zona"><summary><b>Zona '+z.zona+'</b><span>'+R(z.taxa)+'</span></summary><ul>'+
      z.bairros.map(function(b){ return '<li data-n="'+esc(norm(b))+'">'+esc(b)+'</li>'; }).join('')+'</ul></details>';
  });
  html+='</div><p class="taxas-nota">Valores por bairro para entrega. Entrega grátis a partir de 3 pizzas. Não achou seu bairro? Chame no WhatsApp.</p>';
  box.innerHTML=html;
  var inp=document.getElementById('taxas-busca'), res=document.getElementById('taxas-res');
  inp.addEventListener('input',function(){
    var q=norm(inp.value), achados=[];
    if(q.length>=2) window.TAXAS_ENTREGA.forEach(function(z){ z.bairros.forEach(function(b){ if(norm(b).indexOf(q)>=0) achados.push({b:b,t:z.taxa,z:z.zona}); }); });
    if(q.length<2){ res.innerHTML=''; return; }
    res.innerHTML=achados.length
      ? achados.slice(0,6).map(function(a){ return '<div class="taxa-achado"><span>'+esc(a.b)+' <small>Zona '+a.z+'</small></span><b>'+R(a.t)+'</b></div>'; }).join('')
      : '<div class="taxa-achado nada">Bairro não encontrado. Chame no WhatsApp que a gente confirma a taxa.</div>';
  });
})();
