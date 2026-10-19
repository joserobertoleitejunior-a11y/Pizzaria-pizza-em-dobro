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
const COMBO_CORES={combo65:'#D62828',combo75:'#E8541E',combo80:'#C2185B',combo85:'#7B1FA2'};
// preço avulso de um sabor (pizza tradicional/especial) pra mostrar a economia do combo
function _precoAvulso(nome){
  const m=(typeof menu!=='undefined'?menu:[]).find(x=>(x.cat==='p'||x.cat==='s')&&x.n===nome);
  return m?Number(m.p):null;
}
function _economiaCombo(id){
  const c=COMBOS_DEFAULT.find(x=>x.id===id); if(!c)return null;
  const s1=document.getElementById(id+'-s1')?.value, s2=document.getElementById(id+'-s2')?.value;
  const p1=_precoAvulso(s1), p2=_precoAvulso(s2);
  if(p1==null||p2==null||s1===s2)return null;
  const eco=p1+p2-c.preco;
  return eco>0.005?{eco,avulso:p1+p2}:null;
}
function atualizarComboCard(id){
  const e=_economiaCombo(id), box=document.getElementById('combo-eco-'+id);
  if(!box)return;
  if(e){ box.innerHTML=`<span class="combo-de">de R$ ${fmtPrice(e.avulso)}</span><b>Você economiza R$ ${fmtPrice(e.eco)}</b>`; box.style.display=''; }
  else box.style.display='none';
}
function comboSurpresa(id){
  const c=COMBOS_DEFAULT.find(x=>x.id===id); if(!c||c.sabores.length<2)return;
  const i=Math.floor(Math.random()*c.sabores.length);
  let j=Math.floor(Math.random()*(c.sabores.length-1)); if(j>=i)j++;
  document.getElementById(id+'-s1').value=c.sabores[i];
  document.getElementById(id+'-s2').value=c.sabores[j];
  atualizarComboCard(id);
}
function renderCombos(){
  const el=document.getElementById('cat-co');
  if(!el||typeof COMBOS_DEFAULT==='undefined')return;
  const ordenados=COMBOS_DEFAULT.slice();
  el.innerHTML=`<h2 class="cat-title reveal" id="anc-co">Combos</h2>`+
    `<div class="combo-vitrine" id="combo-vitrine">
      <div id="combo-3d" aria-hidden="true"></div>
      <div class="combo-vitrine-txt"><b>2 PIZZAS</b><span>1 preço só</span></div>
    </div>`+
    `<p class="combo-intro reveal">Escolha 2 sabores, pague menos que as duas separadas. 🍕+🍕</p>`+
    `<div class="combo-lista">`+
    ordenados.map(c=>{
      const optsS1=c.sabores.map((s,i)=>`<option value="${s}"${i===0?' selected':''}>${s}</option>`).join('');
      const optsS2=c.sabores.map((s,i)=>`<option value="${s}"${i===1?' selected':''}>${s}</option>`).join('');
      const cor=COMBO_CORES[c.id]||'var(--pr)';
      const reais=String(c.preco.toFixed(2)).split('.');
      return `<div class="combo-card" id="combo-card-${c.id}" style="--combo-cor:${cor};">
        <div class="combo-topo">
          <span class="combo-ribbon">2 POR</span>
          <span class="combo-price"><small>R$</small>${reais[0]}<sup>,${reais[1]}</sup></span>
        </div>
        <div id="combo-eco-${c.id}" class="combo-eco" style="display:none"></div>
        <div class="combo-select-row">
          <label class="combo-slot"><i>🍕 1º sabor</i><select id="${c.id}-s1" class="combo-select" onchange="atualizarComboCard('${c.id}')">${optsS1}</select></label>
          <span class="combo-plus">+</span>
          <label class="combo-slot"><i>🍕 2º sabor</i><select id="${c.id}-s2" class="combo-select" onchange="atualizarComboCard('${c.id}')">${optsS2}</select></label>
        </div>
        <div class="combo-footer">
          <button class="combo-sorte" type="button" onclick="comboSurpresa('${c.id}')" aria-label="Sortear sabores">🎲 Surpreenda-me</button>
          <button class="combo-add-btn" onclick="addComboToCart('${c.id}')">Adicionar<span>+</span></button>
        </div>
      </div>`;
    }).join('')+`</div>`;
  ordenados.forEach(c=>atualizarComboCard(c.id));
  iniciarVitrine3D();
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

