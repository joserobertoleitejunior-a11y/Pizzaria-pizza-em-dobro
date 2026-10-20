function setView(v){
  document.getElementById('view-pdv').classList.toggle('active',v==='pdv');
  document.getElementById('view-hoje').classList.toggle('active',v==='hoje');
  document.getElementById('tab-pdv').classList.toggle('active',v==='pdv');
  document.getElementById('tab-hoje').classList.toggle('active',v==='hoje');
  const controles=document.querySelector('.pdv-controls');
  const cats=document.getElementById('cats');
  if(controles) controles.style.display=(v==='pdv')?'':'none';
  if(cats) cats.style.display=(v==='pdv')?'':'none';
  if(v==='hoje') carregarVendasHoje();
}

// ---- MEIA A MEIA ----
function alternarMeiaAMeia(){
  meiaAMeiaAtivo=!meiaAMeiaAtivo;
  meiaPrimeiraMetade=null;
  document.getElementById('btn-meia').classList.toggle('active',meiaAMeiaAtivo);
  document.getElementById('busca-produto').placeholder=meiaAMeiaAtivo?'Escolha a 1ª metade...':'Buscar pizza...';
  renderProdutos();
}

// ---- CATEGORIAS ----
function renderCats(){
  document.getElementById('cats').innerHTML=CATS_ORDER.map(c=>
    `<div class="cat-chip ${c===catAtiva?'active':''}" onclick="selecionarCat('${c}')">${CATLABELS[c]}</div>`
  ).join('');
}
function selecionarCat(c){ catAtiva=c; document.getElementById('busca-produto').value=''; renderCats(); renderProdutos(); }

// ---- PRODUTOS ----
function renderProdutos(){
  const termo=(document.getElementById('busca-produto').value||'').toLowerCase().trim();
  const grid=document.getElementById('prod-grid');
  if(!termo && !meiaAMeiaAtivo && catAtiva==='co'){
    document.getElementById('cats').style.display='flex';
    renderCombosCaixa(grid);
    return;
  }
  if(!termo && !meiaAMeiaAtivo && catAtiva==='es'){
    document.getElementById('cats').style.display='flex';
    renderEsfihasCaixa(grid);
    return;
  }
  let base=meiaAMeiaAtivo ? DEFAULT_MENU.filter(i=>i.cat==='p'||i.cat==='s') : DEFAULT_MENU;
  let itens = termo ? base.filter(i=>i.n.toLowerCase().includes(termo)) : base.filter(i=>i.cat===catAtiva);
  document.getElementById('cats').style.display=(termo||meiaAMeiaAtivo)?'none':'flex';
  if(itens.length===0){ grid.innerHTML='<div class="empty">Nenhum item encontrado.</div>'; return; }
  if(!termo&&!meiaAMeiaAtivo&&catAtiva==='d'){ // BEBIDAS: toque soma 1; − e + ajustam a quantidade
    grid.innerHTML=itens.map(i=>{
      const q=qtdSimples(i.id);
      return `<div class="prod-card bebida ${q?'tem':''}" onclick="ajustarQtdSimples(${i.id},1)">
        <div class="prod-nome">${i.n}</div><div class="prod-preco">${fmt(i.p)}</div>
        <div class="bebida-qtd" onclick="event.stopPropagation()">
          <button type="button" class="bq-btn" onclick="ajustarQtdSimples(${i.id},-1)" aria-label="menos">−</button>
          <b class="bq-num">${q}</b>
          <button type="button" class="bq-btn mais" onclick="ajustarQtdSimples(${i.id},1)" aria-label="mais">+</button>
        </div></div>`;
    }).join('');
    return;
  }
  grid.innerHTML=itens.map(i=>`
    <div class="prod-card ${meiaPrimeiraMetade&&meiaPrimeiraMetade.id===i.id?'meia-sel':''}" onclick="clicarProduto(${i.id})">
      <div class="prod-nome">${i.n}</div>
      <div class="prod-preco">${fmt(i.p)}</div>
    </div>`).join('');
}
// ── FUNÇÕES ÚNICAS (botões e Colar Pedido): combo broto e esfihas ──
function adicionarBrotoAoCarrinho(s1, s2, qtd){
  const novo={ _chave:'combo|broto50|'+[s1,s2].slice().sort().join('+'), id:null, name:`${COMBO_BROTO.titulo} — ${s1} + ${s2}`,
    unitPrice:COMBO_BROTO.preco, qty:qtd||1, borda:null, removedIng:[], addedIng:[], isMeia:false, combos:1 };
  const ex=cart.find(c=>c._chave===novo._chave);
  if(ex) ex.qty+=novo.qty; else cart.push(novo);
}
function adicionarEsfihasAoCarrinho(contagens, qtd){
  const n=ESFIHA_SABORES.reduce((t,sab)=>t+(contagens[sab]||0),0); if(!n)return;
  const nome=nomeEsfihas(contagens);
  const novo={ _chave:'esf|'+nome, id:null, name:nome, unitPrice:precoEsfihas(n), qty:qtd||1, borda:null, removedIng:[], addedIng:[], isMeia:false, combos:combosDeEsfiha(n) };
  const ex=cart.find(c=>c._chave===novo._chave);
  if(ex) ex.qty+=novo.qty; else cart.push(novo);
}

// Item simples (bebida): quantidade direto no cartão, sem abrir janela
function qtdSimples(id){ const c=cart.find(x=>x._chave==='simples|'+id); return c?c.qty:0; }
function ajustarQtdSimples(id,d){
  const m=DEFAULT_MENU.find(x=>x.id===id); if(!m) return;
  let c=cart.find(x=>x._chave==='simples|'+id);
  if(!c){ if(d<0) return; c={_chave:'simples|'+id,id:m.id,name:m.n,unitPrice:m.p,qty:0,borda:null,removedIng:[],addedIng:[],isMeia:false}; cart.push(c); }
  c.qty+=d;
  if(c.qty<=0) cart.splice(cart.indexOf(c),1);
  atualizarBarraCarrinho(); renderProdutos();
  if(window._ppAtivo&&typeof ppRender==='function') ppRender();
}

// ── COMBOS: toque nos 2 sabores e já entra no caixa (nada de listas suspensas) ──
const _cmbSel={}; // {tierId:[sabores escolhidos]}
function _chipsCombo(tierId,sabores,permiteRepetir){
  const sel=_cmbSel[tierId]||[];
  return sabores.map(sab=>{
    const n=sel.filter(x=>x===sab).length;
    return `<button type="button" class="chip-sab ${n?'sel':''}" onclick="cmbToque('${tierId}','${sab.replace(/'/g,"\\'")}',${permiteRepetir?1:0})">${sab}${n>1?' ×2':''}</button>`;
  }).join('');
}
function _cardCombo(tierId,titulo,preco,sabores,permiteRepetir,dica){
  const sel=_cmbSel[tierId]||[];
  return `<div class="cmb-card" id="cmb-${tierId}">
    <div class="cmb-topo"><b>🍕🍕 ${titulo}</b><span class="cmb-preco">${fmt(preco)}</span></div>
    <div class="cmb-dica">${sel.length===0?dica:(sel.length===1?'1º: <b>'+sel[0]+'</b> — escolha o 2º sabor':'')}${sel.length===1&&permiteRepetir?` <button type="button" class="cmb-mesmo" onclick="cmbToque('${tierId}','${sel[0].replace(/'/g,"\\'")}',1)">2 do mesmo ✓</button>`:''}</div>
    <div class="chips-sab">${_chipsCombo(tierId,sabores,permiteRepetir)}</div>
  </div>`;
}
let _cmbAlvo=null, _cmbSo=null;
function cmbToque(tierId,sab,permiteRepetir){
  let sel=_cmbSel[tierId]=_cmbSel[tierId]||[];
  if(sel.length===1&&sel[0]===sab&&!permiteRepetir){ _cmbSel[tierId]=[]; renderCombosCaixa(_cmbAlvo||document.getElementById('prod-grid'),_cmbSo); return; } // tocar de novo desmarca
  sel.push(sab);
  if(sel.length===2){
    if(tierId==='broto50') adicionarBrotoAoCarrinho(sel[0],sel[1],1);
    else{ const combo=COMBOS_DEFAULT.find(c=>c.id===tierId); if(combo) adicionarComboAoCarrinho(combo,sel[0],sel[1],1); }
    _cmbSel[tierId]=[];
    atualizarBarraCarrinho();
    avisoRapido('✓ Combo adicionado');
    if(typeof ppAposAdicionar==='function') ppAposAdicionar();
  }
  renderCombosCaixa(_cmbAlvo||document.getElementById('prod-grid'),_cmbSo);
}
function renderCombosCaixa(grid,so){
  _cmbAlvo=grid; _cmbSo=so||null;
  if(typeof COMBOS_DEFAULT==='undefined'){ grid.innerHTML='<div class="empty">Combos indisponíveis.</div>'; return; }
  const saboresBroto=DEFAULT_MENU.filter(i=>i.cat==='p'||i.cat==='s').map(i=>i.n).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  grid.innerHTML='<div class="cmb-lista">'+
    (so==='combos'?'':_cardCombo('broto50',COMBO_BROTO.titulo,COMBO_BROTO.preco,saboresBroto,true,'Toque nos 2 sabores (qualquer pizza, pode repetir)'))+
    (so==='broto'?'':COMBOS_DEFAULT.map(c=>_cardCombo(c.id,c.titulo,c.preco,c.sabores,false,'Toque em 2 sabores diferentes')).join(''))+'</div>';
}

// ── ESFIHAS (R$ 5 cada; 10 = R$ 50, 20 = R$ 90, 30 = R$ 130) — mesma regra e mesmo preço do site ──
const _esfCx={};
function renderEsfihasCaixa(grid){
  grid.innerHTML=`<div class="esf-cx">
    <div class="esf-cx-titulo">🥟 Esfihas — R$ 5,00 cada</div>
    <div class="esf-cx-rapido">`+ESFIHA_PACOTES.map(pk=>`<button type="button" class="esf-pk" onclick="esfCxPacote(${pk.qtd})"><b>${pk.qtd}</b><span>esfihas</span><em>${fmt(pk.preco)}</em></button>`).join('')+`</div>
    <div class="esf-cx-dica">Toque num combo: entra no caixa com os <b>sabores padrão</b>. Quer escolher os sabores? Use + e − abaixo e toque em Adicionar.</div>`+
    ESFIHA_SABORES.map((s,i)=>`<div class="esf-cx-linha"><span>${s}${ESFIHA_PADRAO.includes(s)?'':' <small style="color:#B45309;font-weight:700">(doce)</small>'}</span>
      <span class="esf-cx-ctl"><button type="button" onclick="esfCxMudar(${i},-1)">−</button><b id="cx-esf-q-${i}">${_esfCx[s]||0}</b><button type="button" class="mais" onclick="esfCxMudar(${i},1)">+</button></span></div>`).join('')+
    `<div id="cx-esf-resumo" class="esf-cx-resumo"></div>
    <button type="button" class="esf-cx-add" onclick="adicionarEsfihasCaixa()">+ Adicionar esfihas escolhidas</button></div>`;
  esfCxAtualizar();
}
function esfCxPacote(qtd){
  adicionarEsfihasAoCarrinho(esfDistribuirPadrao(qtd),1);
  atualizarBarraCarrinho(); avisoRapido('✓ Combo de '+qtd+' esfihas adicionado');
  if(typeof ppAposAdicionar==='function') ppAposAdicionar();
}
function esfCxMudar(i,d){ const s=ESFIHA_SABORES[i]; _esfCx[s]=Math.max(0,Math.min(120,(_esfCx[s]||0)+d)); esfCxAtualizar(); }
function esfCxAtualizar(){
  ESFIHA_SABORES.forEach((s,i)=>{ const e=document.getElementById('cx-esf-q-'+i); if(e)e.textContent=_esfCx[s]||0; });
  const n=ESFIHA_SABORES.reduce((t,s)=>t+(_esfCx[s]||0),0), r=document.getElementById('cx-esf-resumo');
  if(r) r.textContent=n?`${n} esfiha(s) = ${fmt(precoEsfihas(n))}`:'';
}
function adicionarEsfihasCaixa(){
  if(!ESFIHA_SABORES.some(s=>_esfCx[s]>0)){ avisoRapido('Escolha as quantidades (+) ou toque num combo acima'); return; }
  adicionarEsfihasAoCarrinho(_esfCx,1);
  ESFIHA_SABORES.forEach(s=>_esfCx[s]=0); esfCxAtualizar();
  atualizarBarraCarrinho(); avisoRapido('✓ Esfihas adicionadas');
  if(typeof ppAposAdicionar==='function') ppAposAdicionar();
}
// ── FUNÇÃO ÚNICA para montar item de combo — usada pelo botão manual E pelo Colar Pedido,
// mesma lógica de deduplicação/soma de quantidade do meia a meia (chave determinística, nunca Math.random()).
function criarItemCombo(combo, s1, s2, qtd){
  return {
    _chave:'combo|'+combo.id+'|'+[s1,s2].slice().sort().join('+'),
    id:null, name:`${combo.titulo} — ${s1} + ${s2}`, unitPrice:combo.preco, qty:qtd||1,
    borda:null, removedIng:[], addedIng:[], isMeia:false, combos:1
  };
}
function adicionarComboAoCarrinho(combo, s1, s2, qtd){
  const novo=criarItemCombo(combo, s1, s2, qtd);
  const existente=cart.find(c=>c._chave===novo._chave);
  if(existente){ existente.qty+=novo.qty; }
  else{ cart.push(novo); }
}

// ── FUNÇÃO ÚNICA para montar item meia a meia — usada pelo modo manual E pelo Colar Pedido,
// garantindo que os dois caminhos produzam exatamente o mesmo resultado, sem divergência.
function criarItemMeiaAMeia(metadeA, metadeB, bordaNome, removidos, qtd, acrescimos){
  const borda=BORDAS_DEFAULT.find(b=>b.name===bordaNome);
  const precoBorda=(borda&&borda.name!=='Sem Borda Recheada')?borda.price:0;
  const bordaFinal=(borda&&borda.name!=='Sem Borda Recheada')?borda.name:null;
  const acrs=Array.isArray(acrescimos)?acrescimos:[];
  const unitPrice=Math.max(metadeA.p,metadeB.p)+precoBorda+acrs.reduce((t,a)=>t+a.price,0); // regra oficial: metade mais cara + borda + acréscimos
  return {
    _chave:'meia|'+[metadeA.id,metadeB.id].sort().join('-')+'|'+bordaFinal+'|'+(removidos||[]).slice().sort().join(',')+'|'+acrs.map(a=>a.name).sort().join(','),
    id:null, name:`Meio a Meio: ${metadeA.n} / ${metadeB.n}`, unitPrice, qty:qtd||1,
    borda:bordaFinal, removedIng:removidos||[], addedIng:acrs.map(a=>a.name), isMeia:true
  };
}
function adicionarMeiaAMeiaAoCarrinho(metadeA, metadeB, bordaNome, removidos, qtd, acrescimos){
  const novo=criarItemMeiaAMeia(metadeA, metadeB, bordaNome, removidos, qtd, acrescimos);
  const existente=cart.find(c=>c._chave===novo._chave);
  if(existente){ existente.qty+=novo.qty; }
  else{ cart.push(novo); }
}

function clicarProduto(id){
  const item=DEFAULT_MENU.find(i=>i.id===id);
  if(!item) return;
  if(meiaAMeiaAtivo){
    if(!meiaPrimeiraMetade){
      meiaPrimeiraMetade=item;
      document.getElementById('busca-produto').placeholder='Escolha a 2ª metade...';
      renderProdutos();
    } else {
      const metadeA=meiaPrimeiraMetade, metadeB=item;
      adicionarMeiaAMeiaAoCarrinho(metadeA, metadeB, null, [], 1);
      meiaPrimeiraMetade=null;
      document.getElementById('busca-produto').placeholder='Buscar pizza...';
      atualizarBarraCarrinho();
      renderProdutos();
    }
    return;
  }
  abrirItem(id);
}

// ---- MODAL ITEM (borda + retirar ingrediente, SEM acréscimos) ----
function abrirItem(id){
  const item=DEFAULT_MENU.find(i=>i.id===id);
  if(!item) return;
  itemEmEdicao={menuItem:item, borda:BORDAS_DEFAULT[0], removidos:[], acrescimos:[]};
  document.getElementById('item-nome').textContent=item.n;

  const bordaBox=document.getElementById('item-borda-box');
  const ingBox=document.getElementById('item-ing-box');
  const acrBox=document.getElementById('item-acr-box');

  if(itemAceitaOpcoes(item.cat)){
    bordaBox.style.display='block';
    document.getElementById('item-bordas').innerHTML=BORDAS_DEFAULT.map((b,idx)=>`
      <div class="opt-row">
        <span>${b.name}${b.price?' (+'+fmt(b.price)+')':''}</span>
        <input type="radio" name="borda" ${idx===0?'checked':''} onchange="itemEmEdicao.borda=BORDAS_DEFAULT[${idx}]">
      </div>`).join('');
    const ings=getIngredientes(item.d);
    ingBox.style.display=ings.length?'block':'none';
    document.getElementById('item-ingredientes').innerHTML=ings.map(ing=>`
      <span class="ing-chip" data-ing="${ing}" onclick="toggleIngrediente(this,'${ing.replace(/'/g,"\\'")}')">✕ ${ing}</span>`).join('');
    acrBox.style.display='block';
    document.getElementById('item-acrescimos').innerHTML=ACRESCIMOS_DEFAULT.map((a,idx)=>`
      <span class="acr-chip" onclick="toggleAcrescimo(this,${idx})">+ ${a.name} (+${fmt(a.price)})</span>`).join('');
  } else {
    bordaBox.style.display='none';
    ingBox.style.display='none';
    acrBox.style.display='none';
  }
  openModal('modal-item');
}
function toggleIngrediente(el,ing){
  el.classList.toggle('removido');
  if(el.classList.contains('removido')) itemEmEdicao.removidos.push(ing);
  else itemEmEdicao.removidos=itemEmEdicao.removidos.filter(x=>x!==ing);
}
function toggleAcrescimo(el,idx){
  const a=ACRESCIMOS_DEFAULT[idx];
  el.classList.toggle('sel');
  if(el.classList.contains('sel')) itemEmEdicao.acrescimos.push(a);
  else itemEmEdicao.acrescimos=itemEmEdicao.acrescimos.filter(x=>x!==a);
}
function confirmarItem(){
  const {menuItem,borda,removidos,acrescimos}=itemEmEdicao;
  const precoBorda=itemAceitaOpcoes(menuItem.cat)&&borda?borda.price:0;
  const precoAcr=acrescimos.reduce((s,a)=>s+a.price,0);
  const unitPrice=menuItem.p+precoBorda+precoAcr;
  const bordaNome=itemAceitaOpcoes(menuItem.cat)&&borda&&borda.name!=='Sem Borda Recheada'?borda.name:null;
  const acrNomes=acrescimos.map(a=>a.name);
  const chave=menuItem.id+'|'+bordaNome+'|'+removidos.slice().sort().join(',')+'|'+acrNomes.slice().sort().join(',');
  const existente=cart.find(c=>c._chave===chave);
  if(existente){ existente.qty++; }
  else{
    cart.push({_chave:chave, id:menuItem.id, name:menuItem.n, unitPrice, qty:1, borda:bordaNome, removedIng:removidos.slice(), addedIng:acrNomes, isMeia:false});
  }
  closeModal('modal-item');
  atualizarBarraCarrinho();
  if(typeof ppAposAdicionar==='function') ppAposAdicionar();
}

// ---- MODAL HELPERS ----
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

// ---- CARRINHO ----
// 3+ combos (pizza, broto, esfihas) = entrega grátis. Pedidos vindos do site (sem marca) contam pelo nome.
function combosNoCaixa(){
  return cart.reduce((t,i)=>t+((i.combos!=null?i.combos:(/combo|2 por|2 broto|esfiha/i.test(i.name||'')?1:0))*i.qty),0);
}
// pizzas no pedido: pizza/meia = 1; combo de pizza ou broto = 2 (esfihas e bebidas não contam)
function pizzasNoCaixa(){
  return cart.reduce((t,i)=>{
    const q=i.qty||1;
    if(/^esfihas/i.test(i.name||'')) return t;
    if(i.isMeia) return t+q;
    if(i.combos!=null&&i.combos>0) return t+2*q;
    const m=i.id!=null?DEFAULT_MENU.find(x=>x.id===i.id):null;
    return t+((m&&(m.cat==='p'||m.cat==='s'))?q:0);
  },0);
}
// entrega grátis: 3+ pizzas OU 3+ combos (mesma regra da loja)
function caixaEntregaGratis(){
  return !window._taxaManual&&(combosNoCaixa()>=COMBOS_ENTREGA_GRATIS||pizzasNoCaixa()>=PIZZAS_ENTREGA_GRATIS);
}
// assinatura do carrinho: o "valor combinado" no WhatsApp só vale enquanto os itens forem os mesmos
function _sigCarrinho(){ return cart.map(c=>(c._chave||c.id)+'x'+c.qty).join('|'); }
function valorCombinadoAtivo(){
  if(!(window._totalCombinado>0)) return 0;
  if(window._combinadoSig!==_sigCarrinho()){ window._totalCombinado=0; return 0; } // mexeu nos itens: volta ao cálculo normal
  return window._totalCombinado;
}
function totalCarrinho(){
  if(!cart.length) return 0; // carrinho vazio nunca mostra taxa de entrega
  const combinado=valorCombinadoAtivo(); if(combinado>0) return combinado;
  const itens=cart.reduce((s,i)=>s+i.unitPrice*i.qty,0);
  const tipo=document.getElementById('f-tipo')?.value;
  const gratis=caixaEntregaGratis();
  const taxa=(tipo==='entrega'&&!gratis)?(Number(document.getElementById('f-taxa-entrega')?.value)||0):0;
  return itens+taxa;
}
function qtdCarrinho(){ return cart.reduce((s,i)=>s+i.qty,0); }

function atualizarBarraCarrinho(){
  const vazio=cart.length===0;
  if(vazio){ window._taxaManual=false; window._totalCombinado=0; window._origemConversor=false; }
  document.getElementById('cart-count').textContent=vazio?'Caixa vazio':qtdCarrinho()+(qtdCarrinho()===1?' item':' itens');
  document.getElementById('cart-total').textContent=fmt(totalCarrinho());
  document.getElementById('btn-abrir-carrinho').disabled=vazio;
  if(document.getElementById('modal-cart').classList.contains('open')) renderCartItems();
}
function cancelarVendaAtual(){
  if(cart.length===0) return;
  if(!confirm('Cancelar a venda em andamento e limpar o caixa?')) return;
  cart=[];
  atualizarBarraCarrinho();
}

function openCartModal(){
  if(cart.length===0) return;
  renderCartItems();
  carregarMotoboys();
  carregarTaxaEntregaPadrao();
  resetPagamento();
  openModal('modal-cart');
}
// ── BORDA direto no carrinho: um toque em cada pizza (avulsa, meia a meia, broto e combos — no combo, uma por pizza) ──
function ehPizzaCx(i){
  if(!i||String(i._chave||'').startsWith('esf|')) return false;
  if(i.combos||i.isMeia) return true;
  const m=(typeof DEFAULT_MENU!=='undefined'?DEFAULT_MENU:[]).find(x=>x.id===i.id);
  return !!(m&&itemAceitaOpcoes(m.cat));
}
function _precoBordaCx(nome){ const b=BORDAS_DEFAULT.find(x=>x.name===nome); return b&&b.name!=='Sem Borda Recheada'?Number(b.price)||0:0; }
function _bordasDoItem(i){ return i.bordas||(i.combos?[null,null]:[bordaReal(i.borda)||null]); }
function seletorBordaCx(i,idx){
  if(!ehPizzaCx(i)) return '';
  const bs=_bordasDoItem(i);
  const sel=(k)=>`<select onchange="setBordaCx(${idx},${k},this.value)" style="flex:1;min-width:0;padding:6px 8px;border-radius:8px;border:1px solid var(--card-bd,#ddd);background:var(--soft,#F9FAFB);color:var(--tx);font-size:.86rem;font-weight:600;">`+
    BORDAS_DEFAULT.map(b=>`<option value="${b.name}" ${((bs[k]||'Sem Borda Recheada')===b.name)?'selected':''}>${b.name==='Sem Borda Recheada'?'Sem borda':b.name+' +'+fmt(b.price)}</option>`).join('')+'</select>';
  return `<div style="display:flex;align-items:center;gap:6px;margin:6px 0 2px;font-size:.8rem;font-weight:700;">🥖 ${i.combos?'<span>1ª</span>'+sel(0)+'<span>2ª</span>'+sel(1):'Borda '+sel(0)}</div>`;
}
function setBordaCx(idx,k,nome){
  const i=cart[idx]; if(!i) return;
  const bs=_bordasDoItem(i).slice();
  const antes=bs.reduce((t,b)=>t+_precoBordaCx(b),0);
  bs[k]=nome==='Sem Borda Recheada'?null:nome;
  const depois=bs.reduce((t,b)=>t+_precoBordaCx(b),0);
  i.bordas=bs;
  i.unitPrice=Math.round((Number(i.unitPrice)-antes+depois)*100)/100;
  if(i.combos) i.borda=(bs[0]&&bs[0]===bs[1])?bs[0]+' (nas 2)':(bs[0]||bs[1]?[bs[0]?'1ª '+bs[0]:null,bs[1]?'2ª '+bs[1]:null].filter(Boolean).join(' / '):null);
  else i.borda=bs[0];
  i._chave=String(i._chave||'').replace(/\|b:.*$/,'')+'|b:'+bs.join(',');
  renderCartItems(); atualizarBarraCarrinho();
}
function renderCartItems(){
  const box=document.getElementById('cart-items');
  box.innerHTML=cart.map((i,idx)=>`
    <div class="cart-item" style="${i.precisaRevisao?'background:rgba(231,29,54,.08);border-radius:10px;padding:8px;border-bottom:none;':''}">
      <div class="cart-item-info">
        <div style="${i.precisaRevisao?'color:var(--se);font-weight:700;':''}">${i.name}</div>
        ${seletorBordaCx(i,idx)}
        <div class="cart-item-sub">${[bordaReal(i.borda)?('Borda: '+i.borda):null, i.addedIng&&i.addedIng.length?('+ '+i.addedIng.join(', ')):null, i.removedIng&&i.removedIng.length?('Sem: '+i.removedIng.join(', ')):null, i.obs?('Obs: '+i.obs):null].filter(Boolean).join(' · ')||''}</div>
        <div class="qty-ctrl">
          <div class="qty-btn" onclick="alterarQtd(${idx},-1)">−</div>
          <div class="qty-val">${i.qty}</div>
          <div class="qty-btn" onclick="alterarQtd(${idx},1)">+</div>
        </div>
      </div>
      <div class="cart-item-price">${fmt(i.unitPrice*i.qty)}</div>
    </div>`).join('');
  const subtotal=cart.reduce((s,i)=>s+i.unitPrice*i.qty,0);
  const total=totalCarrinho();
  const taxa=total-subtotal;
  document.getElementById('tot-sub').textContent=fmt(subtotal);
  document.getElementById('totais-row-taxa').style.display=taxa>0?'flex':'none';
  const aviso=document.getElementById('aviso-entrega-gratis');
  if(aviso){
    const np=pizzasNoCaixa(), nc=combosNoCaixa(), ent=document.getElementById('f-tipo')?.value==='entrega';
    if(ent&&caixaEntregaGratis()){ aviso.innerHTML=EG_ICONES.moto+'<span>Entrega grátis: '+(np>=PIZZAS_ENTREGA_GRATIS?np+' pizzas':nc+' combos')+' no pedido</span>'; aviso.style.display='flex'; }
    else if(ent&&!window._taxaManual&&np>0){ aviso.innerHTML=EG_ICONES.presente+'<span>Faltam '+Math.max(1,PIZZAS_ENTREGA_GRATIS-np)+' pizza(s) para a entrega ser grátis</span>'; aviso.style.display='flex'; }
    else aviso.style.display='none';
  }
  document.getElementById('tot-taxa').textContent=fmt(taxa);
  document.getElementById('tot-final').textContent=fmt(total);
  calcularTroco();
}
function alterarQtd(idx,delta){
  cart[idx].qty+=delta;
  if(cart[idx].qty<=0) cart.splice(idx,1);
  renderCartItems();
  atualizarBarraCarrinho();
  if(cart.length===0) closeModal('modal-cart');
}

// ---- TIPO DE VENDA / ENTREGADOR ----
let taxaEntregaPadrao=8;
async function carregarTaxaEntregaPadrao(){
  if(!FS) return;
  try{
    const doc=await FS.collection('config').doc('loja').get();
    if(doc.exists && doc.data().taxaEntrega!==undefined) taxaEntregaPadrao=Number(doc.data().taxaEntrega)||0;
  }catch(e){ console.warn('Não foi possível carregar a taxa de entrega padrão.',e); }
}
async function salvarTaxaEntregaPadrao(){
  const valor=Number(document.getElementById('f-taxa-entrega').value)||0;
  taxaEntregaPadrao=valor;
  atualizarBarraCarrinho();
  if(!FS) return;
  try{ await FS.collection('config').doc('loja').set({taxaEntrega:valor},{merge:true}); }
  catch(e){ console.warn('Não foi possível salvar a taxa de entrega padrão.',e); }
}
function alternarCampoEntregador(){
  const tipo=document.getElementById('f-tipo').value;
  document.getElementById('campo-entregador').style.display=tipo==='entrega'?'block':'none';
  document.getElementById('campo-endereco').style.display=tipo==='entrega'?'block':'none';
  document.getElementById('campo-taxa').style.display=tipo==='entrega'?'block':'none';
  if(tipo==='entrega') document.getElementById('f-taxa-entrega').value=taxaEntregaPadrao;
  atualizarBarraCarrinho();
}
async function carregarMotoboys(){
  const sel=document.getElementById('f-entregador');
  if(!FS){ return; }
  try{
    const snap=await FS.collection('motoboys').get();
    motoboys=snap.docs.map(d=>({id:d.id,...d.data()}));
    sel.innerHTML='<option value="">Não definir agora</option>'+motoboys.map(m=>`<option value="${m.nome}">${m.nome}</option>`).join('');
  }catch(e){ console.warn('Não foi possível carregar entregadores.',e); }
}

// ---- PAGAMENTO ----
let pagamentoMisto=false;
let linhasMisto=[]; // [{metodo,valor}]

function resetPagamento(){
  pagamentoSelecionado='Dinheiro';
  pagamentoMisto=false;
  linhasMisto=[];
  document.querySelectorAll('.pay-chip[data-m]').forEach(el=>el.classList.toggle('active',el.dataset.m===pagamentoSelecionado));
  document.getElementById('f-valor-recebido').value='';
  document.getElementById('troco-resultado').textContent='';
  document.getElementById('pay-methods').style.opacity='1';
  document.getElementById('pay-methods').style.pointerEvents='auto';
  document.getElementById('misto-box').style.display='none';
  atualizarVisibilidadeTroco();
}
function selecionarPagamento(m){
  if(pagamentoMisto) return; // não deixa escolher método único enquanto o misto estiver ativo
  pagamentoSelecionado=m;
  document.querySelectorAll('.pay-chip[data-m]').forEach(el=>el.classList.toggle('active',el.dataset.m===m));
  atualizarVisibilidadeTroco();
}
function atualizarVisibilidadeTroco(){
  const campo=document.getElementById('campo-troco');
  campo.style.display = (pagamentoSelecionado==='Dinheiro' && !pagamentoMisto) ? 'block' : 'none';
  if(pagamentoSelecionado==='Dinheiro' && !pagamentoMisto) calcularTroco();
}
function calcularTroco(){
  const recebido=parseFloat(document.getElementById('f-valor-recebido').value);
  const total=totalCarrinho();
  const resultado=document.getElementById('troco-resultado');
  if(isNaN(recebido)||recebido<=0){ resultado.textContent=''; return; }
  const troco=recebido-total;
  if(troco<0){
    resultado.innerHTML='⚠️ <span style="color:var(--se);">Faltam '+fmt(Math.abs(troco))+'</span>';
  }else{
    resultado.innerHTML='💵 Troco: '+fmt(troco);
  }
}

// ---- PAGAMENTO MISTO / FRACIONADO ----
function alternarPagamentoMisto(){
  pagamentoMisto=!pagamentoMisto;
  document.getElementById('misto-box').style.display=pagamentoMisto?'block':'none';
  document.getElementById('pay-methods').style.opacity=pagamentoMisto?'.4':'1';
  document.getElementById('pay-methods').style.pointerEvents=pagamentoMisto?'none':'auto';
  atualizarVisibilidadeTroco();
  if(pagamentoMisto && linhasMisto.length===0){
    linhasMisto=[{metodo:'Dinheiro',valor:totalCarrinho()},{metodo:'Cartão de Crédito',valor:0}];
    renderLinhasMisto();
  }
}
function adicionarLinhaMisto(){
  linhasMisto.push({metodo:'Dinheiro',valor:0});
  renderLinhasMisto();
}
function removerLinhaMisto(idx){
  linhasMisto.splice(idx,1);
  renderLinhasMisto();
}
function renderLinhasMisto(){
  const box=document.getElementById('misto-linhas');
  box.innerHTML=linhasMisto.map((l,idx)=>`
    <div class="misto-linha">
      <select onchange="linhasMisto[${idx}].metodo=this.value">
        ${['Dinheiro','Pix','Cartão de Crédito','Cartão de Débito'].map(m=>`<option value="${m}" ${l.metodo===m?'selected':''}>${m}</option>`).join('')}
      </select>
      <input type="number" step="0.01" value="${l.valor||''}" placeholder="0,00" oninput="linhasMisto[${idx}].valor=parseFloat(this.value)||0;checarSomaMisto()">
      ${linhasMisto.length>1?`<span class="rm" onclick="removerLinhaMisto(${idx})">✕</span>`:''}
    </div>`).join('');
  checarSomaMisto();
}
function checarSomaMisto(){
  const soma=linhasMisto.reduce((s,l)=>s+(l.valor||0),0);
  const total=totalCarrinho();
  const bate=Math.abs(soma-total)<0.01;
  document.getElementById('misto-aviso').style.display=bate?'none':'block';
  return bate;
}

// ---- FINALIZAR VENDA + IMPRIMIR ----
async function finalizarVenda(){
  if(cart.length===0){ alert('O caixa está vazio.'); return; }
  if(cart.some(i=>i.precisaRevisao)){
    alert('⚠️ Ainda há item(ns) marcados como "CONFERIR" no carrinho. Remova-os e adicione o item correto pela busca antes de finalizar.');
    return;
  }
  if(pagamentoMisto && !checarSomaMisto()){
    alert('⚠️ A soma das formas de pagamento precisa bater com o total da venda.');
    return;
  }
  const nomeDigitado=document.getElementById('f-nome').value.trim();
  const tel=document.getElementById('f-tel').value.trim()||null;
  const balcao=!nomeDigitado&&!tel; // venda de balcão anônima: fora de ranking/lista de clientes
  const doConversor=!!window._origemConversor; // veio do Conversor (conversa de WhatsApp): o nome está no contato, não no texto
  const nome=nomeDigitado||(doConversor?'Cliente WhatsApp':(tel?'Cliente':'Cliente Balcão'));
  const tipo=document.getElementById('f-tipo').value;
  const entregador=document.getElementById('f-entregador')?.value||null;
  const total=totalCarrinho();
  const valorRecebido=(pagamentoSelecionado==='Dinheiro'&&!pagamentoMisto)?parseFloat(document.getElementById('f-valor-recebido').value):null;
  const troco=(valorRecebido&&valorRecebido>total)?Math.round((valorRecebido-total)*100)/100:null;
  const paymentLabel=pagamentoMisto
    ? linhasMisto.filter(l=>l.valor>0).map(l=>l.metodo+' ('+fmt(l.valor)+')').join(' + ')
    : pagamentoSelecionado;

// obterProximoNumeroSequencial(FS) agora vem de shared/utils.js

  const pedido={
    client_name:nome, client_phone:tel, balcao:balcao,
    address: tipo==='entrega' ? (document.getElementById('f-endereco-colado').value.trim()||'A confirmar por telefone') : null,
    payment:paymentLabel,
    payment_breakdown: pagamentoMisto ? linhasMisto.filter(l=>l.valor>0) : null,
    valor_recebido: valorRecebido||null,
    troco: troco,
    delivery_type: tipo,
    entregador: tipo==='entrega' ? (entregador||null) : null,
    taxa_entrega: (tipo==='entrega'&&!caixaEntregaGratis()) ? (Number(document.getElementById('f-taxa-entrega')?.value)||0) : 0,
    total: Math.round(total*100)/100,
    items_json: cart.map(i=>({id:i.id,name:i.name,price:i.unitPrice,qty:i.qty,borda:bordaReal(i.borda),removed:i.removedIng||[],added:i.addedIng||[],obs:i.obs||null,isMeia:!!i.isMeia})),
    status: 'finalizado',
    valor_combinado: valorCombinadoAtivo()>0 ? true : null,
    origem: pedidoEmEdicaoId ? 'loja' : (doConversor ? 'conversor' : 'caixa'), // pedido de notificação mantém a origem real (loja/conversor)
    whatsapp_sent:false,
    created_at:new Date().toISOString()
  };

  // número sequencial do dia — se já existir (pedido editado que já tinha), mantém; senão gera um novo
  if(pedidoEmEdicaoId){
    try{
      const docAtual=await FS.collection('orders').doc(pedidoEmEdicaoId).get();
      pedido.numero_sequencial = docAtual.exists && docAtual.data().numero_sequencial ? docAtual.data().numero_sequencial : await obterProximoNumeroSequencial(FS);
    }catch(e){ pedido.numero_sequencial = await obterProximoNumeroSequencial(FS); }
  }else{
    pedido.numero_sequencial = await obterProximoNumeroSequencial(FS);
  }

  if(!FS){ alert('Sem conexão com o banco de dados. Verifique a internet.'); return; }
  const gravar = async () => {
    if(pedidoEmEdicaoId){
      const dadosUpdate={...pedido};
      delete dadosUpdate.origem; // preserva a origem original do pedido
      delete dadosUpdate.created_at; // preserva a data original do pedido
      await FS.collection('orders').doc(pedidoEmEdicaoId).update(dadosUpdate);
    }else{
      await FS.collection('orders').add(pedido);
    }
    setTimeout(atualizarTotaisHoje,800);
  };
  try{
    try{
      await gravar();
    }catch(erroPrimeiraTentativa){
      console.warn('Falha ao gravar, tentando de novo em 1s...',erroPrimeiraTentativa);
      await new Promise(r=>setTimeout(r,1000));
      await gravar();
    }
    pedido.created_at=new Date().toISOString();
    pedidoEmEdicaoId=null;
    try{ await imprimirBluetooth(formatarCupom(pedido)); }catch(e){ alert('Venda salva, mas houve erro ao imprimir: '+e.message); }
    cart=[];
    atualizarBarraCarrinho();
    closeModal('modal-cart');
    document.getElementById('f-nome').value='';
    document.getElementById('f-tel').value='';
    document.getElementById('f-endereco-colado').value='';
    mostrarToast();
  }catch(e){
    console.error('Erro ao gravar venda:',e);
    alert('Não foi possível gravar a venda mesmo após tentar de novo. O carrinho continua aqui, tente "Ver e finalizar" mais uma vez.');
  }
}
function mostrarToast(){
  const t=document.getElementById('toast');
  t.style.display='block';
  setTimeout(()=>t.style.display='none',2000);
}

// ---- IMPRESSÃO (recibo grande e claro para a cozinha) ----
const LOGO_PIZZARIA_SRC="../assets/logo-recibo.png"; // arquivo pequeno (antes era uma imagem de 150KB dentro do JS — pesava pra abrir)
function imprimirRecibo(p){
  const linhasItens=p.items_json.map(i=>{
    const detalhes=[];
    if(bordaReal(i.borda)) detalhes.push('Borda: '+i.borda);
    if(i.added&&i.added.length) detalhes.push('Com: '+i.added.join(', '));
    if(i.removed&&i.removed.length) detalhes.push('SEM: '+i.removed.join(', ').toUpperCase());
    if(i.obs) detalhes.push('Obs: '+i.obs);
    return `
      <div class="rec-item">
        <div class="rec-item-topo"><span>${i.qty}x ${i.name}</span><span>${fmt(i.price*i.qty)}</span></div>
        ${detalhes.length?`<div class="rec-item-det">${detalhes.join(' · ')}</div>`:''}
      </div>`;
  }).join('');
  const html=`
    <div class="rec-header">
      <img src="${LOGO_PIZZARIA_SRC}" class="rec-logo">
      <div class="rec-nome-loja">PIZZA EM DOBRO</div>
    </div>
    <div class="rec-linha"></div>
    <div class="rec-campo"><b>Cliente:</b> ${p.client_name}</div>
    ${p.client_phone?`<div class="rec-campo"><b>Telefone:</b> ${p.client_phone}</div>`:''}
    <div class="rec-campo"><b>Tipo:</b> ${(p.delivery_type||'').toUpperCase()}</div>
    ${p.address&&p.delivery_type==='entrega'?`<div class="rec-campo"><b>Endereço:</b> ${p.address}</div>`:''}
    ${p.entregador?`<div class="rec-campo"><b>Entregador:</b> ${p.entregador}</div>`:''}
    <div class="rec-campo"><b>Pagamento:</b> ${p.payment}</div>
    ${p.payment_breakdown&&p.payment_breakdown.length?`<div class="rec-campo" style="padding-left:10px;font-size:14px;">${p.payment_breakdown.map(l=>l.metodo+': '+fmt(l.valor)).join(' · ')}</div>`:''}
    ${p.valor_recebido?`<div class="rec-campo"><b>Recebido:</b> ${fmt(p.valor_recebido)}</div>`:''}
    ${p.troco?`<div class="rec-campo"><b>Troco:</b> ${fmt(p.troco)}</div>`:''}
    <div class="rec-linha"></div>
    <div class="rec-itens">${linhasItens}</div>
    <div class="rec-linha"></div>
    <div class="rec-total">TOTAL: ${fmt(p.total)}</div>
    <div class="rec-linha"></div>
    <div class="rec-data">${new Date(dataStr(p.created_at)).toLocaleString('pt-BR')}</div>
  `;
  const box=document.getElementById('recibo-print');
  box.innerHTML=html;
  setTimeout(()=>{ try{ window.print(); }catch(e){ console.warn('Impressão não disponível neste dispositivo.',e); } },300);
}

// ---- VENDAS DE HOJE (com status, cancelar e entregador) ----
function _hojeISO(){ return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()); }
let pedidosHojeCache=[];
// Faixa "Hoje" no topo do Caixa: vendas, total, ticket médio e dinheiro na gaveta (sem cancelados)
function pintarResumoRail(pedidos){
  const validos=(pedidos||[]).filter(p=>p.status!=='cancelado');
  const total=validos.reduce((t,p)=>t+Number(p.total||0),0);
  const dinheiro=validos.reduce((t,p)=>t+(categoriaPagamento(p.payment)==='Dinheiro'?Number(p.total||0):0),0);
  const set=(id,v)=>{const e=document.getElementById(id); if(e) e.textContent=v;};
  set('rh-vendas',validos.length); set('rh-total',fmt(total)); set('rh-ticket',fmt(validos.length?total/validos.length:0));
  const box=document.getElementById('rh-gaveta-box');
  if(box){ const aberta=typeof sessaoCaixaAtual!=='undefined'&&sessaoCaixaAtual; box.style.display=aberta?'':'none'; if(aberta) set('rh-gaveta',fmt(Number(sessaoCaixaAtual.valor_abertura||0)+dinheiro)); }
}
async function atualizarTotaisHoje(){
  if(!FS) return;
  try{
    const snap=await FS.collection('orders').where('created_at','>=',limiteDiaBrasilia(_hojeISO())).orderBy('created_at','desc').limit(300).get();
    pintarResumoRail(snap.docs.map(d=>d.data()));
  }catch(e){ console.warn('Resumo do dia indisponível:',e); }
}
setTimeout(atualizarTotaisHoje,2500);
setInterval(()=>{ if(!document.hidden) atualizarTotaisHoje(); },150000);
const NOME_STATUS={novo:'NOVO',confirmado:'CONFIRMADO',pronto:'PRONTO',finalizado:'FINALIZADO',cancelado:'CANCELADO'};
async function carregarVendasHoje(){
  const box=document.getElementById('orders-list');
  if(!FS){ box.innerHTML='<div class="empty">⚠️ Sem conexão.</div>'; return; }
  box.innerHTML='<div class="sk-wrap" aria-hidden="true"><i class="sk"></i><i class="sk"></i><i class="sk"></i></div>';
  try{
    const hoje=_hojeISO();
    const snap=await FS.collection('orders')
      .where('created_at','>=',limiteDiaBrasilia(hoje))
      .orderBy('created_at','desc')
      .limit(200)
      .get();
    const pedidos=snap.docs.map(d=>({id:d.id,...d.data()}));
    pedidosHojeCache=pedidos;
    pintarResumoRail(pedidos);
    pedidos.sort((a,b)=>(b.numero_sequencial||0)-(a.numero_sequencial||0)); // mais recente primeiro
    if(pedidos.length===0){ box.innerHTML='<div class="empty">🧾 Nenhuma venda hoje ainda.</div>'; return; }
    // resumo do dia (cancelados ficam fora da conta)
    const validos=pedidos.filter(p=>p.status!=='cancelado');
    const porForma={}; let total=0;
    validos.forEach(p=>{ const c=categoriaPagamento(p.payment); porForma[c]=(porForma[c]||0)+Number(p.total||0); total+=Number(p.total||0); });
    const dinheiro=porForma['Dinheiro']||0;
    const abertura=sessaoCaixaAtual?Number(sessaoCaixaAtual.valor_abertura||0):0;
    const resumo=`<div class="resumo-dia">
      <div class="rd-topo"><div><span>Vendas hoje</span><b>${validos.length}</b></div><div><span>Total</span><b>${fmt(total)}</b></div><div><span>Ticket médio</span><b>${fmt(validos.length?total/validos.length:0)}</b></div></div>
      <div class="rd-formas">${Object.entries(porForma).map(([k,v])=>`<span>${k}: <b>${fmt(v)}</b></span>`).join('')||'<span>—</span>'}</div>
      ${sessaoCaixaAtual?`<div class="rd-gaveta">💵 Na gaveta (troco inicial + dinheiro): <b>${fmt(abertura+dinheiro)}</b></div>`:''}
    </div>`;
    box.innerHTML=resumo+pedidos.map(p=>{
      const cancelado=p.status==='cancelado';
      const st=NOME_STATUS[p.status]||'';
      return `
      <div class="order-card ${cancelado?'cancelado':''}">
        <div class="order-top">
          <span style="font-family:var(--font-display);font-size:1.1rem;color:var(--pr);">#${p.numero_sequencial||'—'}</span>
          <span><span class="badge">${p.origem==='caixa'?'CAIXA':p.origem==='conversor'?'CONVERSOR':p.origem==='whatsapp_bot'?'BOT':'LOJA'}</span>${st&&p.status!=='finalizado'?` <span class="badge ${cancelado?'cinza':''}">${st}</span>`:''}</span>
        </div>
        <div class="order-top">
          <span onclick="abrirPerfilClienteCaixa('${(p.client_phone||'').replace(/'/g,'')}','${(p.client_name||'Cliente').replace(/'/g,"\\'")}')" style="text-decoration:underline dotted;cursor:pointer;">👤 ${p.client_name||'Cliente'}</span>
        </div>
        <div class="order-meta">${(p.delivery_type||'—')}${p.entregador?' · 🛵 '+p.entregador:''} · ${(p.payment||'—')} · ${new Date(dataStr(p.created_at)).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})}</div>
        <div class="order-itens">${(Array.isArray(p.items_json)?p.items_json:[]).map(i=>(i.qty>1?i.qty+'× ':'')+i.name).join(' · ')}</div>
        <div class="order-total">${fmt(p.total)}</div>
        <div class="order-actions">
          <button class="btn-mini" onclick="editarPedidoExistente('${p.id}')">✏️ Editar</button>
          <button class="btn-mini" onclick="reimprimir('${p.id}')">🖨️ Reimprimir</button>
          ${cancelado?'':`<button class="btn-mini danger" onclick="cancelarPedidoExistente('${p.id}')">✕ Cancelar</button>`}
        </div>
      </div>`;}).join('');
  }catch(e){
    console.error('Erro ao carregar vendas de hoje:',e);
    box.innerHTML='<div class="empty">⚠️ Não foi possível carregar as vendas. Confira a internet e toque em "Vendas de Hoje" de novo.</div>';
  }
}
function toggleMinCart(){
  document.getElementById('modal-cart').classList.toggle('minimizado');
}

function editarPedidoExistente(id){
  const p=(pedidosHojeCache||[]).find(x=>x.id===id);
  if(!p){ alert('Pedido não encontrado.'); return; }
  let itens=p.items_json||[];
  if(typeof itens==='string'){ try{itens=JSON.parse(itens);}catch(e){itens=[];} }
  cart=[];
  (Array.isArray(itens)?itens:[]).forEach(i=>{
    const borda=bordaReal(i.borda);
    const removedIng=i.removed||[];
    const addedIng=i.added||[];
    const qty=i.qty||1;
    const chave='edit-'+(i.id||i.name)+'|'+borda+'|'+removedIng.slice().sort().join(',')+'|'+addedIng.slice().sort().join(',');
    const existente=cart.find(c=>c._chave===chave);
    if(existente){
      existente.qty+=qty;
    }else{
      cart.push({_chave:chave, id:i.id||null, name:i.name, unitPrice:Number(i.price)||0, qty, borda, removedIng, addedIng, isMeia:!!i.isMeia});
    }
  });
  document.getElementById('f-nome').value=p.client_name||'';
  document.getElementById('f-tel').value=p.client_phone||'';
  document.getElementById('f-tipo').value=p.delivery_type||'retirada';
  document.getElementById('f-endereco-colado').value=p.address||'';
  alternarCampoEntregador();
  pedidoEmEdicaoId=id;
  atualizarBarraCarrinho();
  openCartModal();
}
async function cancelarPedidoExistente(id){
  if(!confirm('Cancelar este pedido?')) return;
  if(!FS) return;
  try{ await FS.collection('orders').doc(id).update({status:'cancelado'}); avisoRapido('Pedido cancelado'); carregarVendasHoje(); }
  catch(e){ alert('Não foi possível cancelar o pedido.'); }
}
async function reimprimir(id){
  if(!FS) return;
  try{
    const doc=await FS.collection('orders').doc(id).get();
    if(!doc.exists){ alert('Pedido não encontrado.'); return; }
    const pedido={id:doc.id,...doc.data()};
    if(impressoraPronta()){
      await imprimirBluetooth(formatarCupom(pedido));
      avisoRapido('🖨️ Enviado pra impressora');
    }else if(typeof EH_CELULAR!=='undefined'&&EH_CELULAR){
      // no celular a tela de impressão do sistema não acha a térmica — pede pra conectar pelo cabo
      alert('🖨️ Impressora não conectada.\n\nCom o cabo USB ligado no celular, toque em "🔌 USB" no topo do Caixa e escolha a impressora. Depois disso ela reconecta sozinha.');
    }else{
      // sem impressora térmica conectada: abre a impressão do navegador (qualquer impressora do notebook)
      if(typeof pedido.items_json==='string'){ try{ pedido.items_json=JSON.parse(pedido.items_json); }catch(e){ pedido.items_json=[]; } }
      pedido.items_json=Array.isArray(pedido.items_json)?pedido.items_json:[];
      imprimirRecibo(pedido);
    }
  }catch(e){ alert('Não foi possível reimprimir: '+e.message+'\n\nSe a impressora térmica estiver desligada, tente reconectar no topo (BT/USB).'); }
}
function avisoRapido(txt){
  const t=document.getElementById('toast'); if(!t) return;
  const orig=t.textContent; t.textContent=txt; t.style.display='block';
  setTimeout(()=>{ t.style.display='none'; t.textContent=orig; },2200);
}


// busca: espera 150ms depois da última tecla (em notebook fraco, redesenhar a cada letra deixava a digitação lenta)
let _tBusca=null;
function buscarComAtraso(){ clearTimeout(_tBusca); _tBusca=setTimeout(renderProdutos,150); }
// aviso de internet (faixa vermelha no topo enquanto estiver sem rede)
(function(){
  function atualizar(){ const b=document.getElementById('aviso-offline'); if(b) b.style.display=navigator.onLine?'none':'block'; }
  window.addEventListener('online',atualizar); window.addEventListener('offline',atualizar); atualizar();
})();
