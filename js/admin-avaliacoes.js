// ══════════════════════════════════
//  ADMIN — com session persistente
// ══════════════════════════════════
// ⚠️ Senha reativada para teste — login: Marco / senha: 1234
// (troque para true novamente se quiser liberar sem senha)
const TEMP_ADMIN_SEM_SENHA=false;

function openAdminLogin(){
  if(TEMP_ADMIN_SEM_SENHA){
    setAdminSession();
    activateAdminEditMode();
    window.location.href='dashboard/index.html';
    return;
  }
  if(checkAdminSession()){activateAdminEditMode();window.location.href='dashboard/index.html';return;}
  document.getElementById('adm-err').style.display='none';
  document.getElementById('adm-user').value='';
  document.getElementById('adm-pass').value='';
  openModal('modal-admin-login');
}
function doAdminLogin(){
  const u=document.getElementById('adm-user').value;
  const p=document.getElementById('adm-pass').value;
  if(u===ADMIN_USER&&btoa(p)===getAdminPass()){
    setAdminSession();
    closeModal('modal-admin-login');
    activateAdminEditMode();
    window.location.href='dashboard/index.html';
  } else {
    document.getElementById('adm-err').style.display='block';
  }
}

function activateAdminEditMode(){
  document.body.classList.add('admin-edit-active');
  // injeta botões de exclusão nos cards de menu
  document.querySelectorAll('.item-card').forEach(card=>{
    if(!card.querySelector('.item-adm-del')){
      const id=card.id.replace('card-','');
      const btn=document.createElement('button');
      btn.className='item-adm-del';
      btn.innerHTML='🗑';
      btn.onclick=(e)=>{e.stopPropagation();adminDeleteItemDirect(Number(id));};
      card.appendChild(btn);
    }
  });
  // re-renderiza avaliações com controles admin inline
  renderFeedbacks();
}

function exitAdminEditMode(){
  document.body.classList.remove('admin-edit-active');
  localStorage.removeItem('pd_admin_session');
  adminSession=false;
  renderFeedbacks();
}

async function adminDeleteItemDirect(id){
  if(!confirm('Remover este item do cardápio?'))return;
  try{
    _initFB();
    if(FS) await FS.collection('menu_items').doc(String(id)).delete();
    menu=menu.filter(m=>m.id!==id);
    DB.set('menu_custom',menu);
    renderMenu();
  }catch(e){
    console.error('Erro ao remover item:',e);
    alert('Não foi possível remover o item agora (sem conexão com o banco?). Nada foi apagado — tente de novo.');
    return;
  }
  // re-injeta botões após renderMenu criar os novos cards
  setTimeout(()=>{
    if(!document.body.classList.contains('admin-edit-active'))return;
    document.querySelectorAll('.item-card').forEach(card=>{
      if(!card.querySelector('.item-adm-del')){
        const cid=card.id.replace('card-','');
        const btn=document.createElement('button');
        btn.className='item-adm-del';
        btn.innerHTML='🗑';
        btn.onclick=(e)=>{e.stopPropagation();adminDeleteItemDirect(Number(cid));};
        card.appendChild(btn);
      }
    });
  },100);
}

// ══════════════════════════════════
//  CIRURGIA: RESET DASHBOARD
// ══════════════════════════════════
function resetDash(){
  if(!confirm('Zerar cache local de visitas e pedidos? (dados do Firebase são mantidos)'))return;
  ['visits','orders','visits_total','orders_total','flavors'].forEach(k=>localStorage.removeItem('pd_'+k));
  closeModal('modal-dash');
  setTimeout(()=>openDash(dashPeriod),300);
}

// ══════════════════════════════════
//  CIRURGIA: GERENCIAR AVALIAÇÕES — estilo caixa de email
// ══════════════════════════════════
let _fbSelAll=false;
async function openGerenciarFb(){
  openModal('modal-gerenciar-fb');
  document.getElementById('gerenciar-fb-list').innerHTML=`<div style="text-align:center;padding:20px;color:#555;">⏳ Carregando...</div>`;
  const [fbRows,cmRows]=await Promise.all([
    sg('feedbacks',{orderBy:'created_at',orderDir:'desc',limit:50}),
    sg('feedback_comments',{orderBy:'created_at',orderDir:'desc',limit:100})
  ]);
  // filtra os já deletados nesta sessão
  const filteredFb=(fbRows||[]).filter(r=>!_deletedFbIds.has(r.id));
  const filteredCm=(cmRows||[]).filter(c=>!_deletedCmIds.has(c.id));
  if(!filteredFb.length&&!filteredCm.length){
    document.getElementById('gerenciar-fb-list').innerHTML=`<p style="color:#444;font-size:.78rem;text-align:center;padding:16px;">Nenhuma avaliação ou comentário.</p>`;
    return;
  }
  let html=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
    <label style="display:flex;align-items:center;gap:6px;font-size:.72rem;color:#aaa;cursor:pointer;">
      <input type="checkbox" id="fb-sel-all" onchange="toggleSelectAllFb(this.checked)" style="accent-color:var(--pr);width:16px;height:16px;"> Selecionar tudo
    </label>
    <button onclick="deleteSelectedFb()" style="background:rgba(231,29,54,.15);border:1px solid rgba(231,29,54,.25);color:var(--se);padding:5px 12px;border-radius:8px;font-size:.7rem;font-weight:700;cursor:pointer;margin-left:auto;">🗑 Apagar Selecionados</button>
  </div>`;
  if(filteredFb.length){
    html+=`<div style="font-size:.65rem;color:#555;letter-spacing:2px;margin:8px 0 6px;">AVALIAÇÕES (${filteredFb.length})</div>`;
    html+=filteredFb.map(r=>`
      <div class="gfb-row" id="gfb-row-fb-${r.id}" data-type="fb" data-id="${r.id}">
        <input type="checkbox" class="gfb-check" onchange="gfbCheckChange()" style="accent-color:var(--pr);width:16px;height:16px;flex-shrink:0;">
        <div class="gfb-body">
          <div class="gfb-meta"><b>${r.name}</b> ${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)} <span class="gfb-date">${r.created_at?new Date(dataStr(r.created_at)).toLocaleString('pt-BR'):''}</span></div>
          <div class="gfb-txt">${r.comment||''}</div>
        </div>
        <button onclick="deleteSingleFbRow('fb',${r.id},this)" class="gfb-del-btn">🗑</button>
      </div>`).join('');
  }
  if(filteredCm.length){
    html+=`<div style="font-size:.65rem;color:#555;letter-spacing:2px;margin:12px 0 6px;">COMENTÁRIOS (${filteredCm.length})</div>`;
    html+=filteredCm.map(c=>`
      <div class="gfb-row" id="gfb-row-cm-${c.id}" data-type="cm" data-id="${c.id}">
        <input type="checkbox" class="gfb-check" onchange="gfbCheckChange()" style="accent-color:var(--pr);width:16px;height:16px;flex-shrink:0;">
        <div class="gfb-body">
          <div class="gfb-meta"><b>${c.author}</b> <span class="gfb-date">${c.created_at?new Date(dataStr(c.created_at)).toLocaleString('pt-BR'):''}</span></div>
          <div class="gfb-txt">${c.comment||''}</div>
        </div>
        <button onclick="deleteSingleFbRow('cm',${c.id},this)" class="gfb-del-btn">🗑</button>
      </div>`).join('');
  }
  document.getElementById('gerenciar-fb-list').innerHTML=html;
}

function toggleSelectAllFb(checked){
  _fbSelAll=checked;
  document.querySelectorAll('#gerenciar-fb-list .gfb-check').forEach(cb=>cb.checked=checked);
}
function gfbCheckChange(){
  const all=document.querySelectorAll('#gerenciar-fb-list .gfb-check');
  const checked=document.querySelectorAll('#gerenciar-fb-list .gfb-check:checked');
  document.getElementById('fb-sel-all').checked=(all.length===checked.length);
}
async function deleteSingleFbRow(type,id,btn){
  if(!confirm('Remover este item?'))return;
  const numId=Number(id);
  if(type==='fb'){
    _deletedFbIds.add(numId);
    await sdel('feedbacks',id);
    _initFB();if(FS){const cs=await FS.collection('feedback_comments').where('feedback_id','==',id).get();cs.docs.forEach(d=>d.ref.delete());}
  } else {
    _deletedCmIds.add(numId);
    await sdel('feedback_comments',id);
  }
  document.getElementById(`gfb-row-${type}-${id}`)?.remove();
  // atualiza lista pública sem reload
  document.getElementById(`fb-card-${id}`)?.remove();
  document.getElementById(`fc-item-${id}`)?.remove();
}
async function deleteSelectedFb(){
  const rows=document.querySelectorAll('#gerenciar-fb-list .gfb-row');
  const sel=[];
  rows.forEach(row=>{
    const cb=row.querySelector('.gfb-check');
    if(cb&&cb.checked) sel.push({type:row.dataset.type,id:row.dataset.id,el:row});
  });
  if(!sel.length){alert('Selecione pelo menos um item.');return;}
  if(!confirm(`Apagar ${sel.length} item(ns) selecionado(s)?`))return;
  for(const s of sel){
    const numId=Number(s.id);
    if(s.type==='fb'){
      _deletedFbIds.add(numId);
      await sdel('feedbacks',s.id);
      _initFB();if(FS){const cs=await FS.collection('feedback_comments').where('feedback_id','==',s.id).get();cs.docs.forEach(d=>d.ref.delete());}
      document.getElementById(`fb-card-${s.id}`)?.remove();
    } else {
      _deletedCmIds.add(numId);
      await sdel('feedback_comments',s.id);
      document.getElementById(`fc-item-${s.id}`)?.remove();
    }
    s.el.remove();
  }
}
// data local correta (não UTC)
function _localToday(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function _localDateMinus(days){
  const d=new Date();
  d.setDate(d.getDate()-days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

let dashPeriod=1;
let dashDateFrom='';
let dashDateTo='';

function _dashDates(){
  if(dashDateFrom&&dashDateTo) return {from:dashDateFrom,to:dashDateTo};
  const today=_localToday();
  if(dashPeriod<=1) return {from:today,to:today};
  return {from:_localDateMinus(dashPeriod-1),to:today};
}

function _dashDateLabel(){
  const {from,to}=_dashDates();
  const today=_localToday();
  if(from===to) return from===today?'Hoje':_fmtDateBR(from);
  return `${_fmtDateBR(from)} – ${_fmtDateBR(to)}`;
}

async function openDash(period){
  if(period!==undefined){dashPeriod=period;dashDateFrom='';dashDateTo='';}
  openModal('modal-dash');
  _renderDashSkeleton();
  await _loadDashData();
}

function _renderDashSkeleton(){
  const today=_localToday();
  const {from,to}=_dashDates();
  document.getElementById('dash-content').innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <span style="font-family:'Oswald',sans-serif;color:var(--pr);font-size:1rem;letter-spacing:2px;">PAINEL DO ESTABELECIMENTO</span>
      <span id="dash-online-dot" style="display:inline-flex;align-items:center;gap:5px;font-size:.65rem;color:#555;">
        <span id="dash-online-led" style="width:8px;height:8px;border-radius:50%;background:#333;display:inline-block;"></span>
        <span id="dash-online-txt">Verificando...</span>
      </span>
    </div>

    <!-- SELETOR DE PERÍODO -->
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:12px;margin-bottom:14px;">
      <div style="font-size:.65rem;color:#555;letter-spacing:2px;margin-bottom:8px;">PERÍODO</div>
      <div class="dash-period" style="margin-bottom:10px;">
        <button class="dash-period-btn${dashPeriod===1&&!dashDateFrom?' active':''}" onclick="openDash(1)">Hoje</button>
        <button class="dash-period-btn${dashPeriod===7&&!dashDateFrom?' active':''}" onclick="openDash(7)">7 dias</button>
        <button class="dash-period-btn${dashPeriod===15&&!dashDateFrom?' active':''}" onclick="openDash(15)">15 dias</button>
        <button class="dash-period-btn${dashPeriod===30&&!dashDateFrom?' active':''}" onclick="openDash(30)">30 dias</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;">
          <div style="font-size:.6rem;color:#555;margin-bottom:3px;">DE</div>
          <input type="date" id="dash-from" value="${from}" max="${today}" style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);padding:7px 8px;border-radius:8px;color:#fff;font-size:.78rem;outline:none;">
        </div>
        <div style="flex:1;min-width:120px;">
          <div style="font-size:.6rem;color:#555;margin-bottom:3px;">ATÉ</div>
          <input type="date" id="dash-to" value="${to}" max="${today}" style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);padding:7px 8px;border-radius:8px;color:#fff;font-size:.78rem;outline:none;">
        </div>
        <button onclick="applyDashDates()" style="background:var(--pr);border:none;color:#000;padding:8px 14px;border-radius:8px;font-size:.72rem;font-weight:700;cursor:pointer;align-self:flex-end;">FILTRAR</button>
      </div>
    </div>

    <div id="dash-body" style="text-align:center;padding:24px;color:#555;">⏳ Carregando dados...</div>`;
}

async function applyDashDates(){
  const f=document.getElementById('dash-from')?.value;
  const t=document.getElementById('dash-to')?.value;
  if(!f||!t){alert('Selecione as duas datas.');return;}
  if(f>t){alert('Data inicial deve ser menor ou igual à final.');return;}
  dashDateFrom=f;dashDateTo=t;dashPeriod=0;
  await _loadDashData();
}

async function _loadDashData(){
  const {from,to}=_dashDates();
  const today=_localToday();
  const isToday=(from===today&&to===today);
  const isSingleDay=(from===to);

  const [vr,or_,fr,clients,visitsToday]=await Promise.all([
    sg('visits',{where:[['date','>=',from],['date','<=',to]],orderBy:'date',orderDir:'asc'}),
    sg('orders',{where:[['created_at','>=',from+'T00:00:00-03:00'],['created_at','<=',to+'T23:59:59-03:00']],limit:500}),
    sg('feedbacks',{orderBy:'created_at',orderDir:'desc',limit:20}),
    sg('clients',{orderBy:'last_visit',orderDir:'desc',limit:30}),
    sg('visits',{where:[['date','==',today]]})
  ]);

  // indicador online: busca updated_at recente (últimos 5min)
  const fiveMinAgo=new Date(Date.now()-5*60*1000).toISOString();
  const onlineRows=await sg('visits',{where:[['updated_at','>=',fiveMinAgo]]});
  const visitsTodayCount=Number((visitsToday&&visitsToday[0]?.count)||0);
  const onlineActive=onlineRows&&onlineRows.length>0;

  const led=document.getElementById('dash-online-led');
  const txt=document.getElementById('dash-online-txt');
  if(led&&txt){
    if(onlineActive){
      led.style.cssText='width:8px;height:8px;border-radius:50%;display:inline-block;background:#2ecc71;box-shadow:0 0 6px #2ecc71;';
      txt.style.color='#2ecc71';txt.innerText='Ativo agora';
    } else if(visitsTodayCount>0){
      led.style.cssText='width:8px;height:8px;border-radius:50%;display:inline-block;background:#FF9F1C;';
      txt.style.color='var(--pr)';txt.innerText=visitsTodayCount+' visitas hoje';
    } else {
      led.style.cssText='width:8px;height:8px;border-radius:50%;display:inline-block;background:#333;';
      txt.style.color='#555';txt.innerText='Sem visitas hoje';
    }
  }

  const allVisits=vr||[];
  const allOrders=or_||[];
  const totalVisits=allVisits.reduce(function(s,r){return s+Number(r.count||0);},0);
  const totalOrders=allOrders.length;
  const receita=allOrders.reduce(function(s,r){return s+Number(r.total||0);},0);

  const periodLabel=isSingleDay
    ?(isToday?'Hoje':_fmtDateBR(from))
    :(_fmtDateBR(from)+' – '+_fmtDateBR(to));

  // sabores
  const fc={};
  allOrders.forEach(function(r){
    var items=r.items_json;
    if(!items)return;
    if(typeof items==='string'){try{items=JSON.parse(items);}catch(e){return;}}
    if(!Array.isArray(items))return;
    items.forEach(function(i){if(i&&i.name)fc[i.name]=(fc[i.name]||0)+1;});
  });
  const top=Object.entries(fc).sort(function(a,b){return b[1]-a[1];}).slice(0,7);

  const pizzaColors=['#FF9F1C','#E71D36','#2ecc71','#4285F4','#c0392b','#8e44ad','#16a085'];

  // barras
  const vm={};allVisits.forEach(function(r){vm[r.date]=Number(r.count||0);});
  const om={};allOrders.forEach(function(r){var d=r.created_at&&dataStr(r.created_at).slice(0,10);if(d)om[d]=(om[d]||0)+1;});
  const maxV=Math.max.apply(null,Object.values(vm).concat([1]));
  var bars='';
  const dFrom=new Date(from+'T12:00:00');
  const dTo=new Date(to+'T12:00:00');
  const diffDays=Math.round((dTo-dFrom)/(1000*60*60*24))+1;
  const showDays=Math.min(diffDays,60);
  for(var i=showDays-1;i>=0;i--){
    var d=new Date(dTo);d.setDate(d.getDate()-i);
    // usa data local (não UTC)
    var dk=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    var lbl=String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
    var v=vm[dk]||0;var oc=om[dk]||0;
    var w=Math.round(v/maxV*100)||0;
    bars+='<div class="bar-row"><div class="bar-meta"><span>'+lbl+'</span><span><span style="color:var(--pr)">'+v+' vis</span> / <span style="color:#2ecc71">'+oc+' ped</span></span></div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%"></div></div></div>';
  }
  if(!bars||showDays===0)bars='<p style="color:#444;font-size:.78rem;padding:8px 0;">Sem dados de visitas neste período.</p>';

  const fbH=(fr||[]).slice(0,5).map(function(f){
    return '<div class="dash-fb"><b>'+f.name+'</b> '+'★'.repeat(f.stars)+'☆'.repeat(5-f.stars)+'<br><span style="color:#aaa;">'+(f.comment||'')+'</span><br><small style="color:#333">'+(f.created_at?new Date(dataStr(f.created_at)).toLocaleString('pt-BR'):'')+'</small></div>';
  }).join('')||'<p style="color:#444;font-size:.78rem;">Nenhuma avaliação ainda.</p>';

  const orH=allOrders.slice(0,10).map(function(r){
    return '<div class="ord-row"><span style="float:right;color:var(--pr);font-weight:700;">R$\u00a0'+fmtPrice(r.total||0)+'</span><b>'+(r.client_name||'—')+'</b>'+(r.client_email?' <span style="color:#444;font-size:.63rem;">'+r.client_email+'</span>':'')+'<br><span style="font-size:.7rem;color:#aaa;">'+(r.delivery_type==='retirada'?'🏠 Retirada':'🛵 Entrega')+' · '+(r.payment||'—')+'</span><br><small style="color:#333;">'+(r.created_at?new Date(dataStr(r.created_at)).toLocaleString('pt-BR'):'')+'</small></div>';
  }).join('')||'<p style="color:#444;font-size:.78rem;">Sem pedidos no período.</p>';

  const clientsH=(clients||[]).map(function(c){
    return '<div class="client-row">'+(c.photo?'<img src="'+c.photo+'" onerror="this.style.display=\'none\'" alt="">':'<div style="width:32px;height:32px;border-radius:50%;background:#222;display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0;color:#666;">G</div>')+'<div class="client-info"><div class="client-name">'+(c.name||'—')+'</div><div class="client-email">'+(c.email||'')+'</div></div><small style="color:#333;font-size:.6rem;">'+(c.last_visit?new Date(c.last_visit).toLocaleDateString('pt-BR'):'')+'</small></div>';
  }).join('')||'<p style="color:#444;font-size:.78rem;">Nenhum cliente cadastrado ainda.</p>';

  var saboresBlock='';
  if(top.length){
    var maxTop=top[0][1]||1;
    saboresBlock='<div style="margin-bottom:4px;">';
    top.forEach(function(e,i){
      var n=e[0],c=e[1];
      var w=Math.round(c/maxTop*100);
      var colors=['#FF9F1C','#E71D36','#2ecc71','#4285F4','#c0392b','#8e44ad','#16a085'];
      var col=colors[i%colors.length];
      saboresBlock+='<div style="margin-bottom:8px;">'
        +'<div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:3px;"><span style="color:#ddd;">'+n+'</span><span style="color:'+col+';font-weight:700;">'+c+'× pedido'+(c>1?'s':'')+'</span></div>'
        +'<div style="height:10px;background:rgba(255,255,255,.05);border-radius:5px;overflow:hidden;">'
        +'<div style="height:100%;width:'+w+'%;background:'+col+';border-radius:5px;transition:width .5s;"></div>'
        +'</div>'
        +'</div>';
    });
    saboresBlock+='</div>';
  } else {
    saboresBlock='<p style="color:#444;font-size:.78rem;padding:8px 0;">Nenhum pedido registrado ainda.</p>';
  }

  const body=document.getElementById('dash-body');
  if(!body)return;

  body.innerHTML=
    '<div class="dash-grid">'
    +'<div class="dash-card"><div class="dash-num">'+totalVisits+'</div><div class="dash-lbl">Visitantes<br><span style="font-size:.58rem;color:#555;">'+periodLabel+'</span></div></div>'
    +'<div class="dash-card"><div class="dash-num">'+totalOrders+'</div><div class="dash-lbl">Pedidos<br><span style="font-size:.58rem;color:#555;">'+periodLabel+'</span></div></div>'
    +'</div>'
    +'<div class="dash-card" style="margin-bottom:14px;text-align:center;"><div class="dash-num" style="font-size:1.5rem;color:#2ecc71;">R$\u00a0'+fmtPrice(receita)+'</div><div class="dash-lbl">Faturamento — '+periodLabel+'</div></div>'
    +'<div class="ds-title">📅 Acessos por dia — '+periodLabel+'</div>'
    +bars
    +'<div class="ds-title">🍕 Sabores mais pedidos</div>'
    +saboresBlock
    +'<div class="ds-title">📋 Pedidos ('+totalOrders+' no período)</div>'
    +orH
    +'<div class="ds-title">👥 Clientes cadastrados ('+(clients||[]).length+')</div>'
    +clientsH
    +'<div class="ds-title">⭐ Avaliações recentes</div>'
    +fbH
    +'<div class="ds-title">🛠 GESTÃO</div>'
    +'<button class="m-btn" style="background:rgba(255,159,28,.18);border:1px solid rgba(255,159,28,.5);" onclick="closeModal(\'modal-dash\');openConversor()">📋 CONVERSOR DE PEDIDO</button>'
    +'<button class="m-btn" style="background:rgba(46,204,113,.08);color:#2ecc71;border:1px solid rgba(46,204,113,.25);margin-top:0;" onclick="closeModal(\'modal-dash\');openPedidosConvertidos()">✅ PEDIDOS CONVERTIDOS</button>'
    +'<button class="m-btn" style="background:rgba(66,133,244,.12);border:1px solid rgba(66,133,244,.3);color:#4285F4;" onclick="closeModal(\'modal-dash\');openClientesAdmin()">👥 PAINEL DE CLIENTES</button>'
    +'<button class="m-btn" onclick="closeModal(\'modal-dash\');openEditor()">🍕 EDITAR CARDÁPIO</button>'    +'<button class="m-btn" style="background:rgba(255,159,28,.1);color:var(--pr);border:1px solid rgba(255,159,28,.25);margin-top:0;" onclick="closeModal(\'modal-dash\');openBordasAdmin()">🥖 BORDAS</button>'    +'<button class="m-btn" style="background:rgba(46,204,113,.08);color:#2ecc71;border:1px solid rgba(46,204,113,.25);margin-top:0;" onclick="closeModal(\'modal-dash\');openAcrescimosAdmin()">➕ ACRÉSCIMOS</button>'
    +'<button class="m-btn" style="background:rgba(255,159,28,.1);color:var(--pr);border:1px solid rgba(255,159,28,.25);margin-top:0;" onclick="closeModal(\'modal-dash\');openConfig()">⚙ CONFIGURAÇÕES</button>'
    +'<button class="m-btn" style="background:rgba(255,159,28,.1);color:var(--pr);border:1px solid rgba(255,159,28,.25);margin-top:0;" onclick="closeModal(\'modal-dash\');openMusicAdmin()">🎵 PLAYLIST</button>'
    +'<button class="m-btn" style="background:rgba(255,159,28,.1);color:var(--pr);border:1px solid rgba(255,159,28,.25);margin-top:0;" onclick="closeModal(\'modal-dash\');openGerenciarFb()">💬 GERENCIAR AVALIAÇÕES</button>'
    +'<button class="m-btn-sec" style="color:var(--se);border-color:rgba(231,29,54,.2);margin-top:8px;" onclick="exitAdminEditMode();closeModal(\'modal-dash\');">🔒 SAIR DO ADMIN</button>'
    +'<button class="m-btn-sec" onclick="closeModal(\'modal-dash\')" style="margin-top:4px;">Fechar</button>';
}

function _fmtDateBR(isoDate){
  if(!isoDate)return '';
  var p=isoDate.split('-');
  return p[2]+'/'+p[1]+'/'+p[0];
}


