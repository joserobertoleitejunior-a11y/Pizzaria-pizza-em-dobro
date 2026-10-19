// ══════════════════════════════════════════════════════════
//  PASSO A PASSO DO CAIXA — guia a atendente: tipo de pedido → itens → "quer bebida?" → entrega/retirada
//  → fecha no carrinho (nome, telefone, endereço, pagamento). Reaproveita tudo do Caixa normal.
// ══════════════════════════════════════════════════════════
window._ppAtivo=false;
let _pp={passo:'tipo',tipo:null,meiaA:null};
const PP_TIPOS=[
  {id:'pizza',ico:'🍕',nome:'Pizza grande',sub:'inteira, com borda e acréscimos'},
  {id:'combo',ico:'🍕🍕',nome:'Combo 2 por…',sub:'R$ 65 · 75 · 80 · 85'},
  {id:'broto',ico:'🧁',nome:'Combo Broto',sub:'2 broto por R$ 50'},
  {id:'meia',ico:'½',nome:'Meia a meia',sub:'2 sabores numa pizza'},
  {id:'esf',ico:'🥟',nome:'Esfihas',sub:'10 · 20 · 30'},
  {id:'doce',ico:'🍫',nome:'Doces',sub:'pizza doce, brigadeirão, pudim'},
  {id:'calz',ico:'🥙',nome:'Calzones',sub:'doces'}
];
function abrirPasso(){
  window._ppAtivo=true; _pp={passo:cart.length?'mais':'tipo',tipo:null,meiaA:null};
  document.getElementById('pp-ov').classList.add('open'); ppRender();
}
function fecharPasso(){ window._ppAtivo=false; document.getElementById('pp-ov').classList.remove('open'); renderProdutos(); }
function ppIr(passo,extra){ Object.assign(_pp,{passo},extra||{}); ppRender(); }
function ppAposAdicionar(){ if(!window._ppAtivo) return; if(_pp.passo==='item'&&(_pp.tipo==='pizza'||_pp.tipo==='combo'||_pp.tipo==='broto'||_pp.tipo==='meia'||_pp.tipo==='esf')) ppIr('mais'); else ppRender(); }

function _ppResumo(){
  const n=qtdCarrinho();
  return `<div class="pp-resumo"><span>🛒 ${n?n+(n===1?' item':' itens'):'Nada ainda'}</span><b>${fmt(totalCarrinho())}</b>${n?'<button type="button" onclick="ppVerPedido()">Ver pedido</button>':''}</div>`;
}
function ppVerPedido(){ openCartModal(); }
function _ppGradeQtd(itens){
  return '<div class="prod-grid">'+itens.map(i=>{
    const q=qtdSimples(i.id);
    return `<div class="prod-card bebida ${q?'tem':''}" onclick="ajustarQtdSimples(${i.id},1)"><div class="prod-nome">${i.n}</div><div class="prod-preco">${fmt(i.p)}</div>
      <div class="bebida-qtd" onclick="event.stopPropagation()"><button type="button" class="bq-btn" onclick="ajustarQtdSimples(${i.id},-1)">−</button><b class="bq-num">${q}</b><button type="button" class="bq-btn mais" onclick="ajustarQtdSimples(${i.id},1)">+</button></div></div>`;
  }).join('')+'</div>';
}
function _ppChips(itens,fn){ return '<div class="chips-sab">'+itens.map(i=>`<button type="button" class="chip-sab" onclick="${fn}(${i.id})">${i.n}<small> ${fmt(i.p)}</small></button>`).join('')+'</div>'; }

function ppRender(){
  const t=document.getElementById('pp-titulo'), b=document.getElementById('pp-corpo'), f=document.getElementById('pp-rodape');
  if(!t) return;
  const passos={tipo:1,item:1,mais:1,bebida:2,bebida2:2,entrega:3};
  document.querySelectorAll('#pp-trilha i').forEach((d,i)=>d.classList.toggle('on',i<passos[_pp.passo]));
  let corpo='', rodape='', titulo='';
  if(_pp.passo==='tipo'){
    titulo='Que tipo de pedido?';
    corpo='<div class="pp-tipos">'+PP_TIPOS.map(x=>`<button type="button" class="pp-tipo" onclick="ppIr('item',{tipo:'${x.id}',meiaA:null})"><span class="pp-ico">${x.ico}</span><b>${x.nome}</b><small>${x.sub}</small></button>`).join('')+'</div>';
    rodape=`<button type="button" class="pp-sec" onclick="ppIr('bebida')">Só bebida →</button>`+(cart.length?`<button type="button" class="pp-prim" onclick="ppIr('bebida')">Pronto, seguir →</button>`:'');
  }else if(_pp.passo==='item'){
    const nome=(PP_TIPOS.find(x=>x.id===_pp.tipo)||{}).nome||'';
    titulo=nome;
    if(_pp.tipo==='pizza'){ corpo='<h4>Tradicionais</h4>'+_ppChips(DEFAULT_MENU.filter(i=>i.cat==='p'),'ppPizza')+'<h4>Especiais</h4>'+_ppChips(DEFAULT_MENU.filter(i=>i.cat==='s'),'ppPizza'); }
    else if(_pp.tipo==='meia'){ const base=DEFAULT_MENU.filter(i=>i.cat==='p'||i.cat==='s'); corpo=`<p class="pp-dica">${_pp.meiaA?'1ª metade: <b>'+_pp.meiaA.n+'</b> — toque na 2ª metade':'Toque na 1ª metade'}</p>`+_ppChips(base,'ppMeia'); }
    else if(_pp.tipo==='combo'||_pp.tipo==='broto'){ corpo='<div id="pp-sub"></div>'; }
    else if(_pp.tipo==='esf'){ corpo='<div id="pp-sub" class="prod-grid"></div>'; }
    else if(_pp.tipo==='doce'){ corpo=_ppGradeQtd(DEFAULT_MENU.filter(i=>i.cat==='dw')); }
    else if(_pp.tipo==='calz'){ corpo=_ppGradeQtd(DEFAULT_MENU.filter(i=>i.cat==='cz')); }
    rodape=`<button type="button" class="pp-sec" onclick="ppIr('tipo')">← Voltar</button><button type="button" class="pp-prim" onclick="ppIr('mais')">Continuar →</button>`;
  }else if(_pp.passo==='mais'){
    titulo='Adicionado! ✅';
    corpo=`<div class="pp-lista">${cart.map(i=>`<div><span>${i.qty}× ${i.name}</span><b>${fmt(i.unitPrice*i.qty)}</b></div>`).join('')||'<p>Carrinho vazio.</p>'}</div><div class="pp-pergunta">Mais alguma pizza, combo ou esfiha?</div>
      <div class="pp-duas"><button type="button" class="pp-grande sim" onclick="ppIr('tipo')">➕ Sim, adicionar mais</button><button type="button" class="pp-grande" onclick="ppIr('bebida')">Não, é só isso →</button></div>`;
    rodape='';
  }else if(_pp.passo==='bebida'){
    titulo='Bebida';
    corpo=`<div class="pp-pergunta">O cliente quer bebida?</div><div class="pp-duas"><button type="button" class="pp-grande sim" onclick="ppIr('bebida2')">🥤 Sim</button><button type="button" class="pp-grande" onclick="ppIr('entrega')">Não →</button></div>`;
    rodape=`<button type="button" class="pp-sec" onclick="ppIr(cart.length?'mais':'tipo')">← Voltar</button>`;
  }else if(_pp.passo==='bebida2'){
    titulo='Escolha as bebidas';
    corpo=_ppGradeQtd(DEFAULT_MENU.filter(i=>i.cat==='d'));
    rodape=`<button type="button" class="pp-sec" onclick="ppIr('bebida')">← Voltar</button><button type="button" class="pp-prim" onclick="ppIr('entrega')">Continuar →</button>`;
  }else if(_pp.passo==='entrega'){
    titulo='Entrega ou retirada?';
    const np=pizzasNoCaixa(), nc=combosNoCaixa(), gratis=np>=PIZZAS_ENTREGA_GRATIS||nc>=COMBOS_ENTREGA_GRATIS;
    corpo=`<div class="pp-duas"><button type="button" class="pp-grande sim" onclick="ppFechar('entrega')">Entrega<small>${gratis?'Entrega GRÁTIS neste pedido':(np>0?'faltam '+Math.max(1,PIZZAS_ENTREGA_GRATIS-np)+' pizza(s) para entrega grátis':'taxa padrão')}</small></button><button type="button" class="pp-grande" onclick="ppFechar('retirada')">Retirada<small>cliente busca no balcão</small></button></div>`;
    rodape=`<button type="button" class="pp-sec" onclick="ppIr('bebida')">← Voltar</button>`;
  }
  t.textContent=titulo; b.innerHTML=corpo; f.innerHTML=rodape+_ppResumo();
  if(_pp.passo==='item'){
    const sub=document.getElementById('pp-sub');
    if(sub&&(_pp.tipo==='combo'||_pp.tipo==='broto')) renderCombosCaixa(sub,_pp.tipo==='combo'?'combos':'broto');
    if(sub&&_pp.tipo==='esf') renderEsfihasCaixa(sub);
  }
}
function ppPizza(id){ abrirItem(id); }
function ppMeia(id){
  const m=DEFAULT_MENU.find(x=>x.id===id); if(!m) return;
  if(!_pp.meiaA){ _pp.meiaA=m; ppRender(); return; }
  adicionarMeiaAMeiaAoCarrinho(_pp.meiaA,m,null,[],1);
  _pp.meiaA=null; atualizarBarraCarrinho(); avisoRapido('✓ Meia a meia adicionada'); ppAposAdicionar();
}
function ppFechar(tipoVenda){
  const sel=document.getElementById('f-tipo'); if(sel){ sel.value=tipoVenda; alternarCampoEntregador(); }
  fecharPasso();
  if(cart.length) openCartModal(); else avisoRapido('Carrinho vazio');
}
