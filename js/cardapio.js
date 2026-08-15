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
    ctx.strokeStyle='rgba(255,159,28,.85)';ctx.lineWidth=3;ctx.setLineDash([10,6]);
    ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(0,H-26,W/2,26);ctx.fillRect(W/2,H-26,W/2,26);
    ctx.fillStyle='#FF9F1C';ctx.font='bold 11px Inter,sans-serif';ctx.textAlign='center';
    ctx.fillText('½',W/4,H-8);ctx.fillText('½',3*W/4,H-8);
  }).catch(()=>{ctx.fillStyle='#111';ctx.fillRect(0,0,W,H);});
}

// ══════════════════════════════════
//  RENDER MENU
// ══════════════════════════════════
// ══════════════════════════════════
//  COMBOS "2 POR X" — seleção real de sabores
// ══════════════════════════════════
function renderCombos(){
  const el=document.getElementById('cat-co');
  if(!el||typeof COMBOS_DEFAULT==='undefined')return;
  el.innerHTML=`<h2 class="cat-title" id="anc-co">Combos</h2>`+
    COMBOS_DEFAULT.map(c=>{
      const opts=c.sabores.map(s=>`<option value="${s}">${s}</option>`).join('');
      return `<div class="item-card savory" id="combo-card-${c.id}">
        <span class="item-name">🍕🍕 ${c.titulo}</span>
        <p class="item-desc">Escolha 2 sabores diferentes (uma pizza de cada):</p>
        <div style="display:flex;flex-direction:column;gap:8px;margin:10px 0;">
          <select id="${c.id}-s1" class="m-input" style="width:100%;">${opts}</select>
          <select id="${c.id}-s2" class="m-input" style="width:100%;">${opts}</select>
        </div>
        <div class="price-row">
          <span class="item-price">R$ ${fmtPrice(c.preco)}</span>
          <div class="controls">
            <button class="btn-action" style="width:auto;padding:0 16px;border-radius:20px;" onclick="addComboToCart('${c.id}')">+ Adicionar</button>
          </div>
        </div>
      </div>`;
    }).join('');
}
function addComboToCart(comboTierId){
  const combo=COMBOS_DEFAULT.find(c=>c.id===comboTierId);
  if(!combo)return;
  const s1=document.getElementById(comboTierId+'-s1')?.value;
  const s2=document.getElementById(comboTierId+'-s2')?.value;
  if(!s1||!s2)return;
  if(s1===s2){ alert('Escolha 2 sabores diferentes — o combo é uma pizza de cada.'); return; }
  const nome=`${combo.titulo} — ${s1} + ${s2}`;
  cart.push({
    id:'combo-'+Date.now()+Math.floor(Math.random()*1000),
    n:nome, d:`Combo: ${s1} e ${s2}`, p:combo.preco, cat:'co', img:null,
    cartId:Date.now()+Math.random(), selectedBorda:BORDAS[0], removedIngredients:[], addedIngredients:[]
  });
  updateUI();
  alert('Combo adicionado ao carrinho! 🍕🍕');
}

function renderMenu(){
  Object.keys(CATS).forEach(cat=>{
    if(cat==='co')return; // combos têm renderização própria (renderCombos), não a genérica por item
    const el=document.getElementById(CATS[cat]);
    if(!el)return;
    const items=menu.filter(m=>m.cat===cat).slice().sort((a,b)=>a.n.localeCompare(b.n,'pt-BR'));
    const sav=cat==='p'||cat==='s';
    el.innerHTML=`<h2 class="cat-title" id="anc-${cat}">${CATLABELS[cat]}</h2>`+
      items.map(i=>{
        const imgH=i.img
          ?`<div class="item-img-wrap" id="iw-${i.id}" style="display:block;">
              <div class="img-skel" id="sk-${i.id}"></div>
              <img src="${i.img}" alt="${i.n}"
                onload="document.getElementById('sk-${i.id}').style.display='none';this.classList.add('loaded');"
                onerror="this.style.display='none';document.getElementById('sk-${i.id}').style.display='none';">
              <canvas id="cv-${i.id}" style="display:none;width:100%;height:150px;"></canvas>
            </div>`
          :'';
        return`<div class="item-card${sav?' savory':''}" id="card-${i.id}" data-nome="${i.n}" data-desc="${i.d||''}">   
          <div class="sel-trigger" onclick="pickSecond(${i.id})"></div>
          ${imgH}
          <div id="hh-wrap-${i.id}"></div>
          <span class="item-name">#${i.id} - ${i.n}</span>
          <p class="item-desc">${i.d}</p>
          <div class="price-row">
            <span class="item-price">R$ ${fmtPrice(i.p)}</span>
            <div class="controls">
              <button class="btn-action" onclick="removeItem(${i.id})">−</button>
              <span class="qty-val" id="qty-${i.id}">0</span>
              <button class="btn-action" onclick="addItem(${i.id})">+</button>
              ${sav?`<button class="btn-half" onclick="startHalf(${i.id})">½&nbsp;MEIO</button>`:''}
            </div>
          </div>
          <div id="bc-${i.id}"></div>
          <div id="rc-${i.id}"></div>
        </div>`;
      }).join('');
  });
  renderCombos();
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

