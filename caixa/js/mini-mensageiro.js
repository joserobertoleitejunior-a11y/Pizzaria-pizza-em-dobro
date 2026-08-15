// ══════════════════════════════════════════════════════════
//  MINI MESSENGER — conversas do bot, direto aqui no caixa
// ══════════════════════════════════════════════════════════
let _mmListaUnsub=null, _mmThreadUnsub=null;
let _mmTelefoneAtual=null;

function toggleMiniMessenger(){
  const painel=document.getElementById('mini-messenger');
  const abrindo=!painel.classList.contains('show');
  painel.classList.toggle('show');
  if(abrindo){ voltarListaMM(); carregarListaMM(); }
  else{ if(_mmListaUnsub){_mmListaUnsub();_mmListaUnsub=null;} if(_mmThreadUnsub){_mmThreadUnsub();_mmThreadUnsub=null;} }
}

function carregarListaMM(){
  if(!FS) return;
  if(_mmListaUnsub) _mmListaUnsub();
  _mmListaUnsub=FS.collection('bot_conversas').orderBy('ultimaMensagemEm','desc').limit(30).onSnapshot(snap=>{
    const box=document.getElementById('mm-lista');
    if(snap.empty){ box.innerHTML='<div style="color:var(--sub);text-align:center;padding:20px 0;font-size:.8rem;">Nenhuma conversa ainda.</div>'; return; }
    const estadoTxt={novo:'Novo',montando_pedido:'Montando pedido',aguardando_confirmacao:'Aguardando confirmação',
      aguardando_atendente:'🙋 Quer atendente',fechado:'Fechado',assumido_humano:'🤖 Bot desligado aqui'};
    box.innerHTML='';
    snap.forEach(doc=>{
      const c=doc.data();
      const div=document.createElement('div');
      div.className='mm-conv-item';
      div.onclick=()=>abrirThreadMM(doc.id);
      div.innerHTML=`<div class="tel">${c.nomeCliente?c.nomeCliente+' · ':''}${c.telefone||doc.id}</div><div class="est">${estadoTxt[c.estado]||c.estado||'—'}</div>`;
      box.appendChild(div);
    });
  },err=>console.warn('Erro ao carregar conversas do bot:',err));
}

function abrirThreadMM(telefone){
  _mmTelefoneAtual=telefone;
  document.getElementById('mm-titulo').textContent='← '+telefone;
  document.getElementById('mm-titulo').onclick=voltarListaMM;
  document.getElementById('mm-editar-nome').style.display='inline';
  document.getElementById('mm-lista').style.display='none';
  document.getElementById('mm-thread').style.display='block';
  document.getElementById('mm-thread-acoes').style.display='block';
  if(_mmThreadUnsub) _mmThreadUnsub();
  const convRef=FS.collection('bot_conversas').doc(telefone);
  convRef.get().then(doc=>{
    const estado=doc.exists?doc.data().estado:null;
    document.getElementById('mm-btn-bot').textContent=estado==='assumido_humano'?'🤖 Ligar bot de novo aqui':'🤖 Desligar bot aqui';
    const precisaReiniciar = estado==='fechado' || estado==='aguardando_atendente' || estado==='assumido_humano';
    document.getElementById('mm-btn-reiniciar').style.display = precisaReiniciar ? 'block' : 'none';
    const nome=doc.exists?doc.data().nomeCliente:null;
    document.getElementById('mm-titulo').textContent='← '+(nome?nome+' ('+telefone+')':telefone);
  });
  _mmThreadUnsub=convRef.collection('mensagens').orderBy('timestamp','asc').limit(200).onSnapshot(snap=>{
    const box=document.getElementById('mm-thread-msgs');
    box.innerHTML='';
    snap.forEach(d=>{
      const m=d.data();
      const div=document.createElement('div');
      div.className='mm-msg '+(m.remetente||'cliente');
      div.textContent=m.texto||'';
      box.appendChild(div);
    });
    box.scrollTop=box.scrollHeight;
  });
}

function voltarListaMM(){
  _mmTelefoneAtual=null;
  document.getElementById('mm-titulo').textContent='Conversas do Bot';
  document.getElementById('mm-titulo').onclick=null;
  document.getElementById('mm-editar-nome').style.display='none';
  document.getElementById('mm-btn-reiniciar').style.display='none';
  document.getElementById('mm-lista').style.display='block';
  document.getElementById('mm-thread').style.display='none';
  document.getElementById('mm-thread-acoes').style.display='none';
  if(_mmThreadUnsub){ _mmThreadUnsub(); _mmThreadUnsub=null; }
}

async function editarNomeConversaMM(){
  if(!_mmTelefoneAtual||!FS) return;
  const doc=await FS.collection('bot_conversas').doc(_mmTelefoneAtual).get();
  const nomeAtual=doc.exists?(doc.data().nomeCliente||''):'';
  const novoNome=prompt('Nome do cliente:',nomeAtual);
  if(novoNome===null) return;
  try{
    await FS.collection('bot_conversas').doc(_mmTelefoneAtual).set({nomeCliente:novoNome.trim()},{merge:true});
    document.getElementById('mm-titulo').textContent='← '+(novoNome.trim()?novoNome.trim()+' ('+_mmTelefoneAtual+')':_mmTelefoneAtual);
  }catch(e){ alert('Não foi possível salvar o nome.'); }
}

async function reiniciarConversaMM(){
  if(!_mmTelefoneAtual||!FS) return;
  try{
    await FS.collection('bot_conversas').doc(_mmTelefoneAtual).set({estado:'montando_pedido',lembreteEnviado:false},{merge:true});
    document.getElementById('mm-btn-reiniciar').style.display='none';
    document.getElementById('mm-btn-bot').textContent='🤖 Desligar bot aqui';
    alert('Conversa reiniciada — o bot já volta a responder esse cliente.');
  }catch(e){ alert('Não foi possível reiniciar a conversa.'); }
}

async function alternarBotConversa(){
  if(!_mmTelefoneAtual||!FS) return;
  const ref=FS.collection('bot_conversas').doc(_mmTelefoneAtual);
  const doc=await ref.get();
  const estadoAtual=doc.exists?doc.data().estado:null;
  const ligarDeVolta=estadoAtual==='assumido_humano';
  await ref.set({estado: ligarDeVolta?'montando_pedido':'assumido_humano'},{merge:true});
  document.getElementById('mm-btn-bot').textContent=ligarDeVolta?'🤖 Desligar bot aqui':'🤖 Ligar bot de novo aqui';
}

async function enviarMensagemAtendente(){
  const input=document.getElementById('mm-input');
  const texto=input.value.trim();
  if(!texto||!_mmTelefoneAtual) return;
  input.value='';
  try{
    // chave da Evolution API agora fica só no servidor (netlify/functions/send-whatsapp.js) — nunca mais exposta aqui
    const r=await fetch('/.netlify/functions/send-whatsapp',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({telefone:_mmTelefoneAtual,texto})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.error) throw new Error(d.error||'Falha ao enviar');
    await FS.collection('bot_conversas').doc(_mmTelefoneAtual).collection('mensagens').add({
      remetente:'atendente',texto,timestamp:firebase.firestore.FieldValue.serverTimestamp()
    });
    await FS.collection('bot_conversas').doc(_mmTelefoneAtual).set({ultimaMensagemEm:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  }catch(e){ alert('Não foi possível enviar a mensagem.'); console.warn(e); }
}

// ── ESCONDER TOPO AO ROLAR A PÁGINA (reaparece ao rolar pra cima) ──
(function(){
  const topo=document.getElementById('topo-colapsavel');
  if(!topo) return;
  let referencia=0;
  let ticking=false;
  let travado=false; // trava durante a animação do topo, evita loop de eventos de scroll
  function alternarTopo(esconder){
    if(esconder===topo.classList.contains('escondido')) return;
    travado=true;
    topo.classList.toggle('escondido',esconder);
    setTimeout(()=>{ travado=false; },320); // um pouco mais que a duração da transição (.28s)
  }
  window.addEventListener('scroll',()=>{
    if(ticking||travado) return;
    ticking=true;
    requestAnimationFrame(()=>{
      const atual=window.scrollY;
      if(atual<=16){
        alternarTopo(false);
        referencia=atual;
      }else{
        const delta=atual-referencia;
        if(delta>24){
          alternarTopo(true);
          referencia=atual;
        }else if(delta<-24){
          alternarTopo(false);
          referencia=atual;
        }
      }
      ticking=false;
    });
  },{passive:true});
})();

// arrastar a bolinha de notificação pela tela (toque e segure pra mover)
(function(){
  const bubble=document.getElementById('notif-bubble');
  if(!bubble) return;
  let ativo=false, moveu=false, offX=0, offY=0, startX=0, startY=0;
  bubble.addEventListener('pointerdown',e=>{
    ativo=true; moveu=false;
    const r=bubble.getBoundingClientRect();
    offX=e.clientX-r.left; offY=e.clientY-r.top;
    startX=e.clientX; startY=e.clientY;
    bubble.style.cursor='grabbing';
  });
  window.addEventListener('pointermove',e=>{
    if(!ativo) return;
    // só conta como "arrastou" se moveu de verdade (mais de 8px) — evita bloquear o toque normal
    if(!moveu && (Math.abs(e.clientX-startX)>8 || Math.abs(e.clientY-startY)>8)) moveu=true;
    if(!moveu) return;
    const x=Math.min(window.innerWidth-56, Math.max(4, e.clientX-offX));
    const y=Math.min(window.innerHeight-56, Math.max(4, e.clientY-offY));
    bubble.style.left=x+'px'; bubble.style.top=y+'px';
    bubble.style.right='auto'; bubble.style.bottom='auto';
  });
  window.addEventListener('pointerup',()=>{
    if(ativo && moveu){
      // impede que o "click" de abrir o painel dispare logo após arrastar de verdade
      bubble.dataset.arrastou='1';
      setTimeout(()=>{ delete bubble.dataset.arrastou; },50);
    }
    ativo=false; bubble.style.cursor='grab';
  });
  bubble.addEventListener('click',e=>{
    if(bubble.dataset.arrastou) e.stopImmediatePropagation();
  },true);
})();

// gesto de arrastar pra cima pra dispensar
(function(){
  const el=document.getElementById('notif-caixa');
  if(!el) return;
  let startY=null;
  el.addEventListener('touchstart',e=>{ startY=e.touches[0].clientY; el.style.transition='none'; },{passive:true});
  el.addEventListener('touchmove',e=>{
    if(startY===null) return;
    const dy=e.touches[0].clientY-startY;
    if(dy<0) el.style.transform='translateY('+dy+'px)';
  },{passive:true});
  el.addEventListener('touchend',e=>{
    el.style.transition='transform .35s cubic-bezier(.34,1.56,.64,1)';
    const dy=(e.changedTouches[0].clientY-startY);
    if(dy<-40) dispensarNotifCaixa();
    else el.style.transform='translateY(0)';
    startY=null;
  });
})();

