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
  grid.innerHTML=itens.map(i=>`
    <div class="prod-card ${meiaPrimeiraMetade&&meiaPrimeiraMetade.id===i.id?'meia-sel':''}" onclick="clicarProduto(${i.id})">
      <div class="prod-nome">${i.n}</div>
      <div class="prod-preco">${fmt(i.p)}</div>
    </div>`).join('');
}
function renderCombosCaixa(grid){
  if(typeof COMBOS_DEFAULT==='undefined'){ grid.innerHTML='<div class="empty">Combos indisponíveis.</div>'; return; }
  const saboresBroto=(typeof DEFAULT_MENU!=='undefined'?DEFAULT_MENU:[]).filter(i=>i.cat==='p'||i.cat==='s').map(i=>i.n).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const optsB=saboresBroto.map(s=>`<option value="${s}">${s}</option>`).join('');
  const cardBroto=`<div class="prod-card" style="cursor:default;text-align:left;padding:10px;">
      <div class="prod-nome">🍕🍕 ${COMBO_BROTO.titulo} <small>(qualquer sabor, pode repetir)</small></div>
      <select id="cx-broto50-s1" class="m-input" style="width:100%;margin:6px 0 4px;">${optsB}</select>
      <select id="cx-broto50-s2" class="m-input" style="width:100%;margin:0 0 6px;">${optsB}</select>
      <button class="prod-card" style="width:100%;background:var(--pr);color:#000;font-weight:800;border:none;cursor:pointer;" onclick="adicionarBrotoAoCarrinhoCaixa()">+ Adicionar</button>
    </div>`;
  grid.innerHTML=cardBroto+COMBOS_DEFAULT.map(c=>{
    const opts=c.sabores.map(s=>`<option value="${s}">${s}</option>`).join('');
    return `<div class="prod-card" style="cursor:default;text-align:left;padding:10px;">
      <div class="prod-nome">🍕🍕 ${c.titulo}</div>
      <select id="cx-${c.id}-s1" class="m-input" style="width:100%;margin:6px 0 4px;">${opts}</select>
      <select id="cx-${c.id}-s2" class="m-input" style="width:100%;margin:0 0 6px;">${opts}</select>
      <button class="prod-card" style="width:100%;background:var(--pr);color:#000;font-weight:800;border:none;cursor:pointer;" onclick="adicionarComboAoCarrinhoCaixa('${c.id}')">+ Adicionar</button>
    </div>`;
  }).join('');
}
// ── FUNÇÕES ÚNICAS (botões e Colar Pedido): combo broto e esfihas ──
function adicionarBrotoAoCarrinho(s1, s2, qtd){
  const novo={ _chave:'combo|broto50|'+[s1,s2].slice().sort().join('+'), id:null, name:`${COMBO_BROTO.titulo} — ${s1} + ${s2}`,
    unitPrice:COMBO_BROTO.preco, qty:qtd||1, borda:null, removedIng:[], addedIng:[], isMeia:false };
  const ex=cart.find(c=>c._chave===novo._chave);
  if(ex) ex.qty+=novo.qty; else cart.push(novo);
}
function adicionarEsfihasAoCarrinho(contagens, qtd){
  const n=ESFIHA_SABORES.reduce((t,sab)=>t+(contagens[sab]||0),0); if(!n)return;
  const nome=nomeEsfihas(contagens);
  const novo={ _chave:'esf|'+nome, id:null, name:nome, unitPrice:precoEsfihas(n), qty:qtd||1, borda:null, removedIng:[], addedIng:[], isMeia:false };
  const ex=cart.find(c=>c._chave===novo._chave);
  if(ex) ex.qty+=novo.qty; else cart.push(novo);
}
function adicionarBrotoAoCarrinhoCaixa(){
  const s1=document.getElementById('cx-broto50-s1')?.value, s2=document.getElementById('cx-broto50-s2')?.value;
  if(!s1||!s2)return;
  adicionarBrotoAoCarrinho(s1,s2,1);
  atualizarBarraCarrinho();
}
// ── ESFIHAS (R$ 5 cada; 10 = R$ 50, 20 = R$ 90, 30 = R$ 130) — mesma regra e mesmo preço do site
const _esfCx={};
function renderEsfihasCaixa(grid){
  grid.innerHTML=`<div class="prod-card" style="grid-column:1/-1;cursor:default;text-align:left;padding:10px;">
    <div class="prod-nome">🥟 Esfihas — R$ 5,00 cada <small>(10 = R$ 50 · 20 = R$ 90 · 30 = R$ 130)</small></div>`+
    ESFIHA_SABORES.map((s,i)=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;">
      <span style="font-weight:700;">${s}</span>
      <span><button class="prod-card" style="display:inline-block;width:38px;cursor:pointer;" onclick="esfCxMudar(${i},-1)">−</button>
      <b id="cx-esf-q-${i}" style="display:inline-block;min-width:28px;text-align:center;">${_esfCx[s]||0}</b>
      <button class="prod-card" style="display:inline-block;width:38px;cursor:pointer;" onclick="esfCxMudar(${i},1)">+</button></span></div>`).join('')+
    `<div id="cx-esf-resumo" style="margin:8px 0;font-weight:700;"></div>
    <button class="prod-card" style="width:100%;background:var(--pr);color:#000;font-weight:800;border:none;cursor:pointer;" onclick="adicionarEsfihasCaixa()">+ Adicionar esfihas</button></div>`;
  esfCxAtualizar();
}
function esfCxMudar(i,d){ const s=ESFIHA_SABORES[i]; _esfCx[s]=Math.max(0,Math.min(120,(_esfCx[s]||0)+d)); esfCxAtualizar(); }
function esfCxAtualizar(){
  ESFIHA_SABORES.forEach((s,i)=>{ const e=document.getElementById('cx-esf-q-'+i); if(e)e.textContent=_esfCx[s]||0; });
  const n=ESFIHA_SABORES.reduce((t,s)=>t+(_esfCx[s]||0),0), r=document.getElementById('cx-esf-resumo');
  if(r) r.textContent=n?`${n} esfiha(s) = ${fmt(precoEsfihas(n))}`:'Escolha as quantidades.';
}
function adicionarEsfihasCaixa(){
  adicionarEsfihasAoCarrinho(_esfCx,1);
  ESFIHA_SABORES.forEach(s=>_esfCx[s]=0); esfCxAtualizar();
  atualizarBarraCarrinho();
}
function adicionarComboAoCarrinhoCaixa(comboTierId){
  const combo=COMBOS_DEFAULT.find(c=>c.id===comboTierId);
  if(!combo)return;
  const s1=document.getElementById('cx-'+comboTierId+'-s1')?.value;
  const s2=document.getElementById('cx-'+comboTierId+'-s2')?.value;
  if(!s1||!s2)return;
  if(s1===s2){ alert('Escolha 2 sabores diferentes — o combo é uma pizza de cada.'); return; }
  adicionarComboAoCarrinho(combo, s1, s2, 1);
  atualizarBarraCarrinho();
}
// ── FUNÇÃO ÚNICA para montar item de combo — usada pelo botão manual E pelo Colar Pedido,
// mesma lógica de deduplicação/soma de quantidade do meia a meia (chave determinística, nunca Math.random()).
function criarItemCombo(combo, s1, s2, qtd){
  return {
    _chave:'combo|'+combo.id+'|'+[s1,s2].slice().sort().join('+'),
    id:null, name:`${combo.titulo} — ${s1} + ${s2}`, unitPrice:combo.preco, qty:qtd||1,
    borda:null, removedIng:[], addedIng:[], isMeia:false
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
function criarItemMeiaAMeia(metadeA, metadeB, bordaNome, removidos, qtd){
  const borda=BORDAS_DEFAULT.find(b=>b.name===bordaNome);
  const precoBorda=(borda&&borda.name!=='Sem Borda Recheada')?borda.price:0;
  const bordaFinal=(borda&&borda.name!=='Sem Borda Recheada')?borda.name:null;
  const unitPrice=Math.max(metadeA.p,metadeB.p)+precoBorda; // regra oficial: cobra o valor da metade mais cara + borda
  return {
    _chave:'meia|'+[metadeA.id,metadeB.id].sort().join('-')+'|'+bordaFinal+'|'+(removidos||[]).slice().sort().join(','),
    id:null, name:`Meio a Meio: ${metadeA.n} / ${metadeB.n}`, unitPrice, qty:qtd||1,
    borda:bordaFinal, removedIng:removidos||[], addedIng:[], isMeia:true
  };
}
function adicionarMeiaAMeiaAoCarrinho(metadeA, metadeB, bordaNome, removidos, qtd){
  const novo=criarItemMeiaAMeia(metadeA, metadeB, bordaNome, removidos, qtd);
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
}

// ---- MODAL HELPERS ----
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

// ---- CARRINHO ----
function totalCarrinho(){
  const itens=cart.reduce((s,i)=>s+i.unitPrice*i.qty,0);
  const tipo=document.getElementById('f-tipo')?.value;
  const taxa=tipo==='entrega'?(Number(document.getElementById('f-taxa-entrega')?.value)||0):0;
  return itens+taxa;
}
function qtdCarrinho(){ return cart.reduce((s,i)=>s+i.qty,0); }

function atualizarBarraCarrinho(){
  const vazio=cart.length===0;
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
function renderCartItems(){
  const box=document.getElementById('cart-items');
  box.innerHTML=cart.map((i,idx)=>`
    <div class="cart-item" style="${i.precisaRevisao?'background:rgba(231,29,54,.08);border-radius:10px;padding:8px;border-bottom:none;':''}">
      <div class="cart-item-info">
        <div style="${i.precisaRevisao?'color:var(--se);font-weight:700;':''}">${i.name}</div>
        <div class="cart-item-sub">${[i.borda?('Borda: '+i.borda):null, i.addedIng&&i.addedIng.length?('+ '+i.addedIng.join(', ')):null, i.removedIng&&i.removedIng.length?('Sem: '+i.removedIng.join(', ')):null, i.obs?('Obs: '+i.obs):null].filter(Boolean).join(' · ')||''}</div>
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
  const nome=nomeDigitado||(tel?'Cliente':'Cliente Balcão');
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
    taxa_entrega: tipo==='entrega' ? (Number(document.getElementById('f-taxa-entrega')?.value)||0) : 0,
    total: Math.round(total*100)/100,
    items_json: cart.map(i=>({id:i.id,name:i.name,price:i.unitPrice,qty:i.qty,borda:i.borda,removed:i.removedIng||[],added:i.addedIng||[],obs:i.obs||null,isMeia:!!i.isMeia})),
    status: 'finalizado',
    origem: pedidoEmEdicaoId ? 'loja' : 'caixa', // pedido de notificação mantém a origem real (loja/conversor)
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
    if(i.borda) detalhes.push('Borda: '+i.borda);
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
    const borda=i.borda||null;
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
