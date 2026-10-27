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
    const box=document.getElementById('pay-chips'); if(box&&faltando.includes('u-pay')) box.classList.add('erro');
    const primeiro=faltando[0]==='u-pay'?box:document.getElementById(faltando[0]);
    if(primeiro){
      primeiro.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(()=>primeiro.focus(),300);
    }
    return;
  }

  _enviandoPedido=true;
  if(btnEnviar){ btnEnviar.disabled=true; btnEnviar.dataset.textoOriginal=btnEnviar.textContent; btnEnviar.textContent='⏳ ENVIANDO...'; }

  try{

  currentUser={...(currentUser||{}),name,address:end,houseNum:num,phone:tel};
  DB.set('client',currentUser);loadClientBadge();

  let total=0;
  cart.forEach(it=>{
    const acrTotal=(it.addedIngredients||[]).reduce((s,a)=>s+a.price,0);
    total+=Number(it.p)+(it.selectedBorda?.price||0)+acrTotal;
  });
  const desc=calcDesconto(cart);
  total=Math.max(0,total-desc);
  const gratis=!isRet&&entregaGratis(cart);
  const fee=(isRet||gratis)?0:8;
  const totalFinal=total+fee;

  trackOrder(cart,{name,address:end,num,pay,phone:tel,
    change:changeVal?parseFloat(changeVal):null,
    type:isRet?'retirada':'entrega',total:totalFinal,taxa:fee});

  const frete=isRet?'🏠 *RETIRADA NO LOCAL* (Grátis - 20min)':(gratis?`🛵 *ENTREGA GRÁTIS* 🎁 (3+ pizzas ou 3+ combos)`:`🛵 *ENTREGA:* R$ 8,00`);

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
    `👤 *Cliente:* ${encodeURIComponent(name)}%0A`+
    `📞 *Telefone:* ${encodeURIComponent(tel)}%0A%0A`+
    `🍕 *PEDIDO:*%0A%0A${resumo}%0A%0A`+
    `${'─'.repeat(28)}%0A%0A`;
  if(!isRet)msg+=`📍 *ENDEREÇO:* ${encodeURIComponent(end)}, nº ${encodeURIComponent(num)}%0A%0A`;
  msg+=`💳 *PAGAMENTO:* ${pay}${troco}%0A`+
    `🚚 ${frete}${promoLinha}%0A%0A`+
    `💰 *TOTAL: R$ ${fmtPrice(totalFinal)}*%0A`+
    `${'─'.repeat(28)}%0A`+
    `_Pedido via site oficial._`;

  // CIRURGIA: usa número das configs
  const waUrl=`https://wa.me/${getWhatsApp()}?text=${msg}`;
  window.open(waUrl);

  // o pedido já foi gravado (trackOrder) e o WhatsApp abriu: esvazia o carrinho e mostra a confirmação,
  // assim o cliente sabe que acabou e não fica com o pedido "aberto" (nem reenvia sem querer)
  const itensEnviados=cart.length;
  cart=[]; firstHalf=null;
  try{ updateUI(); }catch(e){}
  const cb=document.getElementById('cart-body'); if(cb) cb.style.display='none';
  const ch=document.getElementById('cart-hint'); if(ch) ch.innerText='▲ VER MEU PEDIDO';
  mostrarPedidoEnviado({name,total:totalFinal,isRet,waUrl,itens:itensEnviados});

  }catch(e){
    console.error('Erro ao enviar pedido:',e);
    alert('Não foi possível registrar o pedido agora. Confira sua conexão e tente enviar de novo.');
  }finally{
    _enviandoPedido=false;
    if(btnEnviar){ btnEnviar.disabled=false; btnEnviar.textContent=btnEnviar.dataset.textoOriginal||'📲 ENVIAR PEDIDO PELO WHATSAPP'; }
  }
}

// ══════════════════════════════════
//  CONFIRMAÇÃO — "Pedido enviado!" depois de mandar pelo WhatsApp
// ══════════════════════════════════
function mostrarPedidoEnviado(d){
  let o=document.getElementById('pedido-enviado'); if(o) o.remove();
  o=document.createElement('div'); o.id='pedido-enviado'; o.className='pe-ov'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Pedido enviado');
  const primeiro=String(d.name||'').split(' ')[0];
  o.innerHTML='<div class="pe-caixa"><div class="pe-ok">✓</div><h2>Pedido enviado!</h2>'+
    '<p class="pe-sub">'+(primeiro?'Obrigado, <b>'+primeiro.replace(/[<>&]/g,'')+'</b>! ':'')+'Já recebemos o seu pedido.</p>'+
    '<div class="pe-info"><span>Total</span><b>R$ '+fmtPrice(d.total)+'</b></div>'+
    '<div class="pe-info"><span>'+(d.isRet?'Retirada no local':'Entrega')+'</span><b>'+(d.isRet?'cerca de 20 min':'até 50 min')+'</b></div>'+
    '<p class="pe-dica">⚠️ No WhatsApp, toque em <b>enviar</b> na mensagem que abriu para confirmar com a gente.</p>'+
    '<a class="pe-wa" href="'+d.waUrl+'" target="_blank" rel="noopener">💬 Abrir o WhatsApp de novo</a>'+
    '<button type="button" class="pe-fechar" onclick="fecharPedidoEnviado()">Voltar ao cardápio</button></div>';
  document.body.appendChild(o);
  requestAnimationFrame(()=>o.classList.add('on'));
}
function fecharPedidoEnviado(){ const o=document.getElementById('pedido-enviado'); if(!o) return; o.classList.remove('on'); setTimeout(()=>o.remove(),250); window.scrollTo({top:0,behavior:'smooth'}); }

// ══════════════════════════════════
//  CLIENT SESSION
// ══════════════════════════════════
function loadClientBadge(){
  currentUser=DB.get('client');
  const nd=document.getElementById('client-name-drawer');
  if(currentUser?.name){
    nd.style.display='block';
    nd.innerHTML=currentUser.name.split(' ')[0].toUpperCase();
    const last=DB.get('last_order');
    const banner=document.getElementById('last-order-banner');
    if(last){banner.style.display='block';document.getElementById('lo-text').innerText=last.text;document.getElementById('lo-date').innerText=last.date||'';}
  } else {
    nd.style.display='none';
  }
}

function openClientModal(){
  if(!clienteLogado()){ abrirEntrar(); return; }
  const flavors=DB.get('flavors')||[];
  const uniq=[...new Set(flavors)].slice(0,6);
  const ct=document.getElementById('client-content');
  ct.innerHTML=`
    <p style="color:var(--tx-3);font-size:.9rem;margin-bottom:14px;text-align:center;">Olá, <b style="color:var(--pr)">${currentUser.name.split(' ')[0]}</b>! Seus dados estão salvos neste aparelho.</p>
    ${uniq.length?`<div style="margin-bottom:14px;"><div style="font-size:.78rem;color:var(--tx-4);letter-spacing:2px;margin-bottom:6px;">ÚLTIMOS SABORES</div>${uniq.map(f=>`<span class="fl-tag">${f}</span>`).join('')}</div>`:''}
    <input type="text" class="m-input" id="cl-name" value="${currentUser.name}" placeholder="Nome">
    <input type="tel" class="m-input" id="cl-tel" value="${_mascaraTel(currentUser.phone||'')}" placeholder="WhatsApp com DDD" inputmode="tel">
    <input type="text" class="m-input" id="cl-addr" value="${currentUser.address||''}" placeholder="Endereço">
    <input type="text" class="m-input" id="cl-num" value="${currentUser.houseNum||''}" placeholder="Número">
    <button class="m-btn" onclick="saveClientData()">SALVAR</button>
    <button class="m-btn-sec" style="margin-top:4px;" onclick="openHistorico();closeModal('modal-client')">🕒 Ver Histórico de Pedidos</button>
    <button class="m-btn-sec" onclick="logoutClient()" style="margin-top:4px;">Sair da conta</button>`;
  openModal('modal-client');
}
function saveClientData(){
  const name=document.getElementById('cl-name')?.value?.trim();
  if(!name)return alert('Informe seu nome.');
  const tel=_telDigitos(document.getElementById('cl-tel')?.value);
  if(!/^[1-9][1-9](9\d{8}|[2-5]\d{7})$/.test(tel))return alert('Digite o WhatsApp com DDD. Ex.: (15) 99705-8390');
  currentUser={name,address:document.getElementById('cl-addr')?.value||'',houseNum:document.getElementById('cl-num')?.value||'',phone:tel,logado:true};
  DB.set('client',currentUser);closeModal('modal-client');aplicarSessaoCliente();updateUI();
  fetch('/api/cliente',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome:name,telefone:tel})}).catch(()=>{});
}
function logoutClient(){
  currentUser=null;
  DB.set('client',null);DB.set('google_user',null);
  closeModal('modal-client');aplicarSessaoCliente();
}
