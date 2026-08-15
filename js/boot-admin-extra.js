// ══════════════════════════════════
//  BOOT
// ══════════════════════════════════
async function init(){
  // força reset de promos antigas em cache
  localStorage.removeItem('pd_promos');
  // limpa cache de menu antigo que tinha imagens do Unsplash
  const cached=DB.get('menu_custom');
  if(cached&&cached[0]&&cached[0].img&&cached[0].img.includes('unsplash')){
    localStorage.removeItem('pd_menu_custom');
  }

  trackVisit();

  const h=new Date().getHours();const isOpen=h>=18&&h<=23;
  const st=document.getElementById('status-loja');
  st.innerText=isOpen?'ABERTO':'FECHADO';st.className='status-badge '+(isOpen?'open':'closed');

  let loaded=false;
  try{
    const rows=await sg('menu_items',{where:[['active','==',true]],orderBy:'slug_id',orderDir:'asc'});
    if(rows&&rows.length){
      menu=rows.map(r=>({id:r.slug_id||r.id,n:r.name,d:r.description||'',p:parseFloat(r.price),cat:_normalizarCategoriaCardapio(r.category),img:r.img_url||null}));
      DB.set('menu_custom',menu);loaded=true;
    }
  }catch(e){console.warn('menu:',e);}
  if(!loaded){const cm=DB.get('menu_custom');menu=cm&&cm.length?cm:[...DEFAULT_MENU];}

  renderMenu();
  marcarSplashPronta();
  // restaura sessão admin se válida (mantém controles inline visíveis)
  if(checkAdminSession()) activateAdminEditMode();
  if(checkAdminSession()) mostrarBotaoAbrirCaixa();
  if(checkAdminSession()) publicarNovidadesCardapio(true);
  // veio do novo dashboard pedindo a gestão de cardápio/config? abre o painel de gestão existente
  if(new URLSearchParams(window.location.search).get('admin')==='1' && checkAdminSession()){
    setTimeout(()=>openDash(),300);
  }
  loadClientBadge();
  renderFeedbacks();
  loadMusic();
  DB.set('promos',[]); // sem promos
  if(typeof google!=='undefined') initGoogleLogin();
  else document.querySelector('script[src*="gsi"]')?.addEventListener('load',initGoogleLogin);
}

// ══════════════════════════════════
//  ACRÉSCIMOS — ADMIN
// ══════════════════════════════════
function openAcrescimosAdmin(){
  openModal('modal-acrescimos-admin');
  renderAcrescimosAdmin();
}
function renderAcrescimosAdmin(){
  const list=document.getElementById('acrescimos-admin-list');
  list.innerHTML=ACRESCIMOS.map((a,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:8px;background:rgba(46,204,113,.04);border-radius:9px;border:1px solid rgba(46,204,113,.12);margin-bottom:6px;">
      <div style="flex:1;min-width:0;">
        <input type="text" value="${a.name}" data-idx="${i}" data-field="name"
          style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);padding:6px 8px;border-radius:7px;color:#fff;font-size:.78rem;outline:none;margin-bottom:4px;"
          placeholder="Nome do acréscimo">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:.68rem;color:#888;">R$</span>
          <input type="number" value="${a.price}" min="0" step="0.5" data-idx="${i}" data-field="price"
            style="width:80px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);padding:6px 8px;border-radius:7px;color:#fff;font-size:.78rem;outline:none;"
            placeholder="0">
        </div>
      </div>
      <button onclick="removeAcrescimoAdmin(${i})" style="background:rgba(231,29,54,.12);border:1px solid rgba(231,29,54,.2);color:var(--se);border-radius:7px;padding:6px 10px;font-size:.75rem;cursor:pointer;flex-shrink:0;">✕</button>
    </div>`).join('');
}
function addAcrescimoAdmin(){
  ACRESCIMOS.push({name:'Novo Acréscimo',price:5});
  renderAcrescimosAdmin();
}
function removeAcrescimoAdmin(i){
  ACRESCIMOS.splice(i,1);
  renderAcrescimosAdmin();
}
function salvarAcrescimos(){
  const inputs=document.querySelectorAll('#acrescimos-admin-list input');
  inputs.forEach(inp=>{
    const idx=parseInt(inp.dataset.idx);
    const field=inp.dataset.field;
    if(field==='name') ACRESCIMOS[idx].name=inp.value.trim()||ACRESCIMOS[idx].name;
    if(field==='price') ACRESCIMOS[idx].price=parseFloat(inp.value)||0;
  });
  DB.set('acrescimos_custom',ACRESCIMOS);
  closeModal('modal-acrescimos-admin');
  alert('✅ Acréscimos salvos!');
}
function restaurarAcrescimosPadrao(){
  if(!confirm('Restaurar acréscimos ao padrão?'))return;
  ACRESCIMOS=[...ACRESCIMOS_DEFAULT];
  DB.set('acrescimos_custom',null);
  renderAcrescimosAdmin();
}

// ══════════════════════════════════
//  BORDAS E ACRÉSCIMOS — ADMIN
// ══════════════════════════════════
function openBordasAdmin(){
  openModal('modal-bordas-admin');
  renderBordasAdmin();
}
function renderBordasAdmin(){
  const list=document.getElementById('bordas-admin-list');
  list.innerHTML=BORDAS.map((b,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:8px;background:rgba(255,255,255,.03);border-radius:9px;border:1px solid rgba(255,255,255,.06);margin-bottom:6px;">
      <div style="flex:1;min-width:0;">
        <input type="text" value="${b.name}" data-idx="${i}" data-field="name"
          style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);padding:6px 8px;border-radius:7px;color:#fff;font-size:.78rem;outline:none;margin-bottom:4px;"
          placeholder="Nome da borda/acréscimo">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:.68rem;color:#888;">R$</span>
          <input type="number" value="${b.price}" min="0" step="0.5" data-idx="${i}" data-field="price"
            style="width:80px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);padding:6px 8px;border-radius:7px;color:#fff;font-size:.78rem;outline:none;"
            placeholder="0">
          ${i===0?'<span style="font-size:.62rem;color:#555;">(grátis = padrão)</span>':''}
        </div>
      </div>
      ${i>0?`<button onclick="removeBordaAdmin(${i})" style="background:rgba(231,29,54,.12);border:1px solid rgba(231,29,54,.2);color:var(--se);border-radius:7px;padding:6px 10px;font-size:.75rem;cursor:pointer;flex-shrink:0;">✕</button>`:''}
    </div>`).join('');
}
function addBordaAdmin(){
  BORDAS.push({name:'Nova Borda',price:10});
  renderBordasAdmin();
}
function removeBordaAdmin(i){
  if(i===0)return;
  BORDAS.splice(i,1);
  renderBordasAdmin();
}
function salvarBordas(){
  const inputs=document.querySelectorAll('#bordas-admin-list input');
  inputs.forEach(inp=>{
    const idx=parseInt(inp.dataset.idx);
    const field=inp.dataset.field;
    if(field==='name') BORDAS[idx].name=inp.value.trim()||BORDAS[idx].name;
    if(field==='price') BORDAS[idx].price=parseFloat(inp.value)||0;
  });
  DB.set('bordas_custom',BORDAS);
  closeModal('modal-bordas-admin');
  // re-renderiza bordas nos cards do menu
  cart.forEach(it=>{
    if(it.selectedBorda&&it.selectedBorda.name){
      const updated=BORDAS.find(b=>b.name===it.selectedBorda.name);
      if(updated) it.selectedBorda=updated;
    }
  });
  updateUI();
  alert('✅ Bordas salvas!');
}
function restaurarBordasPadrao(){
  if(!confirm('Restaurar bordas ao padrão original?'))return;
  BORDAS=[...BORDAS_DEFAULT];
  DB.set('bordas_custom',null);
  renderBordasAdmin();
}

// ══════════════════════════════════
//  PAINEL CLIENTES ADMIN
// ══════════════════════════════════
async function openClientesAdmin(){
  openModal('modal-clientes-admin');
  const ct=document.getElementById('clientes-admin-content');
  ct.innerHTML=`<div style="text-align:center;padding:24px;color:#555;">⏳ Carregando...</div>`;
  const rows=await sg('clients',{orderBy:'last_visit',orderDir:'desc',limit:100})||[];
  const orders=await sg('orders',{limit:500})||[];
  if(!rows.length){
    ct.innerHTML=`<p style="color:#444;font-size:.82rem;text-align:center;padding:20px;">Nenhum cliente cadastrado ainda.<br>Aparecem aqui quando fazem login com Google.</p>`;
    return;
  }
  const totalPorEmail={};const pedidosPorEmail={};
  orders.forEach(o=>{const em=o.client_email||'';if(!em)return;totalPorEmail[em]=(totalPorEmail[em]||0)+Number(o.total||0);pedidosPorEmail[em]=(pedidosPorEmail[em]||0)+1;});
  window._clientesRows=rows;window._clientesOrders=orders;
  ct.innerHTML=`
    <input type="text" id="cli-search" class="m-input" placeholder="🔍 Buscar por nome ou email..." oninput="filtrarClientes()" style="margin-bottom:10px;">
    <div style="font-size:.65rem;color:#555;letter-spacing:2px;margin-bottom:8px;">${rows.length} CLIENTES</div>
    <div id="cli-list">
      ${rows.map(c=>{
        const total=totalPorEmail[c.email||'']||0;
        const nped=pedidosPorEmail[c.email||'']||0;
        const obs=DB.get('cli_obs_'+(c.email||''))||'';
        const aniv=DB.get('cli_aniv_'+(c.email||''))||c.birthday||'';
        return`<div style="cursor:pointer;border:1px solid rgba(255,255,255,.05);border-radius:10px;padding:10px;margin-bottom:6px;background:rgba(255,255,255,.02);display:flex;align-items:center;gap:10px;" onclick="abrirDetalheCliente('${(c.email||'').replace(/'/g,"\\'")}');" data-name="${(c.name||'').toLowerCase()}" data-email="${(c.email||'').toLowerCase()}">
          ${c.photo?`<img src="${c.photo}" onerror="this.style.display='none'" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid rgba(66,133,244,.4);flex-shrink:0;">`:`<div style="width:38px;height:38px;border-radius:50%;background:#222;display:flex;align-items:center;justify-content:center;font-size:.85rem;flex-shrink:0;color:#666;">G</div>`}
          <div style="flex:1;min-width:0;">
            <div style="font-size:.82rem;color:#fff;font-weight:600;">${c.name||'—'}</div>
            <div style="font-size:.65rem;color:#555;">${c.email||''}</div>
            <div style="display:flex;gap:8px;margin-top:3px;flex-wrap:wrap;">
              <span style="font-size:.62rem;color:#2ecc71;">R$\u00a0${fmtPrice(total)}</span>
              <span style="font-size:.62rem;color:#888;">${nped} pedido${nped!==1?'s':''}</span>
              ${aniv?`<span style="font-size:.62rem;color:var(--pr);">🎂 ${aniv}</span>`:''}
              ${obs?`<span style="font-size:.62rem;color:#555;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📝 ${obs}</span>`:''}
            </div>
          </div>
          <span style="font-size:.62rem;color:#333;flex-shrink:0;">${c.last_visit?new Date(c.last_visit).toLocaleDateString('pt-BR'):''}</span>
        </div>`;
      }).join('')}
    </div>`;
}
function filtrarClientes(){
  const q=(document.getElementById('cli-search')?.value||'').toLowerCase();
  document.querySelectorAll('#cli-list [data-name]').forEach(row=>{
    row.style.display=((row.dataset.name||'').includes(q)||(row.dataset.email||'').includes(q))?'flex':'none';
  });
}
async function abrirDetalheCliente(email){
  openModal('modal-cliente-detalhe');
  const ct=document.getElementById('cliente-detalhe-content');
  ct.innerHTML=`<div style="text-align:center;padding:20px;color:#555;">⏳ Carregando...</div>`;
  const rows=window._clientesRows||[];
  const allOrders=window._clientesOrders||[];
  const c=rows.find(r=>r.email===email);
  if(!c){ct.innerHTML='<p style="color:#555;text-align:center;">Cliente não encontrado.</p>';return;}
  const pedidos=allOrders.filter(o=>o.client_email===email).sort((a,b)=>dataStr(b.created_at).localeCompare(dataStr(a.created_at)));
  const totalGasto=pedidos.reduce((s,o)=>s+Number(o.total||0),0);
  const obs=DB.get('cli_obs_'+email)||'';
  const aniv=DB.get('cli_aniv_'+email)||c.birthday||'';
  const tel=DB.get('cli_tel_'+email)||c.phone||'';
  const pedidosHTML=pedidos.length
    ?pedidos.slice(0,20).map(o=>{let items=o.items_json||[];if(typeof items==='string'){try{items=JSON.parse(items);}catch{items=[];}}const nms=items.map(i=>i.name||i.n||'?').join(', ');return`<div style="background:rgba(255,255,255,.03);border-radius:8px;padding:9px 11px;margin-bottom:5px;"><div style="font-size:.62rem;color:#444;">${o.created_at?new Date(dataStr(o.created_at)).toLocaleString('pt-BR'):''}</div><div style="font-size:.75rem;color:#ccc;margin-top:2px;">${nms||'—'}</div><div style="display:flex;justify-content:space-between;margin-top:3px;"><span style="font-size:.68rem;color:#888;">${o.delivery_type==='retirada'?'🏠 Retirada':'🛵 Entrega'} · ${o.payment||'—'}</span><span style="font-size:.75rem;color:var(--pr);font-weight:700;">R$\u00a0${fmtPrice(o.total||0)}</span></div></div>`;}).join('')
    :'<p style="color:#444;font-size:.78rem;padding:8px 0;">Nenhum pedido registrado.</p>';
  ct.innerHTML=`
    <div style="text-align:center;margin-bottom:16px;">
      ${c.photo?`<img src="${c.photo}" style="width:64px;height:64px;border-radius:50%;border:3px solid rgba(66,133,244,.5);object-fit:cover;margin-bottom:8px;" onerror="this.style.display='none'">`:''}
      <div style="font-family:'Oswald',sans-serif;font-size:1.1rem;color:#fff;">${c.name||'—'}</div>
      <div style="font-size:.7rem;color:#555;margin-top:2px;">${c.email||''}</div>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:12px;flex-wrap:wrap;">
        <div style="text-align:center;"><div style="font-family:'Bangers',cursive;font-size:1.4rem;color:#2ecc71;">R$\u00a0${fmtPrice(totalGasto)}</div><div style="font-size:.58rem;color:#555;letter-spacing:1px;">TOTAL GASTO</div></div>
        <div style="text-align:center;"><div style="font-family:'Bangers',cursive;font-size:1.4rem;color:var(--pr);">${pedidos.length}</div><div style="font-size:.58rem;color:#555;letter-spacing:1px;">PEDIDOS</div></div>
        <div style="text-align:center;"><div style="font-family:'Bangers',cursive;font-size:1rem;color:#4285F4;">${c.last_visit?new Date(c.last_visit).toLocaleDateString('pt-BR'):'—'}</div><div style="font-size:.58rem;color:#555;letter-spacing:1px;">ÚLTIMA VISITA</div></div>
      </div>
    </div>
    <div style="font-size:.65rem;color:#555;letter-spacing:2px;margin-bottom:6px;">DADOS EDITÁVEIS</div>
    <div style="background:rgba(255,255,255,.03);border-radius:10px;padding:12px;margin-bottom:12px;">
      <div style="font-size:.72rem;color:#888;margin-bottom:4px;">📱 Telefone</div>
      <input type="tel" id="det-tel" class="m-input" value="${tel}" placeholder="(15) 99999-9999" style="margin-bottom:10px;">
      <div style="font-size:.72rem;color:#888;margin-bottom:4px;">🎂 Aniversário</div>
      <input type="date" id="det-aniv" class="m-input" value="${aniv}" style="margin-bottom:10px;">
      <div style="font-size:.72rem;color:#888;margin-bottom:4px;">📝 Observações (só o admin vê)</div>
      <textarea id="det-obs" class="m-input" rows="2" style="resize:none;" placeholder="Ex: cliente VIP, alergia...">${obs}</textarea>
    </div>
    <button class="m-btn" onclick="salvarDadosCliente('${email}')">💾 SALVAR</button>
    ${tel?`<a href="https://wa.me/55${tel.replace(/\D/g,'')}" target="_blank" style="display:block;margin-top:6px;text-align:center;background:rgba(37,211,102,.12);border:1px solid rgba(37,211,102,.3);color:#25d366;padding:11px;border-radius:10px;font-size:.82rem;font-weight:700;text-decoration:none;">💬 Abrir WhatsApp</a>`:''}
    <div id="det-save-msg" style="text-align:center;font-size:.75rem;margin-top:6px;display:none;color:#2ecc71;">✓ Salvo!</div>
    <div style="font-size:.65rem;color:#555;letter-spacing:2px;margin:16px 0 6px;">📋 HISTÓRICO (${pedidos.length})</div>
    ${pedidosHTML}`;
}
function salvarDadosCliente(email){
  DB.set('cli_tel_'+email,document.getElementById('det-tel')?.value||'');
  DB.set('cli_aniv_'+email,document.getElementById('det-aniv')?.value||'');
  DB.set('cli_obs_'+email,document.getElementById('det-obs')?.value||'');
  const msg=document.getElementById('det-save-msg');
  if(msg){msg.style.display='block';setTimeout(()=>msg.style.display='none',2000);}
  _initFB();if(FS)FS.collection('clients').doc(email).set({phone:DB.get('cli_tel_'+email),birthday:DB.get('cli_aniv_'+email),admin_obs:DB.get('cli_obs_'+email)},{merge:true}).catch(()=>{});
}

