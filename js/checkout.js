// ══════════════════════════════════
//  FINALIZAR — usa WhatsApp das configs + desconto
// ══════════════════════════════════
let _enviandoPedido=false;
async function finalizar(){
  // trava contra clique duplo/duplo toque — sem isso, dois cliques rápidos geram 2 pedidos
  // no Firestore pro mesmo carrinho (trackOrder grava antes do WhatsApp abrir).
  if(_enviandoPedido) return;
  const btnEnviar=document.getElementById('btn-enviar-pedido');
  const name=document.getElementById('u-name').value.trim();
  const tel=document.getElementById('u-tel').value.trim();
  const end=document.getElementById('u-end').value.trim();
  const num=document.getElementById('u-num').value.trim();
  const pay=document.getElementById('u-pay').value;
  const changeVal=document.getElementById('u-change').value;
  const isRet=document.getElementById('delivery-method').checked;

  // Limpa marcações de campo faltando de uma tentativa anterior
  ['u-name','u-tel','u-end','u-num','u-pay'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.style.borderColor='';
  });

  const faltando=[];
  if(!name) faltando.push('u-name');
  if(!tel) faltando.push('u-tel');
  if(!isRet&&!end) faltando.push('u-end');
  if(!isRet&&!num) faltando.push('u-num');
  if(!pay) faltando.push('u-pay');

  if(faltando.length){
    faltando.forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.style.borderColor='#e71d36';
    });
    const primeiro=document.getElementById(faltando[0]);
    if(primeiro){
      primeiro.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(()=>primeiro.focus(),300);
    }
    return;
  }

  _enviandoPedido=true;
  if(btnEnviar){ btnEnviar.disabled=true; btnEnviar.dataset.textoOriginal=btnEnviar.textContent; btnEnviar.textContent='⏳ ENVIANDO...'; }

  try{

  currentUser={name,address:end,houseNum:num,phone:tel};
  DB.set('client',currentUser);loadClientBadge();

  let total=0;
  cart.forEach(it=>{
    const acrTotal=(it.addedIngredients||[]).reduce((s,a)=>s+a.price,0);
    total+=Number(it.p)+(it.selectedBorda?.price||0)+acrTotal;
  });
  const desc=calcDesconto(cart);
  total=Math.max(0,total-desc);
  const fee=isRet?0:8;
  const totalFinal=total+fee;

  trackOrder(cart,{name,address:end,num,pay,phone:tel,
    change:changeVal?parseFloat(changeVal):null,
    type:isRet?'retirada':'entrega',total:totalFinal});

  const frete=isRet?'🏠 *RETIRADA NO LOCAL* (Grátis - 20min)':`🛵 *ENTREGA:* R$ 8,00`;

  let troco='';
  if(pay==='Dinheiro')troco=changeVal?`%0A💵 *Troco para:* R$ ${fmtPrice(parseFloat(changeVal))}`:
    `%0A💵 *Troco:* NÃO NECESSITA`;

  const agora=new Date();
  const dt=`${String(agora.getDate()).padStart(2,'0')}/${String(agora.getMonth()+1).padStart(2,'0')}/${agora.getFullYear()}`;
  const hr=`${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;

  const resumo=cart.map(it=>{
    let txt=`*• ${it.n}*%0A  💰 R$ ${fmtPrice(it.p)}`;
    if(it.selectedBorda?.price>0)txt+=`%0A  🥖 Borda: ${it.selectedBorda.name} (+R$ ${fmtPrice(it.selectedBorda.price)})`;
    if(it.addedIngredients?.length>0)txt+=`%0A  ➕ Acréscimos: ${it.addedIngredients.map(a=>a.name+' (+R$'+fmtPrice(a.price)+')').join(', ')}`;
    if(it.removedIngredients?.length>0)txt+=`%0A  🚫 Sem: ${it.removedIngredients.join(', ')}`;
    return txt;
  }).join('%0A%0A');

  const promoAtiva=getPromoAtiva();
  const promoLinha=desc>0?`%0A🎉 *${promoAtiva.nome}:* −R$ ${fmtPrice(desc)}`:'';

  let msg=`🛎️ *NOVO PEDIDO - SITE OFICIAL*%0A`+
    `📅 ${dt} às ${hr}%0A`+
    `${'─'.repeat(28)}%0A%0A`+
    `👤 *Cliente:* ${encodeURIComponent(name)}%0A%0A`+
    `🍕 *PEDIDO:*%0A%0A${resumo}%0A%0A`+
    `${'─'.repeat(28)}%0A%0A`;
  if(!isRet)msg+=`📍 *ENDEREÇO:* ${encodeURIComponent(end)}, nº ${encodeURIComponent(num)}%0A%0A`;
  msg+=`💳 *PAGAMENTO:* ${pay}${troco}%0A`+
    `🚚 ${frete}${promoLinha}%0A%0A`+
    `💰 *TOTAL: R$ ${fmtPrice(totalFinal)}*%0A`+
    `${'─'.repeat(28)}%0A`+
    `_Pedido via site oficial._`;

  // CIRURGIA: usa número das configs
  window.open(`https://wa.me/${getWhatsApp()}?text=${msg}`);

  }catch(e){
    console.error('Erro ao enviar pedido:',e);
    alert('Não foi possível registrar o pedido agora. Confira sua conexão e tente enviar de novo.');
  }finally{
    _enviandoPedido=false;
    if(btnEnviar){ btnEnviar.disabled=false; btnEnviar.textContent=btnEnviar.dataset.textoOriginal||'📲 ENVIAR PEDIDO PELO WHATSAPP'; }
  }
}

// ══════════════════════════════════
//  CLIENT SESSION
// ══════════════════════════════════
function loadClientBadge(){
  currentUser=DB.get('client');
  const nd=document.getElementById('client-name-drawer');
  if(currentUser?.name){
    nd.style.display='block';
    const fotoMini=currentUser.fb_photo
      ?`<img src="${currentUser.fb_photo}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;border:1px solid var(--pr);vertical-align:middle;margin-right:6px;" onerror="this.style.display='none'">`
      :'';
    nd.innerHTML=fotoMini+currentUser.name.split(' ')[0].toUpperCase();
    const last=DB.get('last_order');
    const banner=document.getElementById('last-order-banner');
    if(last){banner.style.display='block';document.getElementById('lo-text').innerText=`${last.text} — ${last.date}`;}
  } else {
    nd.style.display='none';
  }
}

function openClientModal(){
  const flavors=DB.get('flavors')||[];
  const uniq=[...new Set(flavors)].slice(0,6);
  const ct=document.getElementById('client-content');
  if(currentUser?.name){
    const fotoHTML=currentUser.fb_photo
      ?`<div style="text-align:center;margin-bottom:14px;">
          <img src="${currentUser.fb_photo}" style="width:64px;height:64px;border-radius:50%;border:2px solid var(--pr);object-fit:cover;" onerror="this.style.display='none'">
          ${currentUser.via_facebook?`<div style="margin-top:6px;"><span class="fb-badge-fb">${G_SVG} via Google</span></div>`:''}
        </div>`:'';
    ct.innerHTML=`
      ${fotoHTML}
      <p style="color:#aaa;font-size:.82rem;margin-bottom:14px;text-align:center;">Olá, <b style="color:var(--pr)">${currentUser.name.split(' ')[0]}</b>! Seus dados estão salvos.</p>
      ${uniq.length?`<div style="margin-bottom:14px;"><div style="font-size:.65rem;color:#555;letter-spacing:2px;margin-bottom:6px;">ÚLTIMOS SABORES</div>${uniq.map(f=>`<span class="fl-tag">${f}</span>`).join('')}</div>`:''}
      <input type="text" class="m-input" id="cl-name" value="${currentUser.name}" placeholder="Nome">
      <input type="tel" class="m-input" id="cl-tel" value="${currentUser.phone||''}" placeholder="Telefone/WhatsApp">
      <input type="text" class="m-input" id="cl-addr" value="${currentUser.address||''}" placeholder="Endereço">
      <input type="text" class="m-input" id="cl-num" value="${currentUser.houseNum||''}" placeholder="Número">
      <button class="m-btn" onclick="saveClientData()">SALVAR</button>
      <button class="m-btn-sec" style="margin-top:4px;" onclick="openHistorico();closeModal('modal-client')">🕒 Ver Histórico de Pedidos</button>
      <button class="m-btn-sec" onclick="logoutClient()" style="margin-top:4px;">Sair da conta</button>`;
  } else {
    ct.innerHTML=`
      <p style="color:#aaa;font-size:.82rem;margin-bottom:14px;text-align:center;">Entre com o Google para salvar seus dados e ter histórico de pedidos!</p>
      <button class="ggl-login-btn" id="cl-fb-btn" onclick="loginGoogleClient()">
        <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Entrar com Google
      </button>
      <div style="text-align:center;font-size:.68rem;color:#444;margin:8px 0;">— ou preencha manualmente —</div>
      <input type="text" class="m-input" id="cl-name" placeholder="Nome completo">
      <input type="tel" class="m-input" id="cl-tel" placeholder="Telefone/WhatsApp">
      <input type="text" class="m-input" id="cl-addr" placeholder="Endereço de entrega">
      <input type="text" class="m-input" id="cl-num" placeholder="Número da casa">
      <button class="m-btn" onclick="saveClientData()">SALVAR E ENTRAR</button>`;
  }
  openModal('modal-client');
}
function saveClientData(){
  const name=document.getElementById('cl-name')?.value?.trim();
  if(!name)return alert('Informe seu nome.');
  currentUser={name,address:document.getElementById('cl-addr')?.value||'',houseNum:document.getElementById('cl-num')?.value||'',phone:document.getElementById('cl-tel')?.value||''};
  DB.set('client',currentUser);closeModal('modal-client');loadClientBadge();updateUI();
}
function logoutClient(){
  currentUser=null;fbUser=null;
  DB.set('client',null);DB.set('google_user',null);
  // esconde drawer profile
  const dp=document.getElementById('drawer-profile');
  if(dp) dp.style.display='none';
  if(typeof google!=='undefined') google.accounts.id.disableAutoSelect();
  _initFB();if(AUTH)AUTH.signOut().catch(()=>{});
  closeModal('modal-client');loadClientBadge();
}

