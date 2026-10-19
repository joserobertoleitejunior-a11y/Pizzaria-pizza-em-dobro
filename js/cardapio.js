// ══════════════════════════════════
//  HALF CANVAS
// ══════════════════════════════════
function drawHH(canvas,u1,u2){
  const W=canvas.width=640,H=canvas.height=300;
  const ctx=canvas.getContext('2d');
  const load=u=>new Promise((res,rej)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=rej;i.src=u;});
  Promise.all([load(u1),load(u2)]).then(([a,b])=>{
    ctx.save();ctx.beginPath();ctx.rect(0,0,W/2,H);ctx.clip();ctx.drawImage(a,0,0,W/2,H);ctx.restore();
    ctx.save();ctx.beginPath();ctx.rect(W/2,0,W/2,H);ctx.clip();ctx.drawImage(b,W/2,0,W/2,H);ctx.restore();
    ctx.strokeStyle='rgba(214,40,40,.85)';ctx.lineWidth=3;ctx.setLineDash([10,6]);
    ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(20,20,20,.6)';ctx.fillRect(0,H-26,W/2,26);ctx.fillRect(W/2,H-26,W/2,26);
    ctx.fillStyle='#FFFFFF';ctx.font='bold 11px "Work Sans",sans-serif';ctx.textAlign='center';
    ctx.fillText('½',W/4,H-8);ctx.fillText('½',3*W/4,H-8);
  }).catch(()=>{ctx.fillStyle='#F2F2F2';ctx.fillRect(0,0,W,H);});
}

// ══════════════════════════════════
//  RENDER MENU
// ══════════════════════════════════
// ══════════════════════════════════
//  COMBOS "2 POR X" — seleção real de sabores
// ══════════════════════════════════
const COMBO_CORES={combo65:'#D62828',combo75:'#E8541E',combo80:'#C2185B',combo85:'#7B1FA2',broto50:'#F5A300'};
// Escolha por TOQUE: o cliente toca nos sabores (nome inteiro à vista) em vez de abrir listas.
// _sel[id] = sabores escolhidos, na ordem em que tocou.
const _sel={};
function _comboCfg(id){
  if(id==='broto50') return {id, preco:COMBO_BROTO.preco, titulo:COMBO_BROTO.titulo, repete:true,
    sabores:(typeof menu!=='undefined'?menu:[]).filter(m=>m.cat==='p'||m.cat==='s').map(m=>m.n).sort((a,b)=>a.localeCompare(b,'pt-BR'))};
  const c=COMBOS_DEFAULT.find(x=>x.id===id); return c?{id, preco:c.preco, titulo:c.titulo, repete:false, sabores:c.sabores}:null;
}
function _cardCombo(cfg, rotulo){
  const cor=COMBO_CORES[cfg.id]||'var(--pr)';
  const reais=cfg.preco.toFixed(2).split('.');
  const rolagem=cfg.sabores.length>10?' combo-chips-rola':'';
  return `<div class="combo-card" id="combo-card-${cfg.id}" style="--combo-cor:${cor};">
    <div class="combo-topo">
      <span class="combo-ribbon">${rotulo}</span>
      <span class="combo-price"><small>R$</small>${reais[0]}<sup>,${reais[1]}</sup></span>
    </div>
    <div class="combo-slots">
      <div class="combo-slot-box" id="slot-${cfg.id}-0"></div>
      <span class="combo-plus">+</span>
      <div class="combo-slot-box" id="slot-${cfg.id}-1"></div>
    </div>
    <div class="combo-dica">${cfg.repete?'Qualquer sabor do cardápio · toque de novo num sabor para tirar':'Toque em 2 sabores diferentes · toque de novo para tirar'}</div>
    ${cfg.repete?`<button type="button" class="combo-repetir" id="rep-${cfg.id}" style="display:none" onclick="comboRepetir('${cfg.id}')">🍕🍕 Quero 2 do mesmo sabor</button>`:''}
    <div class="combo-chips${rolagem}" id="chips-${cfg.id}">`+
      cfg.sabores.map(sab=>`<button type="button" class="combo-chip" data-sab="${sab.replace(/"/g,'&quot;')}" onclick="comboToque('${cfg.id}',this.dataset.sab)">${sab}</button>`).join('')+
    `</div>
    <button class="combo-add-btn" id="add-${cfg.id}" onclick="comboAdicionar('${cfg.id}')" disabled>Escolha 2 sabores</button>
  </div>`;
}
function comboToque(id,sab){
  const cfg=_comboCfg(id); if(!cfg)return;
  const sel=_sel[id]=_sel[id]||[];
  if(sel.includes(sab)){
    // tocar de novo num sabor já escolhido TIRA o sabor (os 2, se estava repetido)
    _sel[id]=sel.filter(x=>x!==sab);
  }else{
    if(sel.length>=2) sel.shift(); // terceiro toque troca o primeiro
    sel.push(sab);
  }
  comboAtualiza(id);
}
// ✕ no quadro do sabor: remove só aquele sabor
function comboRemover(id,i){ const sel=_sel[id]||[]; sel.splice(i,1); _sel[id]=sel; comboAtualiza(id); }
// broto: "2 do mesmo sabor" com 1 clique
function comboRepetir(id){ const sel=_sel[id]||[]; if(sel.length===1){ sel.push(sel[0]); comboAtualiza(id); } }
function comboAtualiza(id){
  const cfg=_comboCfg(id), sel=_sel[id]||[]; if(!cfg)return;
  [0,1].forEach(i=>{
    const el=document.getElementById(`slot-${id}-${i}`); if(!el)return;
    el.className='combo-slot-box'+(sel[i]?' cheio':'');
    el.innerHTML=`<i>${i+1}º sabor</i><b>${sel[i]||'Toque num sabor'}</b>`+(sel[i]?`<button type="button" class="combo-x" onclick="comboRemover('${id}',${i})" aria-label="Remover ${sel[i].replace(/"/g,'')}">✕</button>`:'');
  });
  document.querySelectorAll(`#chips-${id} .combo-chip`).forEach(b=>{
    const n=sel.filter(x=>x===b.dataset.sab).length;
    b.classList.toggle('on',n>0);
    b.dataset.n=n>1?'×2':'';
  });
  const rep=document.getElementById('rep-'+id);
  if(rep) rep.style.display=(cfg.repete&&sel.length===1)?'':'none';
  const btn=document.getElementById('add-'+id);
  if(btn){
    const pronto=sel.length===2;
    btn.disabled=!pronto;
    btn.innerHTML=pronto?`Adicionar ao pedido · R$ ${fmtPrice(cfg.preco)}`:(sel.length===1?'Falta 1 sabor':'Escolha 2 sabores');
  }
}
function comboAdicionar(id){
  const cfg=_comboCfg(id), sel=_sel[id]||[];
  if(!cfg||sel.length!==2)return;
  const [s1,s2]=sel;
  cart.push({
    id:'combo-'+Date.now()+Math.floor(Math.random()*1000),
    n:`${cfg.titulo} — ${s1} + ${s2}`, d:`${id==='broto50'?'Combo broto':'Combo'}: ${s1} e ${s2}`, p:cfg.preco, cat:'co', img:null,
    cartId:Date.now()+Math.random(), selectedBorda:BORDAS[0], removedIngredients:[], addedIngredients:[]
  });
  _sel[id]=[]; comboAtualiza(id);
  updateUI();
  mostrarAviso('✓ Combo adicionado ao pedido');
}
function renderCombos(){
  const el=document.getElementById('cat-co');
  if(!el||typeof COMBOS_DEFAULT==='undefined')return;
  const broto=_comboCfg('broto50');
  el.innerHTML=`<h2 class="cat-title reveal" id="anc-co">Combos</h2>`+
    `<div class="combo-vitrine" id="combo-vitrine">
      <div id="combo-3d" aria-hidden="true"></div>
      <div class="combo-vitrine-txt"><b>2 PIZZAS</b><span>1 preço só</span></div>
    </div>`+
    `<div class="combo-lista">`+
    (broto.sabores.length?_cardCombo(broto,'2 BROTO'):'')+
    COMBOS_DEFAULT.map(c=>_cardCombo(_comboCfg(c.id),'2 POR')).join('')+`</div>`;
  ['broto50',...COMBOS_DEFAULT.map(c=>c.id)].forEach(comboAtualiza);
  iniciarVitrine3D();
}
// aviso rápido no pé da tela (no lugar do alert, que trava a tela e irrita)
let _avisoTimer=null;
function mostrarAviso(msg){
  let t=document.getElementById('aviso-toast');
  if(!t){ t=document.createElement('div'); t.id='aviso-toast'; t.setAttribute('role','status'); document.body.appendChild(t); }
  t.textContent=msg; t.classList.add('on');
  clearTimeout(_avisoTimer); _avisoTimer=setTimeout(()=>t.classList.remove('on'),2200);
}
// 3D opcional: só depois da splash, só em aparelho que aguenta, e nunca bloqueia nada.
let _c3dCarregando=false;
function iniciarVitrine3D(){
  const box=document.getElementById('combo-3d');
  if(!box||_c3dCarregando)return;
  const h=document.documentElement;
  if(h.getAttribute('data-leve')==='1'){ box.classList.add('c3d-fallback'); return; }
  _c3dCarregando=true;
  const abrir=()=>{
    const ok=()=>{ try{ if(!window.Combo3D||!window.Combo3D.iniciar(box)) box.classList.add('c3d-fallback'); }catch(e){ box.classList.add('c3d-fallback'); } };
    if(window.Combo3D){ ok(); return; }
    const sc=document.createElement('script'); sc.src='assets/vendor/combo3d.js'; sc.async=true;
    sc.onload=ok; sc.onerror=()=>box.classList.add('c3d-fallback');
    document.head.appendChild(sc);
  };
  const quando=()=>('requestIdleCallback' in window)?requestIdleCallback(abrir,{timeout:3000}):setTimeout(abrir,1200);
  // espera a splash sair pra não competir com as animações dela
  const ws=document.getElementById('ws');
  if(ws&&getComputedStyle(ws).display!=='none') setTimeout(quando,5500); else quando();
}
// ── ESFIHAS: R$ 5,00 cada; o cliente monta o próprio combo (10 = R$ 50, 20 = R$ 90, 30 = R$ 130) ──
const _esf={}; // contagem por sabor
function renderEsfihas(){
  const el=document.getElementById('cat-es');
  if(!el||typeof ESFIHA_SABORES==='undefined')return;
  el.innerHTML=`<h2 class="cat-title reveal" id="anc-es">Esfihas</h2>`+
    `<div class="esf-box">
      <div class="esf-topo"><span class="esf-preco"><small>cada esfiha</small> R$ 5<sup>,00</sup></span>
        <span class="esf-dica"><b>Quanto mais você leva,<br>menos paga em cada uma!</b></span></div>
      <div class="esf-degraus" id="esf-degraus">`+
      ESFIHA_PACOTES.map(pk=>{
        const un=pk.preco/pk.qtd, eco=pk.qtd*ESFIHA_PRECO_UN-pk.preco;
        return `<button type="button" class="esf-degrau" id="esf-deg-${pk.qtd}" onclick="esfSugerir(${pk.qtd})">
          ${pk.qtd===30?'<em>MELHOR PREÇO</em>':''}
          <span class="esf-deg-q">${pk.qtd}</span><span class="esf-deg-l">esfihas</span>
          <b class="esf-deg-p">R$ ${fmtPrice(pk.preco)}</b>
          <span class="esf-deg-u">R$ ${fmtPrice(un)} cada</span>
          <span class="esf-deg-e">${eco>0?'economize R$ '+fmtPrice(eco):'preço normal'}</span></button>`;
      }).join('')+`</div>
      <div class="esf-barra" aria-hidden="true"><div class="esf-barra-fill" id="esf-barra-fill"></div><i style="left:33.3%"></i><i style="left:66.6%"></i></div>
      <div class="esf-prox" id="esf-prox">Toque num pacote ou escolha os sabores abaixo.</div>
      <div class="esf-lista">`+
      ESFIHA_SABORES.map((sab,i)=>`<div class="esf-linha"><span class="esf-nome">${sab}</span>
        <div class="controls"><button class="btn-action btn-minus" onclick="esfMudar(${i},-1)" aria-label="menos ${sab}">−</button>
        <span class="qty-val" id="esf-q-${i}">0</span>
        <button class="btn-action btn-plus" onclick="esfMudar(${i},1)" aria-label="mais ${sab}">+</button></div></div>`).join('')+
      `</div>
      <div class="esf-resumo" id="esf-resumo">Escolha os sabores e as quantidades.</div>
      <div class="esf-atalhos">`+ESFIHA_PACOTES.map(pk=>`<button type="button" class="combo-sorte" onclick="esfSugerir(${pk.qtd})">${pk.qtd} · R$ ${fmtPrice(pk.preco)}</button>`).join('')+`</div>
      <button class="combo-add-btn esf-add" id="esf-add" onclick="addEsfihasToCart()" disabled>Adicionar<span>+</span></button>
    </div>`;
  esfAtualizar();
}
function _esfTotal(){ return ESFIHA_SABORES.reduce((t,s)=>t+(_esf[s]||0),0); }
function esfMudar(i,d){
  const s=ESFIHA_SABORES[i]; _esf[s]=Math.max(0,Math.min(60,(_esf[s]||0)+d)); esfAtualizar();
}
// atalho: já deixa o total do pacote, distribuindo igualmente (o cliente depois ajusta)
function esfSugerir(qtd){
  ESFIHA_SABORES.forEach(s=>_esf[s]=0);
  for(let k=0;k<qtd;k++){ const s=ESFIHA_SABORES[k%ESFIHA_SABORES.length]; _esf[s]++; }
  esfAtualizar();
}
function esfAtualizar(){
  ESFIHA_SABORES.forEach((s,i)=>{ const e=document.getElementById('esf-q-'+i); if(e)e.textContent=_esf[s]||0; });
  const n=_esfTotal(), r=document.getElementById('esf-resumo'), b=document.getElementById('esf-add');
  const prox=document.getElementById('esf-prox'), fill=document.getElementById('esf-barra-fill');
  if(!r||!b)return;
  if(fill) fill.style.width=Math.min(100,n/30*100)+'%';
  ESFIHA_PACOTES.forEach(pk=>{
    const d=document.getElementById('esf-deg-'+pk.qtd); if(!d)return;
    const melhor=[...ESFIHA_PACOTES].reverse().find(x=>n>=x.qtd);
    d.classList.toggle('on',!!melhor&&melhor.qtd===pk.qtd);
    d.classList.toggle('feito',n>=pk.qtd);
  });
  if(!n){
    r.innerHTML='Escolha os sabores e as quantidades.'; b.disabled=true; b.innerHTML='Escolha as esfihas';
    if(prox) prox.innerHTML='Leve <b>20</b> e cada uma sai por <b>R$ 4,50</b> · leve <b>30</b> e sai por <b>R$ 4,33</b>!';
    return;
  }
  const total=precoEsfihas(n), un=total/n;
  r.innerHTML=`<b>${n} esfiha${n>1?'s':''}</b> = <b class="esf-total">R$ ${fmtPrice(total)}</b> <span class="esf-un">(R$ ${fmtPrice(un)} cada)</span>`;
  const prox_=ESFIHA_PACOTES.map(x=>x.qtd).find(q=>q>n);
  if(prox){
    if(prox_===undefined) prox.innerHTML='🎉 <b>Melhor preço desbloqueado!</b> Cada esfiha sai por R$ 4,33 ou menos.';
    else{
      const falta=prox_-n, pk=ESFIHA_PACOTES.find(x=>x.qtd===prox_);
      // quanto o cliente paga a mais pra chegar no próximo pacote, e quanto ele passa a pagar por esfiha
      const extra=precoEsfihas(prox_)-total;
      prox.innerHTML=`Mais <b>${falta}</b> por só <b>+R$ ${fmtPrice(extra)}</b> e você leva <b>${prox_} por R$ ${fmtPrice(pk.preco)}</b> — cada esfiha sai <b>R$ ${fmtPrice(pk.preco/pk.qtd)}</b>`;
    }
  }
  b.disabled=false; b.innerHTML=`Adicionar ao pedido · R$ ${fmtPrice(total)}`;
}
function addEsfihasToCart(){
  const n=_esfTotal(); if(!n)return;
  const nome=nomeEsfihas(_esf);
  cart.push({
    id:'esf-'+Date.now()+Math.floor(Math.random()*1000),
    n:nome, d:nome, p:precoEsfihas(n), cat:'es', img:null,
    cartId:Date.now()+Math.random(), selectedBorda:BORDAS[0], removedIngredients:[], addedIngredients:[]
  });
  ESFIHA_SABORES.forEach(s=>_esf[s]=0); esfAtualizar();
  updateUI();
  mostrarAviso('✓ Esfihas adicionadas ao pedido');
}

function renderMenu(){
  Object.keys(CATS).forEach(cat=>{
    if(cat==='co')return; // combos têm renderização própria (renderCombos), não a genérica por item
    const el=document.getElementById(CATS[cat]);
    if(!el)return;
    const items=menu.filter(m=>m.cat===cat).slice().sort((a,b)=>a.n.localeCompare(b.n,'pt-BR'));
    const sav=cat==='p'||cat==='s';
    el.innerHTML=`<h2 class="cat-title reveal" id="anc-${cat}">${CATLABELS[cat]}</h2>`+
      items.map(i=>{
        const imgH=i.img
          ?`<div class="item-img-wrap" id="iw-${i.id}" style="display:block;">
              <div class="img-skel" id="sk-${i.id}"></div>
              <img src="${i.img}" alt="${i.n}"
                onload="document.getElementById('sk-${i.id}').style.display='none';this.classList.add('loaded');"
                onerror="this.style.display='none';document.getElementById('sk-${i.id}').style.display='none';">
              <canvas id="cv-${i.id}" style="display:none;width:100%;height:72px;"></canvas>
            </div>`
          :'';
        return`<div class="item-card${sav?' savory':''}" id="card-${i.id}" data-nome="${i.n}" data-desc="${i.d||''}">
          <div class="sel-trigger" onclick="pickSecond(${i.id})"></div>
          <div class="item-row">
            ${imgH}
            <div class="item-info">
              <span class="item-name"><span class="item-num">#${i.id}</span>${i.n}</span>
              <p class="item-desc">${i.d}</p>
              <div class="price-row">
                <span class="item-price">R$ ${fmtPrice(i.p)}</span>
                <div class="controls">
                  <button class="btn-action btn-minus" onclick="removeItem(${i.id})">−</button>
                  <span class="qty-val" id="qty-${i.id}">0</span>
                  <button class="btn-action btn-plus" onclick="addItem(${i.id})">+</button>
                  ${sav?`<button class="btn-half" onclick="startHalf(${i.id})">½&nbsp;MEIA</button>`:''}
                </div>
              </div>
            </div>
          </div>
          <div id="hh-wrap-${i.id}"></div>
          <div id="bc-${i.id}"></div>
          <div id="rc-${i.id}"></div>
        </div>`;
      }).join('');
  });
  renderCombos();
  renderEsfihas();
}

// ══════════════════════════════════
//  PRICE FORMAT
// ══════════════════════════════════
function fmtPrice(n){
  return Number(n).toFixed(2).replace('.',',');
}
function parseBRL(s){
  return parseFloat(String(s).replace(/[^\d,]/g,'').replace(',','.'))||0;
}

// ══════════════════════════════════
//  IMG SHOW / HIDE
// ══════════════════════════════════
function showHalfDiagonal(id,item){
  const wrap=document.getElementById(`hh-wrap-${id}`);
  const imgWrap=document.getElementById(`iw-${id}`);
  if(!wrap)return;
  const u1=item.halves[0].img||'';
  const u2=item.halves[1].img||'';
  // só monta o visual se pelo menos uma imagem existe
  if(!u1&&!u2){wrap.innerHTML='';if(imgWrap)imgWrap.style.display='none';return;}
  if(imgWrap) imgWrap.style.display='none';
  const n1=item.halves[0].n;
  const n2=item.halves[1].n;
  const imgL=u1?`<img src="${u1}" alt="${n1}" onerror="this.parentElement.style.opacity='.15'">`:'';
  const imgR=(u2||u1)?`<img src="${u2||u1}" alt="${n2}" onerror="this.parentElement.style.opacity='.15'">`:'';
  wrap.innerHTML=`<div class="hh-wrap">
    <div class="hh-half-l">${imgL}</div>
    <div class="hh-half-r">${imgR}</div>
    <span class="hh-label hh-label-l">½</span>
    <span class="hh-label hh-label-r">½</span>
  </div>`;
}
function hideHalfDiagonal(id){
  const wrap=document.getElementById(`hh-wrap-${id}`);
  if(wrap) wrap.innerHTML='';
  const imgWrap=document.getElementById(`iw-${id}`);
  if(imgWrap) imgWrap.style.display='block';
}
function showImg(id,isHH,halfItem){
  if(isHH&&halfItem){showHalfDiagonal(id,halfItem);return;}
  const w=document.getElementById(`iw-${id}`);
  if(w) w.style.display='block';
}
function hideImg(id){
  hideHalfDiagonal(id);
  const w=document.getElementById(`iw-${id}`);
  if(w) w.style.display='block'; // sempre visível
}

// ══════════════════════════════════
//  HALF-HALF
// ══════════════════════════════════
function startHalf(id){
  firstHalf=menu.find(m=>m.id===id);
  if(!firstHalf)return;
  document.body.classList.add('sel-mode');
  document.getElementById('half-banner').classList.add('show');
  // pisca o card selecionado
  document.querySelectorAll('.first-half-sel').forEach(el=>el.classList.remove('first-half-sel'));
  const card=document.getElementById(`card-${id}`);
  if(card)card.classList.add('first-half-sel');
  const el=document.getElementById('cat-p');
  if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
}
function cancelHalf(){
  firstHalf=null;
  document.body.classList.remove('sel-mode');
  document.getElementById('half-banner').classList.remove('show');
  document.querySelectorAll('.first-half-sel').forEach(el=>el.classList.remove('first-half-sel'));
}
function pickSecond(id){
  if(!document.body.classList.contains('sel-mode'))return;
  const second=menu.find(m=>m.id===id);
  if(!second||(second.cat!=='p'&&second.cat!=='s'))return;
  const fhId=firstHalf.id; // salva ANTES do cancelHalf zerar firstHalf
  const item={
    id:fhId,cartId:Date.now()+Math.random(),baseId:fhId,
    type:'half',n:`½ ${firstHalf.n} + ½ ${second.n}`,
    halves:[firstHalf,second],
    p:Math.max(firstHalf.p,second.p),cat:firstHalf.cat,
    selectedBorda:BORDAS[0],removedIngredients:[],addedIngredients:[]
  };
  cart.push(item);
  renderBordas(fhId);
  showImg(fhId,true,item);
  cancelHalf();
  updateUI();
  // scroll imediato para o card — antes de abrir carrinho, para controles ficarem visíveis
  const ctrl=document.getElementById(`bc-${fhId}`);
  if(ctrl)ctrl.scrollIntoView({behavior:'smooth',block:'nearest'});
  // borda/acréscimo/remover ficam fechados — cliente abre se quiser
}

