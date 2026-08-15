// ══════════════════════════════════════════════════════════
//  NOTIFICAÇÃO DE PEDIDO NOVO (vindo da Loja) — balão puxável
//  Ao confirmar, o pedido é carregado no carrinho pronto pra finalizar.
//  finalizarVenda() ATUALIZA esse mesmo pedido (não cria um segundo).
// ══════════════════════════════════════════════════════════
let _idsVistos=null; // null = ainda não fez a primeira leitura
let _idsVistosAtendente=null;
let filaNotificacoes=[];
let notificacaoAtual=null;

function tocarSom(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    [0,.25,.5].forEach((t,i)=>{
      const o=ctx.createOscillator();
      const g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.frequency.setValueAtTime(i===1?1200:1000,ctx.currentTime+t);
      g.gain.setValueAtTime(1.0,ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+t+.22);
      o.start(ctx.currentTime+t);
      o.stop(ctx.currentTime+t+.22);
    });
  }catch(e){}
}

// ── Alerta grande de impressora desconectada ──
let _alertaImpressoraAtivo=false;
function mostrarAlertaImpressora(){
  const b=document.getElementById('printer-alert-banner');
  if(b) b.style.display='flex';
  if(!_alertaImpressoraAtivo){
    _alertaImpressoraAtivo=true;
    tocarSomAlerta();
  }
}
function esconderAlertaImpressora(){
  const b=document.getElementById('printer-alert-banner');
  if(b) b.style.display='none';
  _alertaImpressoraAtivo=false;
}
function tocarSomAlerta(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    [0,.35,.7,1.05].forEach((t)=>{
      const o=ctx.createOscillator();
      const g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.frequency.setValueAtTime(700,ctx.currentTime+t);
      g.gain.setValueAtTime(1.0,ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+t+.3);
      o.start(ctx.currentTime+t);
      o.stop(ctx.currentTime+t+.3);
    });
  }catch(e){}
}
async function tentarReconectarImpressora(){
  await reconectarUSBAuto();
  await reconectarImpressoraAuto();
}

function iniciarEscutaNotificacoes(){
  if(!FS) return;
  // pedidos novos (loja, conversor, bot fechou o pedido)
  FS.collection('orders').orderBy('created_at','desc').limit(30).onSnapshot(snap=>{
    const atuais=snap.docs.map(d=>({id:d.id,tipo:'pedido',...d.data()}));
    if(_idsVistos===null){
      _idsVistos=new Set(atuais.map(o=>o.id));
      // pedidos que já estavam pendentes antes de abrir a tela também entram na fila (sem tocar som)
      atuais.forEach(o=>{
        const ehDaLoja = o.origem!=='caixa' && (o.status==='novo'||!o.status);
        if(ehDaLoja) filaNotificacoes.push(o);
      });
      if(!notificacaoAtual && filaNotificacoes.length>0) prepararNotificacao();
      return;
    }
    let chegouNovo=false;
    atuais.forEach(o=>{
      if(_idsVistos.has(o.id)) return;
      _idsVistos.add(o.id);
      const ehDaLoja = o.origem!=='caixa' && (o.status==='novo'||!o.status);
      if(!ehDaLoja) return;
      // pedido do site ou do bot + impressora conectada aqui no caixa → imprime e finaliza sozinho
      if((o.origem==='whatsapp_bot'||o.origem==='loja') && (btChar||usbEndpointOut)){
        finalizarPedidoAutomaticoBot(o);
      }else{
        filaNotificacoes.push(o); chegouNovo=true;
        if((o.origem==='whatsapp_bot'||o.origem==='loja') && !btChar && !usbEndpointOut) mostrarAlertaImpressora();
      }
    });
    if(chegouNovo) tocarSom();
    if(!notificacaoAtual && filaNotificacoes.length>0) prepararNotificacao();
    else atualizarBadgeBubble();
  },err=>console.warn('Notificação de pedidos indisponível (verifique a conexão).',err));

  // bot pediu pra chamar a atendente (cliente pediu, reclamou, ou caso complicado)
  FS.collection('bot_conversas').where('estado','==','aguardando_atendente').onSnapshot(snap=>{
    const atuais=snap.docs.map(d=>({id:d.id,tipo:'atendente',telefone:d.data().telefone||d.id,...d.data()}));
    if(_idsVistosAtendente===null){
      _idsVistosAtendente=new Set(atuais.map(o=>o.id));
      return;
    }
    let chegouNovo=false;
    atuais.forEach(o=>{
      if(_idsVistosAtendente.has(o.id)) return;
      _idsVistosAtendente.add(o.id);
      filaNotificacoes.push(o);
      chegouNovo=true;
    });
    if(chegouNovo) tocarSom();
    if(!notificacaoAtual && filaNotificacoes.length>0) prepararNotificacao();
    else atualizarBadgeBubble();
  },err=>console.warn('Notificação de atendente indisponível (verifique a conexão).',err));
}

async function finalizarPedidoAutomaticoBot(pedido){
  try{
    await imprimirBluetooth(formatarCupom(pedido));
    if(FS && pedido.id){
      await FS.collection('orders').doc(pedido.id).update({status:'finalizado'});
    }
    tocarSom();
  }catch(e){
    console.warn('Falha ao finalizar pedido do bot automaticamente, caiu na notificação manual.',e);
    filaNotificacoes.push(pedido);
    atualizarBadgeBubble();
    mostrarAlertaImpressora();
  }
}

function atualizarBadgeBubble(){
  const total = filaNotificacoes.length + (notificacaoAtual?1:0);
  const bubble = document.getElementById('notif-bubble');
  const badge = document.getElementById('notif-bubble-badge');
  if(!bubble||!badge) return;
  badge.textContent = total;
  bubble.classList.toggle('show', total>0);
}

function prepararNotificacao(){
  if(!notificacaoAtual) notificacaoAtual=filaNotificacoes.shift();
  if(!notificacaoAtual) return;
  const filaTxt = filaNotificacoes.length>0 ? ' (+'+filaNotificacoes.length+' na fila)' : '';
  if(notificacaoAtual.tipo==='atendente'){
    document.getElementById('notif-icone').textContent='🙋';
    document.getElementById('notif-titulo').textContent='Cliente pediu atendente!'+filaTxt;
    document.getElementById('notif-sub').textContent='WhatsApp: '+(notificacaoAtual.telefone||'—');
    document.getElementById('notif-total').textContent='';
    document.getElementById('notif-btn-primario').textContent='💬 Abrir conversa';
    document.getElementById('notif-btn-secundario').textContent='✔ Já resolvi';
  }else{
    document.getElementById('notif-icone').textContent='🍕';
    document.getElementById('notif-titulo').textContent = (notificacaoAtual.numero_sequencial?'Pedido #'+notificacaoAtual.numero_sequencial+' novo!':'Novo pedido!')+filaTxt;
    document.getElementById('notif-sub').textContent=(notificacaoAtual.client_name||'Cliente')+' · '+(notificacaoAtual.delivery_type||'—');
    document.getElementById('notif-total').textContent=fmt(notificacaoAtual.total);
    document.getElementById('notif-btn-primario').textContent='✔ Confirmar e montar no caixa';
    document.getElementById('notif-btn-secundario').textContent='✕ Cancelar pedido';
  }
  atualizarBadgeBubble();
}
function abrirNotifCaixa(){
  if(!notificacaoAtual) prepararNotificacao();
  if(!notificacaoAtual) return;
  const el=document.getElementById('notif-caixa');
  el.style.transform='';
  el.classList.add('show');
  document.getElementById('notif-bubble').classList.remove('show');
}
function dispensarNotifCaixa(){
  document.getElementById('notif-caixa').classList.remove('show');
  notificacaoAtual=null;
  atualizarBadgeBubble();
  setTimeout(()=>{ prepararNotificacao(); },400);
}
function acaoPrimariaNotif(){
  if(!notificacaoAtual) return;
  if(notificacaoAtual.tipo==='atendente') abrirConversaAtendente();
  else confirmarPedidoNotificacao();
}
function acaoSecundariaNotif(){
  if(!notificacaoAtual) return;
  if(notificacaoAtual.tipo==='atendente') marcarAtendenteResolvido();
  else cancelarPedidoNotificacao();
}
function abrirConversaAtendente(){
  if(!notificacaoAtual) return;
  window.location.href='bot-config/conversas/index.html';
}
async function marcarAtendenteResolvido(){
  if(!notificacaoAtual || !FS) return;
  try{ await FS.collection('bot_conversas').doc(notificacaoAtual.id).update({estado:'assumido_humano'}); }
  catch(e){ console.warn('Erro ao marcar como resolvido:',e); }
  dispensarNotifCaixa();
}
function cancelarPedidoNotificacao(){
  if(!notificacaoAtual) return;
  if(FS && notificacaoAtual.id){
    FS.collection('orders').doc(notificacaoAtual.id).update({status:'cancelado'}).catch(e=>console.warn('Erro ao cancelar pedido:',e));
  }
  dispensarNotifCaixa();
}
function confirmarPedidoNotificacao(){
  if(!notificacaoAtual) return;
  const p=notificacaoAtual;
  let itens=p.items_json||[];
  if(typeof itens==='string'){ try{itens=JSON.parse(itens);}catch(e){itens=[];} }
  if(!Array.isArray(itens)) itens=[];
  cart=[];
  itens.forEach(i=>{
    const nome=i.name||i.nome||i.item||'Item sem nome';
    const borda=i.borda||null;
    const removedIng=i.removed||i.removidos||[];
    const addedIng=i.added||i.adicionados||[];
    const qty=Number(i.qty??i.quantidade??i.qtd)||1;
    // chave SEM aleatoriedade: itens idênticos (mesmo nome/borda/removidos/acréscimos) se juntam
    // numa única linha com a quantidade somada, em vez de aparecerem como várias linhas de "1x"
    // separadas — isso é o que causava pizza igual "sumindo" da contagem visual no caixa.
    const chave='notif-'+(i.id||nome)+'|'+borda+'|'+removedIng.slice().sort().join(',')+'|'+addedIng.slice().sort().join(',');
    const existente=cart.find(c=>c._chave===chave);
    if(existente){
      existente.qty+=qty;
    }else{
      cart.push({
        _chave:chave,
        id:i.id||null,
        name:nome,
        unitPrice:Number(i.price??i.preco??i.valor)||0,
        qty,
        borda,
        removedIng,
        addedIng,
        isMeia:!!(i.isMeia??i.meia)
      });
    }
  });
  if(cart.length===0){
    alert('⚠️ Este pedido veio sem itens legíveis (formato inesperado). Verifique o pedido original no WhatsApp/painel do bot antes de montar manualmente.');
  }
  document.getElementById('f-nome').value=p.client_name||'';
  document.getElementById('f-tel').value=p.client_phone||'';
  document.getElementById('f-tipo').value=p.delivery_type||'retirada';
  document.getElementById('f-endereco-colado').value=p.address||'';
  alternarCampoEntregador();
  pedidoEmEdicaoId=p.id;

  atualizarBarraCarrinho();
  dispensarNotifCaixa();
  openCartModal();
}

