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
  const el=document.getElementById('feedback-section');
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
    <p style="font-size:.72rem;color:#444;text-align:center;margin-top:8px;">Dados do Firebase 🍕</p>`;
  openModal('modal-stats');
}

// ══════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════
async function trackVisit(){
  const today=_localToday();
  const now=new Date().toISOString();
  let v=DB.get('visits')||{};v[today]=(v[today]||0)+1;DB.set('visits',v);DB.inc('visits_total');
  _initFB();
  if(FS){
    try{
      const exS=await FS.collection('visits').where('date','==',today).get();
      if(!exS.empty){const d=exS.docs[0];await d.ref.update({count:(d.data().count||0)+1,updated_at:now});}
      else await FS.collection('visits').add({date:today,count:1,updated_at:now});
    }catch(e){ console.warn('Não foi possível registrar a visita no Firestore (contador local continua funcionando).',e); }
  }
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
    _initFB();
    // trava contra pedido duplicado ANTES de gravar — cliente que clica "enviar" mais de uma vez
    // (duplo toque que escapou do _enviandoPedido, reabriu a aba, app perdeu conexão e reenviou
    // sozinho etc.) não pode virar 2 pedidos reais no Caixa. Considera duplicata: mesmo telefone,
    // mesmo total, criado nos últimos 10 minutos — sinal forte de "é o mesmo pedido de novo".
    if(od.phone){
      const recentes = await sg('orders',{where:[['client_phone','==',od.phone]],limit:10});
      if(recentes){
        const dezMinAtras = Date.now()-10*60*1000;
        const duplicata = recentes.find(p=>{
          const criadoEm = toMillis(p.created_at);
          return criadoEm>=dezMinAtras && Math.abs(Number(p.total||0)-Number(od.total||0))<0.01;
        });
        if(duplicata){
          console.warn('Pedido duplicado bloqueado — mesmo telefone/total já registrado há pouco (id '+duplicata.id+').');
          return;
        }
      }
    }
    const numeroSequencial=await obterProximoNumeroSequencial(FS);
    await sp('orders',{
      client_name:od.name,client_email:fbUser?.email||od.email||null,client_uid:AUTH?.currentUser?.uid||null,
      client_phone:od.phone||null,
      address:od.address,house_number:od.num,
      payment:od.pay,change_for:od.change||null,delivery_type:od.type,
      total:od.total,
      items_json:items.map(i=>({id:i.id,name:i.n,price:i.p,borda:(i.selectedBorda&&i.selectedBorda.price>0)?i.selectedBorda.name:null,removed:i.removedIngredients})),
      whatsapp_sent:true,
      status:'novo',
      origem:'loja',
      numero_sequencial:numeroSequencial
    });
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

