// ══════════════════════════════════
//  DRAWER
// ══════════════════════════════════
function toggleDrawer(){
  const d=document.getElementById('drawer');
  const h=document.getElementById('hamburger');
  const bg=document.getElementById('drawer-bg');
  const open=d.classList.toggle('open');
  h.classList.toggle('open',open);
  bg.classList.toggle('open',open);
}
function closeDrawer(){
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('drawer-bg').classList.remove('open');
}

// ══════════════════════════════════
//  CIRURGIA: SCROLL TO FEEDBACKS
// ══════════════════════════════════
function scrollToFeedbacks(){
  const el=document.getElementById('local-section');
  if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
}

// ══════════════════════════════════
//  CIRURGIA: MAPA
// ══════════════════════════════════
function openMapa(){
  const end=getEndereco();
  document.getElementById('map-endereco-txt').innerText='📍 '+end;
  const q=encodeURIComponent(end);
  document.getElementById('map-frame').src=`https://maps.google.com/maps?q=${q}&output=embed`;
  openModal('modal-mapa');
}
function abrirGoogleMaps(){
  const end=getEndereco();
  window.open('https://maps.google.com/?q='+encodeURIComponent(end),'_blank');
}

// ══════════════════════════════════
//  CIRURGIA: STATS PÚBLICO
// ══════════════════════════════════
async function loadStatsPublico(){
  const today=_localToday();
  const [vr,or_,fr]=await Promise.all([
    sg('visits',{where:[['date','==',today]]}),
    sg('orders',{where:[['created_at','>=',limiteDiaBrasilia(today)]]}),
    sg('feedbacks',{limit:500})
  ]);
  const vis=(vr&&vr[0])?vr[0].count:DB.get('visits_total')||0;
  const ped=(or_&&or_.length)||DB.get('orders_total')||0;
  const aval=(fr&&fr.length)||(DB.get('feedbacks')||[]).length||0;
  document.getElementById('sp-visitas').innerText=vis;
  document.getElementById('sp-pedidos').innerText=ped;
  document.getElementById('sp-aval').innerText=aval;
  document.getElementById('stats-publico').style.display='block';
}

async function openStatsModal(){
  const today=_localToday();
  const [vr,or_,fr]=await Promise.all([
    sg('visits',`?date=eq.${today}`),
    sg('orders',`?created_at=gte.${today}T00:00:00-03:00`),
    sg('feedbacks','?select=id')
  ]);
  const allVr=await sg('visits',{orderBy:'date',orderDir:'asc'});
  const vis=(vr&&vr[0])?Number(vr[0].count):0;
  const ped=(or_&&or_.length)||0;
  const aval=(fr&&fr.length)||0;
  const tv=(allVr||[]).reduce((s,r)=>s+Number(r.count||0),0);
  document.getElementById('stats-content').innerHTML=`
    <div class="dash-grid">
      <div class="dash-card"><div class="dash-num">${vis}</div><div class="dash-lbl">Visitas hoje</div></div>
      <div class="dash-card"><div class="dash-num">${ped}</div><div class="dash-lbl">Pedidos hoje</div></div>
      <div class="dash-card"><div class="dash-num">${tv}</div><div class="dash-lbl">Visitas totais</div></div>
      <div class="dash-card"><div class="dash-num">${aval}</div><div class="dash-lbl">Avaliações</div></div>
    </div>
    <p style="font-size:.82rem;color:var(--tx-6);text-align:center;margin-top:8px;">Dados do Firebase 🍕</p>`;
  openModal('modal-stats');
}

// ══════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════
async function trackVisit(){
  const today=_localToday();
  let v=DB.get('visits')||{};v[today]=(v[today]||0)+1;DB.set('visits',v);DB.inc('visits_total');
  // contador do dia é somado no servidor (registrar-visita.js) — o navegador não escreve em "visits"
  fetch('/api/registrar-visita',{method:'POST'}).catch(()=>{});
}

async function trackOrder(items,od){
  const today=_localToday();
  let o=DB.get('orders')||{};o[today]=(o[today]||0)+1;DB.set('orders',o);DB.inc('orders_total');
  let fl=DB.get('flavors')||[];
  items.forEach(i=>{
    if(i.cat==='p'||i.cat==='s'){
      if(i.type==='half') fl.unshift(i.halves[0].n,i.halves[1].n);
      else fl.unshift(i.n);
    }
  });
  DB.set('flavors',fl.slice(0,30));
  DB.set('last_order',{text:items.map(i=>i.n).join(', '),date:new Date().toLocaleString('pt-BR'),items:items.map(i=>({id:i.id,cat:i.cat}))});
  // salva localmente para histórico offline
  const localOrders=DB.get('local_orders')||[];
  localOrders.unshift({
    date:new Date().toLocaleString('pt-BR'),
    created_at:new Date().toISOString(),
    items_json:items.map(i=>({id:i.id,name:i.n,price:i.p})),
    total:od?.total||0,
    delivery_type:od?.type||'entrega',
    payment:od?.pay||''
  });
  DB.set('local_orders',localOrders.slice(0,30));
  if(od){
    // o pedido é gravado NO SERVIDOR (server/criar-pedido.js): lá é gerado o número
    // do dia, bloqueada a duplicata (mesmo telefone + total em 10 min) e conferido o preço com o
    // cardápio. O navegador não tem mais permissão de escrever em "orders" direto.
    try{
      const headers={'Content-Type':'application/json'};
      _initFB();
      if(AUTH&&AUTH.currentUser){ try{ headers.Authorization='Bearer '+await AUTH.currentUser.getIdToken(); }catch{} }
      const r=await fetch('/api/criar-pedido',{method:'POST',headers,body:JSON.stringify({
        name:od.name,phone:od.phone||null,address:od.address,num:od.num,
        pay:od.pay,change:od.change||null,type:od.type,total:od.total,
        items:items.map(i=>({id:i.id,name:i.n,price:i.p,borda:(i.selectedBorda&&i.selectedBorda.price>0)?i.selectedBorda.name:null,removed:i.removedIngredients||[]}))
      })});
      if(!r.ok) console.warn('Pedido não registrado no sistema (já foi pelo WhatsApp):',await r.text());
    }catch(e){ console.warn('Pedido não registrado no sistema (já foi pelo WhatsApp):',e); }
  }
}

function repeatLastOrder(){
  const last=DB.get('last_order');
  if(!last||!last.items||!last.items.length){alert('Nenhum pedido anterior encontrado.');return;}
  cart=[];
  last.items.forEach(({id})=>{
    // id pode ser number ou string — normaliza para comparação
    const nid=Number(id);
    const item=menu.find(m=>Number(m.id)===nid||m.id===id);
    if(item) cart.push({...item,cartId:Date.now()+Math.random(),selectedBorda:BORDAS[0],removedIngredients:[],addedIngredients:[]});
  });
  if(!cart.length){
    alert('Os itens do último pedido não estão mais disponíveis no cardápio.');
    return;
  }
  const seen=new Set();
  cart.forEach(it=>{if(!seen.has(it.id)){seen.add(it.id);renderBordas(it.id);renderRemovals(it.id);}});
  updateUI();
  const body=document.getElementById('cart-body');
  const hint=document.getElementById('cart-hint');
  if(body){body.style.display='block';hint.innerText='▼ RECOLHER PEDIDO';}
  document.getElementById('cart-bar').scrollIntoView({behavior:'smooth',block:'end'});
}


// ══════════════════════════════════
//  GOOGLE MAPS (sob demanda)
//  Antes carregava junto com a página (centenas de KB) mesmo pra quem só ia olhar o cardápio.
//  Agora só quando o cliente abre o pedido ou toca no campo de endereço.
// ══════════════════════════════════
let _mapsCarregando=false;
function carregarGoogleMaps(){
  if(_mapsCarregando||(window.google&&window.google.maps))return;
  _mapsCarregando=true;
  const s=document.createElement('script');
  s.async=true;
  s.src='https://maps.googleapis.com/maps/api/js?key=AIzaSyBMPjAS03DT3tuGPtJBld2EXuX7C6__1lg&libraries=places&language=pt-BR&region=BR&callback=initGmapsAutocomplete';
  document.head.appendChild(s);
}
document.addEventListener('focusin',e=>{ if(e.target&&e.target.id==='u-end') carregarGoogleMaps(); });

// ══════════════════════════════════
//  COMO CHEGAR + AVALIAÇÕES DO GOOGLE (fim do site)
//  Opcional: cfg "gplace" = Place ID do Google (abre direto a janela de avaliar)
// ══════════════════════════════════
function _linksLocal(){
  const end=getEndereco();
  const q=encodeURIComponent('Pizza em Dobro, '+end);
  const place=(getCfg('gplace','')||'').trim();
  return {
    end,
    mapa:'https://www.google.com/maps?q='+q+'&output=embed',
    waze:'https://waze.com/ul?q='+q+'&navigate=yes',
    maps:'https://www.google.com/maps/search/?api=1&query='+q,
    ver:'https://www.google.com/search?q='+encodeURIComponent('Pizza em Dobro Itapetininga avaliações'),
    avaliar:place?'https://search.google.com/local/writereview?placeid='+encodeURIComponent(place):'https://www.google.com/search?q='+encodeURIComponent('Pizza em Dobro Itapetininga')+'#lkt=LocalPoiReviews'
  };
}
function abrirAvaliarGoogle(){ window.open(_linksLocal().avaliar,'_blank','noopener'); }
function iniciarLocal(){
  const L=_linksLocal();
  const set=(id,k,v)=>{const e=document.getElementById(id); if(e) e[k]=v;};
  set('local-end-txt','textContent','📍 '+L.end);
  set('btn-waze','href',L.waze); set('btn-maps','href',L.maps);
  set('btn-g-ver','href',L.ver); set('btn-g-avaliar','href',L.avaliar);
  set('rodape-ano','textContent',new Date().getFullYear());
  // o mapa só carrega quando chega perto (não pesa na abertura do site)
  const sec=document.getElementById('local-section'), fr=document.getElementById('local-mapa-frame');
  if(!sec||!fr) return;
  const carregar=()=>{ if(fr.src==='about:blank'||!fr.src) fr.src=L.mapa; };
  if('IntersectionObserver' in window){ const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)){carregar();io.disconnect();} },{rootMargin:'400px'}); io.observe(sec); }
  else carregar();
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(iniciarLocal,300));
