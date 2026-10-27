// ══════════════════════════════════════════════════════════
//  PEDIDO PASSO A PASSO (site) — um assistente que pergunta uma coisa por vez:
//  o que você quer → sabor(es) → borda → tirar ingrediente → "mais alguma coisa?" →
//  entrega ou retirada → seus dados → endereço → pagamento → confere → envia pelo WhatsApp.
//  Usa o MESMO carrinho e o MESMO envio do site (finalizar); os campos de dados/endereço/pagamento
//  são os do carrinho, emprestados pra dentro do assistente enquanto ele está aberto.
// ══════════════════════════════════════════════════════════
(function(){
  'use strict';
  var P={passo:'tipo',hist:[],tipo:null,it:{}};
  var ETAPAS=[['Escolher',['tipo','sabor','meia1','meia2','faixa','c1','c2','esf','beb']],
              ['Personalizar',['borda','borda1','borda2','tirar']],
              ['Seus dados',['mais','refri','modo','dados','end']],
              ['Enviar',['pag','confere']]];
  var TIPOS=[
    {id:'pizza',ico:'🍕',nome:'Pizza grande',sub:'um sabor, com ou sem borda'},
    {id:'meia',ico:'🌗',nome:'Meia a meia',sub:'dois sabores na mesma pizza'},
    {id:'combo',ico:'🍕🍕',nome:'Combo 2 pizzas',sub:'a partir de R$ 65'},
    {id:'broto',ico:'<svg class="ico-broto" viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#D9932F"/><circle cx="20" cy="20" r="14.6" fill="#F3C443"/><circle cx="20" cy="20" r="14.6" fill="#E25B2C" opacity=".22"/><g fill="#B8331F"><circle cx="13.6" cy="13.8" r="2.7"/><circle cx="26.4" cy="14.4" r="2.7"/><circle cx="14.2" cy="26.2" r="2.7"/><circle cx="26" cy="26" r="2.7"/></g><path d="M20 5.4v29.2M5.4 20h29.2" stroke="#7A4A14" stroke-width="1.5"/></svg>',nome:'Combo 2 broto',sub:'R$ 50 · pizza pequena de 4 pedaços'},
    {id:'esf',ico:'🥟',nome:'Esfihas',sub:'R$ 5 cada · 10 por R$ 50'},
    {id:'beb',ico:'🥤',nome:'Bebidas e doces',sub:'refri, suco, doces e calzones'}
  ];
  var $=function(id){return document.getElementById(id);};
  var R=function(v){return 'R$ '+fmtPrice(Number(v)||0);};
  var esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');};
  function pizzas(){ return menu.filter(function(m){return m.cat==='p'||m.cat==='s';}); }
  function porNome(n){ return menu.find(function(m){return m.n===n;}); }
  function ingredientes(m){ return (m&&m.d||'').split(',').flatMap(function(s){return s.trim().split(' e ');}).map(function(s){return s.trim();}).filter(function(s){return s&&s.toLowerCase()!=='molho';}); }

  // ── campos do carrinho emprestados (nome, telefone, endereço, pagamento) ──
  var emprestados=[];
  function emprestar(ids,alvo){
    ids.forEach(function(id){ var n=$(id); if(!n) return; emprestados.push({n:n,p:n.parentNode,nx:n.nextSibling}); alvo.appendChild(n); });
  }
  function devolver(){
    while(emprestados.length){ var e=emprestados.pop(); if(e.nx&&e.nx.parentNode===e.p) e.p.insertBefore(e.n,e.nx); else e.p.appendChild(e.n); }
  }

  function montarCasca(){
    if($('pa-ov')) return;
    var d=document.createElement('div'); d.id='pa-ov'; d.className='pa-ov'; d.setAttribute('role','dialog'); d.setAttribute('aria-label','Pedido rápido');
    d.innerHTML='<div class="pa-caixa"><div class="pa-topo"><button type="button" class="pa-x" onclick="PA.fechar()" aria-label="Fechar">✕</button>'+
      '<div class="pa-trilha" id="pa-trilha"></div><h2 id="pa-titulo"></h2><p id="pa-dica"></p></div>'+
      '<div class="pa-corpo" id="pa-corpo"></div><div class="pa-carrinho" id="pa-carrinho"></div><div class="pa-rodape" id="pa-rodape"></div></div>';
    document.body.appendChild(d);
  }
  function abrir(tipo){
    montarCasca(); P={passo:'tipo',hist:[],tipo:null,it:{}};
    if(tipo){ escolherTipo(tipo,true); }
    $('pa-ov').classList.add('open'); document.body.classList.add('pa-aberto'); render();
  }
  function fechar(){ devolver(); var o=$('pa-ov'); if(o) o.classList.remove('open'); document.body.classList.remove('pa-aberto'); }
  function ir(passo){ P.hist.push(P.passo); P.passo=passo; render(); var c=$('pa-corpo'); if(c) c.scrollTop=0; }
  function voltar(){ if(!P.hist.length){ fechar(); return; } P.passo=P.hist.pop(); render(); }

  function escolherTipo(t,semHist){
    P.tipo=t; P.it={borda:0,b1:0,b2:0,rem:[]};
    var prox={pizza:'sabor',meia:'meia1',combo:'faixa',broto:'c1',esf:'esf',beb:'beb'}[t];
    if(semHist){ P.passo=prox; } else ir(prox);
  }

  // ── adiciona ao carrinho do site (mesmas estruturas que o cardápio usa) ──
  function adicionar(destino){
    var t=P.tipo, it=P.it;
    if(t==='pizza'){
      var m=menu.find(function(x){return x.id===it.id;}); if(!m) return;
      cart.push(Object.assign({},m,{cartId:Date.now()+Math.random(),selectedBorda:BORDAS[it.borda||0],removedIngredients:it.rem.slice(),addedIngredients:[]}));
      if(typeof renderBordas==='function') renderBordas(m.id);
      if(typeof showImg==='function') showImg(m.id,false);
    }else if(t==='meia'){
      var a=menu.find(function(x){return x.id===it.a;}), b=menu.find(function(x){return x.id===it.b;}); if(!a||!b) return;
      var meia={id:a.id,cartId:Date.now()+Math.random(),baseId:a.id,type:'half',n:'½ '+a.n+' + ½ '+b.n,halves:[a,b],p:Math.max(a.p,b.p),cat:a.cat,
        selectedBorda:BORDAS[it.borda||0],removedIngredients:it.rem.slice(),addedIngredients:[]};
      cart.push(meia);
      if(typeof renderBordas==='function') renderBordas(a.id);
      if(typeof showImg==='function') showImg(a.id,true,meia);
    }else if(t==='combo'||t==='broto'){
      var cfg=_comboCfg(t==='broto'?'broto50':it.faixa); if(!cfg) return;
      cart.push({id:'combo-'+Date.now()+Math.floor(Math.random()*1000),n:cfg.titulo+' — '+it.s1+' + '+it.s2,d:(t==='broto'?'Combo broto':'Combo')+': '+it.s1+' e '+it.s2,
        p:cfg.preco,cat:'co',img:null,cartId:Date.now()+Math.random(),selectedBorda:BORDAS[0],removedIngredients:[],addedIngredients:[]});
      var idx=String(cart.length-1);
      if(typeof bordaResumo==='function'){ bordaResumo(idx,0,it.b1||0); bordaResumo(idx,1,it.b2||0); }
    }
    updateUI();
    if(typeof mostrarAviso==='function') mostrarAviso('✓ Adicionado ao pedido');
    ir(destino||'mais');
  }

  // ── telas ──
  function cards(lista,fn,ativo){
    return '<div class="pa-lista">'+lista.map(function(x){
      return '<button type="button" class="pa-op'+(ativo===x.v?' on':'')+'" onclick="'+fn+'('+JSON.stringify(x.v).replace(/"/g,'&quot;')+')">'+
        '<span class="pa-op-t"><b>'+esc(x.t)+'</b>'+(x.s?'<small>'+esc(x.s)+'</small>':'')+'</span>'+(x.p!=null?'<span class="pa-op-p">'+esc(x.p)+'</span>':'')+'</button>';
    }).join('')+'</div>';
  }
  function cardsBorda(fn,atual,nota){
    return (nota?'<p class="pa-nota">'+nota+'</p>':'')+cards(BORDAS.map(function(b,i){return {v:i,t:i===0?'Sem borda recheada':b.name,s:i===0?'borda tradicional, sem recheio':'borda recheada',p:i===0?'grátis':'+ '+R(b.price)};}),fn,atual);
  }
  function listaPizzas(fn,filtro,ativo){
    var l=pizzas().filter(filtro||function(){return true;});
    return '<input type="search" class="pa-busca" placeholder="🔎 Procurar sabor..." oninput="PA.filtrar(this.value)">'+
      cards(l.map(function(m){return {v:m.id,t:m.n,s:m.d,p:R(m.p)};}),fn,ativo);
  }
  function qtdNoCarrinho(id){ return cart.filter(function(c){return c.id===id&&c.type!=='half';}).length; }

  var FECHAR='<div class="pa-atalhos"><button type="button" class="pa-fechar" onclick="PA.fecharRapido()">⚡ Fechar pedido</button><button type="button" class="pa-cont" onclick="PA.continuarPedindo()">➕ Continuar pedindo</button></div>';
  function render(){
    devolver();
    var t='',d='',corpo='',rod='', it=P.it;
    var vol='<button type="button" class="pa-sec" onclick="PA.voltar()">← Voltar</button>';
    switch(P.passo){
      case 'tipo':
        t='O que você vai querer?'; d='Toque numa opção. Depois dá pra adicionar mais coisas.';
        corpo='<div class="pa-tipos">'+TIPOS.map(function(x){return '<button type="button" class="pa-tipo" onclick="PA.tipo(\''+x.id+'\')"><span>'+x.ico+'</span><b>'+x.nome+'</b><small>'+x.sub+'</small></button>';}).join('')+'</div>';
        rod=cart.length?'<button type="button" class="pa-prim" onclick="PA.ir(\'modo\')">Finalizar pedido →</button>':'';
        break;
      case 'sabor':
        t='Qual sabor?'; d='Toque no sabor da sua pizza grande.';
        corpo=listaPizzas('PA.sabor',null,it.id); rod=vol; break;
      case 'meia1':
        t='Primeira metade'; d='Escolha o sabor da 1ª metade. A pizza custa o valor da metade mais cara.';
        corpo=listaPizzas('PA.meia1',null,it.a); rod=vol; break;
      case 'meia2':
        var a=menu.find(function(x){return x.id===it.a;});
        t='Segunda metade'; d='1ª metade: '+(a?a.n:'')+'. Agora escolha a 2ª.';
        corpo=listaPizzas('PA.meia2',function(m){return m.id!==it.a;},it.b); rod=vol; break;
      case 'faixa':
        t='Qual combo?'; d='Cada combo tem 2 pizzas grandes. Escolha a faixa de preço.';
        corpo=cards(COMBOS_DEFAULT.map(function(c){return {v:c.id,t:c.titulo,s:c.sabores.join(', ')};}),'PA.faixa',it.faixa); rod=vol; break;
      case 'c1': case 'c2':
        var cfg=_comboCfg(P.tipo==='broto'?'broto50':it.faixa), k=P.passo==='c1'?1:2;
        t=(k===1?'Sabor da 1ª pizza':'Sabor da 2ª pizza'); d=(cfg?cfg.titulo:'')+(k===2?' · 1ª: '+it.s1:'')+(cfg&&!cfg.repete?' — só os sabores desta faixa':'');
        corpo='<input type="search" class="pa-busca" placeholder="🔎 Procurar sabor..." oninput="PA.filtrar(this.value)">'+
          cards((cfg?cfg.sabores:[]).map(function(s){var m=porNome(s);return {v:s,t:s,s:m?m.d:''};}),k===1?'PA.c1':'PA.c2',k===1?it.s1:it.s2);
        rod=vol; break;
      case 'borda':
        t='Quer borda recheada?'; d='Escolha uma opção. "Sem borda recheada" não muda o preço.';
        corpo=cardsBorda('PA.borda',it.borda); rod=FECHAR+vol; break;
      case 'borda1': case 'borda2':
        var q=P.passo==='borda1'?1:2;
        t='Borda da '+q+'ª pizza'; d=(q===1?it.s1:it.s2)+' — cada pizza do combo pode ter a sua borda.';
        corpo=cardsBorda(q===1?'PA.b1':'PA.b2',q===1?it.b1:it.b2); rod=FECHAR+vol; break;
      case 'tirar':
        var base=P.tipo==='meia'?[menu.find(function(x){return x.id===it.a;}),menu.find(function(x){return x.id===it.b;})]:[menu.find(function(x){return x.id===it.id;})];
        var ings=[]; base.forEach(function(m){ingredientes(m).forEach(function(g){if(ings.indexOf(g)<0)ings.push(g);});});
        t='Quer tirar algum ingrediente?'; d='Toque para tirar. Se não quiser tirar nada, é só seguir.';
        corpo='<div class="pa-chips">'+ings.map(function(g){var on=it.rem.indexOf(g)>=0;return '<button type="button" class="pa-chip'+(on?' on':'')+'" onclick="PA.tirar(\''+esc(g).replace(/'/g,"\\'")+'\')">'+(on?'✓ Sem ':'Sem ')+esc(g)+'</button>';}).join('')+'</div>';
        rod=FECHAR+vol+'<button type="button" class="pa-prim" onclick="PA.add()">Adicionar ao pedido ✓</button>'; break;
      case 'esf':
        var n=_esfTotal();
        t='Monte suas esfihas'; d='R$ 5 cada. Com 10 sai R$ 50, 20 por R$ 90 e 30 por R$ 130. Use + e −.';
        corpo='<div class="pa-esf">'+ESFIHA_SABORES.map(function(s){return '<div class="pa-esf-l"><span>'+esc(s)+'</span><button type="button" onclick="PA.esf(\''+s+'\',-1)">−</button><b>'+(_esf[s]||0)+'</b><button type="button" onclick="PA.esf(\''+s+'\',1)">+</button></div>';}).join('')+
          '</div><div class="pa-total-esf">'+n+' esfiha'+(n===1?'':'s')+' · <b>'+R(precoEsfihas(n))+'</b></div>';
        rod=vol+(n?'<button type="button" class="pa-prim" onclick="PA.addEsf()">Adicionar ao pedido ✓</button>':''); break;
      case 'beb':
        t='Bebidas e doces'; d='Use + e − para escolher a quantidade.';
        var grupos=[['Bebidas','d'],['Doces','dw'],['Calzones','cz']];
        corpo=grupos.map(function(g){var l=menu.filter(function(m){return m.cat===g[1];}); if(!l.length) return '';
          return '<h4 class="pa-h4">'+g[0]+'</h4><div class="pa-esf">'+l.map(function(m){var q=qtdNoCarrinho(m.id);return '<div class="pa-esf-l"><span>'+esc(m.n)+' <small>'+R(m.p)+'</small></span><button type="button" onclick="PA.beb('+m.id+',-1)">−</button><b>'+q+'</b><button type="button" onclick="PA.beb('+m.id+',1)">+</button></div>';}).join('')+'</div>';}).join('');
        rod=vol+'<button type="button" class="pa-prim" onclick="PA.contBeb()">'+(P.rapido?'Fechar pedido →':'Continuar →')+'</button>'; break;
      case 'refri':
        t='Quer um refrigerante?'; d='Seu pedido está pronto. É só dizer sim ou não e fechar.';
        corpo='<div class="pa-tipos">'+
          '<button type="button" class="pa-tipo" onclick="PA.refri(true)"><span>🥤</span><b>Sim</b><small>escolher a bebida</small></button>'+
          '<button type="button" class="pa-tipo" onclick="PA.refri(false)"><span>✅</span><b>Não, obrigado</b><small>fechar o pedido</small></button></div>';
        rod=vol; break;
      case 'mais':
        t='Mais alguma coisa?'; d='Seu pedido até agora está aqui embaixo.';
        corpo='<div class="pa-tipos pa-tipos-2">'+
          '<button type="button" class="pa-tipo" onclick="PA.ir(\'tipo\')"><span>➕</span><b>Adicionar mais</b><small>pizza, combo, esfiha…</small></button>'+
          '<button type="button" class="pa-tipo" onclick="PA.tipoDireto(\'beb\')"><span>🥤</span><b>Uma bebida?</b><small>refri e suco gelado</small></button></div>';
        rod='<button type="button" class="pa-prim pa-cheio" onclick="PA.ir(\'modo\')">Não, finalizar pedido →</button>'; break;
      case 'modo':
        var ret=$('delivery-method')&&$('delivery-method').checked;
        t='Entrega ou retirada?'; d='Com qualquer combo ou 2 pizzas a entrega é grátis (1 pizza: R$ 8,00).';
        corpo=cards([{v:false,t:'🛵 Entrega',s:'levamos até você'},{v:true,t:'🏠 Retirada',s:'você busca no balcão, grátis'}],'PA.modo',ret);
        rod=vol; break;
      case 'dados':
        t='Seus dados'; d='Seu nome e o WhatsApp para a pizzaria falar com você.';
        corpo='<div id="pa-slot"></div>'; rod=vol+'<button type="button" class="pa-prim" onclick="PA.okDados()">Continuar →</button>'; break;
      case 'end':
        t='Endereço de entrega'; d='Digite a rua e escolha na lista, depois o número. Ou use sua localização.';
        corpo='<div id="pa-slot"></div>'; rod=vol+'<button type="button" class="pa-prim" onclick="PA.okEnd()">Continuar →</button>'; break;
      case 'pag':
        t='Como vai pagar?'; d='Escolha a forma de pagamento.';
        corpo='<div id="pa-slot"></div>'; rod=vol+'<button type="button" class="pa-prim" onclick="PA.okPag()">Continuar →</button>'; break;
      case 'confere':
        t='Confira seu pedido'; d='Está tudo certo? Toque em enviar e o pedido vai pelo WhatsApp.';
        var ret2=$('delivery-method')&&$('delivery-method').checked;
        corpo='<div class="pa-conf">'+cart.map(function(c){
            var ex=[]; if(c.selectedBorda&&c.selectedBorda.price>0) ex.push('🥖 Borda: '+c.selectedBorda.name);
            if(c.removedIngredients&&c.removedIngredients.length) ex.push('🚫 Sem: '+c.removedIngredients.join(', '));
            var v=Number(c.p)+((c.selectedBorda&&c.selectedBorda.price)||0)+(c.addedIngredients||[]).reduce(function(t,a){return t+(Number(a.price)||0);},0);
            return '<div class="pa-conf-l"><div><b>'+esc(c.n)+'</b>'+ex.map(function(x){return '<small>'+esc(x)+'</small>';}).join('')+'</div><span>'+R(v)+'</span></div>';
          }).join('')+'<div class="pa-conf-l pa-conf-t"><b>Total (com entrega)</b><span>'+($('total-val')?$('total-val').textContent:'')+'</span></div></div>'+
          '<div class="pa-conf-dados"><b>'+esc($('u-name').value)+'</b> · '+esc($('u-tel').value)+'<br>'+(ret2?'🏠 Retirada no balcão':'🛵 '+esc($('u-end').value)+', nº '+esc($('u-num').value))+'<br>💳 '+esc($('u-pay').value)+'</div>';
        rod=vol+'<button type="button" class="pa-prim pa-zap" onclick="PA.enviar()">📲 Enviar pelo WhatsApp</button>'; break;
    }
    $('pa-titulo').textContent=t; $('pa-dica').textContent=d; $('pa-corpo').innerHTML=corpo; $('pa-rodape').innerHTML=rod;
    var slot=$('pa-slot');
    if(slot&&P.passo==='dados') emprestar(['u-name','u-tel'],slot);
    if(slot&&P.passo==='end') emprestar(['addr-fields'],slot);
    if(slot&&P.passo==='pag') emprestar(['pay-chips','u-change'],slot);
    var et=ETAPAS.findIndex(function(e){return e[1].indexOf(P.passo)>=0;});
    $('pa-trilha').innerHTML=ETAPAS.map(function(e,i){return '<span class="'+(i<et?'feito':i===et?'agora':'')+'"><i>'+(i<et?'✓':i+1)+'</i>'+e[0]+'</span>';}).join('');
    var n=cart.length;
    $('pa-carrinho').innerHTML=n?'🛒 <b>'+n+' ite'+(n===1?'m':'ns')+'</b> no pedido · <b>'+($('total-val')?$('total-val').textContent:'')+'</b>':'🛒 Seu pedido está vazio';
  }

  // ── Tela de boas-vindas (logo depois da splash): "Pedido rápido" (este assistente) ou "Ver o site",
  //    com o vídeo "Como pedir" num quadro pequeno (não cobre a tela toda). Uma vez por visita.
  function boasVindas(){
    if($('boas-vindas')) return;
    
    var d=document.createElement('div'); d.id='boas-vindas'; d.className='bv-ov'; d.setAttribute('role','dialog'); d.setAttribute('aria-label','Como você quer pedir?');
    d.innerHTML='<div class="bv-fundo" style="background-image:url(assets/fachada-fundo.jpg)"></div><div class="bv-veu"></div>'+
      '<div class="bv-txt"><img class="bv-logo" src="assets/logo.png" alt="Pizza em Dobro" width="84" height="84"><h2>Pizza em <span>Dobro</span></h2><p class="bv-sub">Como você quer começar?</p>'+
        '<button type="button" class="bv-site" onclick="PA.bvSite()"><span class="bv-ico">🌐</span><span class="bv-tx">Acessar o site<small>ver tudo e pedir do seu jeito</small></span><span class="bv-seta">›</span></button>'+
        '<button type="button" class="bv-rapido" onclick="PA.bvRapido()"><span class="bv-ico">⚡</span><span class="bv-tx">Pedido rápido<small>uma pergunta por vez, bem fácil</small></span><span class="bv-seta">›</span></button>'+
        '<button type="button" class="bv-site" onclick="PA.bvCardapio()"><span class="bv-ico">🍕</span><span class="bv-tx">Cardápio<small>sabores, combos e esfihas</small></span><span class="bv-seta">›</span></button>'+
        '<button type="button" class="bv-site bv-adm" onclick="PA.bvAdmin()"><span class="bv-ico">🔐</span><span class="bv-tx">Acesso admin<small>equipe da pizzaria</small></span><span class="bv-seta">›</span></button></div>';
    // rolar/deslizar pra cima na tela do vídeo = entrar no site (tablet/celular: o gesto natural de "scroll")
    var y0=null;
    d.addEventListener('touchstart',function(e){ y0=e.touches[0].clientY; },{passive:true});
    d.addEventListener('touchmove',function(e){ if(y0!==null && y0-e.touches[0].clientY>50){ y0=null; PA.bvSite(); } },{passive:true});
    d.addEventListener('wheel',function(e){ if(e.deltaY>10) PA.bvSite(); },{passive:true});
    document.body.appendChild(d); requestAnimationFrame(function(){ d.classList.add('on'); });
  }
  function fecharBV(){ var d=$('boas-vindas'); if(!d) return; d.classList.remove('on'); setTimeout(function(){ d.remove(); },300); }
  window.mostrarBoasVindas=boasVindas;

  window.PA={
    bvRapido:function(){ fecharBV(); abrir(); },
    bvSite:function(){ fecharBV(); },
    bvCardapio:function(){ fecharBV(); setTimeout(function(){ var el=document.getElementById('cat-co')||document.querySelector('.nav-bar'); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); },350); },
    bvAdmin:function(){ location.href='admin/'; },
    abrir:abrir, fechar:fechar, voltar:voltar, ir:ir,
    tipo:function(t){escolherTipo(t);},
    tipoDireto:function(t){escolherTipo(t);},
    // Marco: "um botão que leva direto a fechar o pedido" — conclui o item em andamento (com o que já foi escolhido), pergunta do refri e vai pros dados
    fecharRapido:function(){ P.rapido=true; var it=P.it, t=P.tipo;
      var ok=(t==='pizza'&&it.id)||(t==='meia'&&it.a&&it.b)||((t==='combo'||t==='broto')&&it.s1&&it.s2);
      if(ok) adicionar('refri'); else ir('refri'); },
    // "Continuar pedindo": guarda o item em andamento e volta pra escolher mais coisas
    continuarPedindo:function(){ var it=P.it, t=P.tipo;
      var ok=(t==='pizza'&&it.id)||(t==='meia'&&it.a&&it.b)||((t==='combo'||t==='broto')&&it.s1&&it.s2);
      if(ok) adicionar('tipo'); else ir('tipo'); },
    contBeb:function(){ ir(P.rapido?'modo':'mais'); },
    refri:function(sim){ if(sim){ P.tipo='beb'; P.it={borda:0,b1:0,b2:0,rem:[]}; ir('beb'); } else ir('modo'); },
    filtrar:function(q){ q=String(q||'').toLowerCase(); document.querySelectorAll('#pa-corpo .pa-op').forEach(function(b){ b.style.display=b.textContent.toLowerCase().indexOf(q)>=0?'':'none'; }); },
    sabor:function(id){P.it.id=id; ir('borda');},
    meia1:function(id){P.it.a=id; ir('meia2');},
    meia2:function(id){P.it.b=id; ir('borda');},
    faixa:function(f){P.it.faixa=f; ir('c1');},
    c1:function(s){P.it.s1=s; ir('c2');},
    c2:function(s){P.it.s2=s; ir('borda1');},
    borda:function(i){P.it.borda=i; ir('tirar');},
    b1:function(i){P.it.b1=i; ir('borda2');},
    b2:function(i){P.it.b2=i; adicionar();},
    tirar:function(g){var r=P.it.rem,k=r.indexOf(g); if(k>=0) r.splice(k,1); else r.push(g); render();},
    add:adicionar,
    esf:function(s,d){_esf[s]=Math.max(0,(_esf[s]||0)+d); if(typeof esfAtualizar==='function') esfAtualizar(); render();},
    addEsf:function(){ if(!_esfTotal()) return; addEsfihasToCart(); ir('mais'); },
    beb:function(id,d){ if(d>0) addItem(id); else removeItem(id); render(); },
    modo:function(ret){ definirModoEntrega(!!ret); ir('dados'); },
    okDados:function(){
      var nome=$('u-name').value.trim(), tel=_telDigitos($('u-tel').value);
      if(!nome){ $('u-name').style.borderColor='#e71d36'; $('u-name').focus(); return; }
      if(!/^[1-9][1-9](9\d{8}|[2-5]\d{7})$/.test(tel)){ $('u-tel').style.borderColor='#e71d36'; $('u-tel').focus(); return; }
      ir($('delivery-method').checked?'pag':'end');
    },
    okEnd:function(){
      if(!$('u-end').value.trim()){ $('u-end').style.borderColor='#e71d36'; $('u-end').focus(); return; }
      if(!$('u-num').value.trim()){ $('u-num').style.borderColor='#e71d36'; $('u-num').focus(); return; }
      ir('pag');
    },
    okPag:function(){ if(!$('u-pay').value){ var b=$('pay-chips'); if(b) b.classList.add('erro'); return; } ir('confere'); },
    enviar:function(){ devolver(); fechar(); finalizar(); }
  };
})();
