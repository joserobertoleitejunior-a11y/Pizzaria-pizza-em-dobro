// ══════════════════════════════════════════════════════════
//  IMPRESSORA BLUETOOTH (movida do Painel — agora conecta aqui no Caixa)
// ══════════════════════════════════════════════════════════
let btDevice=null;
let btChar=null;
const BT_STORAGE_KEY='ped_bt_device_name';
let _tentativasReconexaoBT=0;
let _timerReconexaoBT=null;

// Tenta reconectar sozinha sem NUNCA desistir de vez — espera crescente (2s, 4s, 6s...) até um
// teto de 10s entre tentativas, repetindo pra sempre até conseguir. É a diferença entre "a
// impressora caiu e ficou desconectada até alguém notar e apertar o botão" e "a impressora caiu
// e voltou sozinha assim que ficou de novo no alcance/religada".
function agendarReconexaoComBackoff(device,nome){
  clearTimeout(_timerReconexaoBT);
  _tentativasReconexaoBT++;
  const espera=Math.min(2000*_tentativasReconexaoBT,10000);
  const el=document.getElementById('bt-name');
  if(el)el.innerText=nome+' (reconectando... tentativa '+_tentativasReconexaoBT+')';
  _timerReconexaoBT=setTimeout(async()=>{
    if(btChar)return; // já reconectou por outro caminho (ex: botão manual, outro timer)
    const ok=await conectarDispositivo(device);
    if(!ok) agendarReconexaoComBackoff(device,nome);
  },espera);
}

async function reconectarImpressoraAuto(){
  const nome=localStorage.getItem(BT_STORAGE_KEY);
  if(!nome)return;
  const el=document.getElementById('bt-name');
  if(el)el.innerText=nome+' (reconectando...)';
  try{
    const devices=await navigator.bluetooth.getDevices();
    const device=devices.find(d=>d.name===nome);
    if(device){
      btDevice=device;
      await conectarDispositivo(btDevice);
    }
  }catch(e){
    if(el)el.innerText='Não conectada';
  }
}

async function conectarDispositivo(device){
  const SERVICES=[
    '000018f0-0000-1000-8000-00805f9b34fb',
    '0000ff00-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '00001101-0000-1000-8000-00805f9b34fb',
  ];
  const CHARS=[
    '00002af1-0000-1000-8000-00805f9b34fb',
    '0000ff02-0000-1000-8000-00805f9b34fb',
    '0000ffe1-0000-1000-8000-00805f9b34fb',
  ];
  try{
    const server=await device.gatt.connect();
    let service=null;
    for(const uuid of SERVICES){
      try{service=await server.getPrimaryService(uuid);break;}catch(e){}
    }
    if(!service)return false;
    let found=false;
    for(const cuuid of CHARS){
      try{btChar=await service.getCharacteristic(cuuid);found=true;break;}catch(e){}
    }
    if(!found)return false;
    const nome=device.name||'Impressora';
    const el=document.getElementById('bt-name');
    if(el)el.innerText=nome+' ✅';
    localStorage.setItem(BT_STORAGE_KEY,nome);
    usbEndpointOut=null; usbDevice=null;
    esconderAlertaImpressora();
    _tentativasReconexaoBT=0;
    // {once:true}: cada reconexão bem-sucedida registra um listener novo (linha acima é
    // chamada de novo a cada sucesso) — sem "once", cada desconexão/reconexão ia empilhando
    // mais um listener no mesmo device, e uma queda futura disparava vários reconectando ao
    // mesmo tempo.
    device.addEventListener('gattserverdisconnected',()=>{
      btChar=null;
      mostrarAlertaImpressora();
      agendarReconexaoComBackoff(device,nome);
    },{once:true});
    return true;
  }catch(e){
    return false;
  }
}

async function conectarBluetooth(){
  if(!navigator.bluetooth){
    alert('Este navegador não suporta Bluetooth. Use o Google Chrome no Android.');
    return;
  }
  const SERVICES=[
    '000018f0-0000-1000-8000-00805f9b34fb',
    '0000ff00-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '00001101-0000-1000-8000-00805f9b34fb',
  ];
  const btnEl=event?event.target:null;
  const origTxt=btnEl?btnEl.innerText:'';
  if(btnEl){btnEl.innerText='Buscando...';btnEl.disabled=true;}
  const nameEl=document.getElementById('bt-name');
  if(nameEl)nameEl.innerText='Selecione a impressora...';
  try{
    btDevice=await navigator.bluetooth.requestDevice({
      acceptAllDevices:true,
      optionalServices:SERVICES
    });
    if(btnEl)btnEl.innerText='Conectando...';
    const ok=await conectarDispositivo(btDevice);
    if(!ok){
      if(nameEl)nameEl.innerText='Não conectada';
      alert('Impressora encontrada mas não respondeu como esperado. Tente desligar e ligar a impressora, depois toque em "Conectar Impressora" de novo.');
    }
  }catch(e){
    if(nameEl)nameEl.innerText='Não conectada';
    if(e.name==='NotFoundError'||e.name==='AbortError'){
      // cancelado pelo usuário
    }else if(e.name==='SecurityError'){
      alert('Bluetooth bloqueado por segurança. Verifique se o site está aberto com HTTPS.');
    }else{
      alert('Não foi possível conectar: '+e.message+'\n\nDicas: ative o Bluetooth do celular, aproxime a impressora, e confira se ela está ligada.');
    }
  }
  if(btnEl){btnEl.innerText=origTxt||'Conectar Impressora';btnEl.disabled=false;}
}

let usbDevice=null, usbEndpointOut=null, usbInterfaceNumber=null;

function montarBytesImpressao(texto){
  const ESC=0x1B,GS=0x1D;
  const enc=new TextEncoder();
  const cmds=[ESC,0x40,ESC,0x61,0x01];
  const linhas=texto.split('\n');
  for(const l of linhas){
    const bytes=enc.encode(l+'\n');
    for(const b of bytes)cmds.push(b);
  }
  cmds.push(GS,0x56,0x01);
  return new Uint8Array(cmds);
}

async function imprimirBluetooth(texto){
  if(!usbEndpointOut && !btChar){
    throw new Error('Impressora não conectada. Conecte a impressora primeiro (botões Bluetooth ou USB no topo da tela).');
  }
  const arr=montarBytesImpressao(texto);
  if(usbEndpointOut){
    // impressora USB — envia tudo de uma vez
    await usbDevice.transferOut(usbEndpointOut, arr);
  }else{
    // impressora Bluetooth — envia em pedacinhos (limite do BLE)
    for(let i=0;i<arr.length;i+=20){
      await btChar.writeValue(arr.slice(i,i+20));
    }
  }
}

async function conectarUSB(){
  if(!navigator.usb){
    alert('Este navegador não suporta impressora USB. Use o Google Chrome.');
    return;
  }
  try{
    const device=await navigator.usb.requestDevice({filters:[]});
    const ok=await conectarDispositivoUSB(device);
    if(!ok) alert('Impressora USB encontrada mas não respondeu como esperado. Verifique se é uma impressora térmica compatível.');
  }catch(e){
    if(e.name!=='NotFoundError') alert('Não foi possível conectar via USB: '+e.message);
  }
}

async function conectarDispositivoUSB(device){
  try{
    await device.open();
    if(!device.configuration) await device.selectConfiguration(1);
    // procura a interface e o endpoint de saída (OUT) certos, sem supor número fixo
    let interfaceEncontrada=null, endpointEncontrado=null;
    for(const cfg of device.configurations){
      for(const itf of cfg.interfaces){
        for(const alt of itf.alternates){
          const out=alt.endpoints.find(e=>e.direction==='out');
          if(out){ interfaceEncontrada=itf.interfaceNumber; endpointEncontrado=out.endpointNumber; }
        }
      }
    }
    if(interfaceEncontrada===null) return false;
    await device.claimInterface(interfaceEncontrada);
    usbDevice=device; usbEndpointOut=endpointEncontrado; usbInterfaceNumber=interfaceEncontrada;
    btChar=null; // usando USB agora, Bluetooth fica em segundo plano
    const nome=device.productName||'Impressora USB';
    const el=document.getElementById('bt-name');
    if(el) el.innerText=nome+' (USB) ✅';
    esconderAlertaImpressora();
    device.addEventListener('disconnect', () => {
      if(usbDevice===device){ usbDevice=null; usbEndpointOut=null; }
      const el2=document.getElementById('bt-name');
      if(el2) el2.innerText='Desconectada (USB)';
      mostrarAlertaImpressora();
    });
    return true;
  }catch(e){ console.warn('Erro ao conectar impressora USB:',e); return false; }
}

async function reconectarUSBAuto(){
  if(!navigator.usb || usbEndpointOut) return;
  try{
    const devices=await navigator.usb.getDevices();
    if(devices.length>0) await conectarDispositivoUSB(devices[0]);
  }catch(e){ /* silencioso — só tenta de novo depois */ }
}

function formatarCupom(o){
  const dt=new Date(dataStr(o.created_at)||Date.now());
  const data=dt.toLocaleDateString('pt-BR');
  const hora=dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const sep='────────────────────────';
  let txt='';
  txt+='    PIZZA EM DOBRO\n';
  if(o.numero_sequencial) txt+='     >>> PEDIDO Nº '+o.numero_sequencial+' <<<\n';
  txt+=data+' '+hora+'\n';
  txt+=sep+'\n';
  txt+='Cliente: '+(o.client_name||'—')+'\n';
  if(o.client_phone) txt+='Telefone: '+o.client_phone+'\n';
  txt+=sep+'\n';
  txt+='ITENS:\n';
  const items=o.items_json||[];
  items.forEach((it,i)=>{
    const nome=it.name||(it.halves?it.halves.map(h=>h.n).join(' + '):it.n)||'—';
    const qty=Number(it.qty)||1;
    const precoUnit=Number(it.price||0);
    txt+=(i+1)+'. '+(qty>1?qty+'x ':'')+nome+'\n';
    if(it.borda)txt+='   Borda: '+it.borda+'\n';
    if(it.removed&&it.removed.length)txt+='   Sem: '+it.removed.join(', ')+'\n';
    if(it.obs)txt+='   Obs: '+it.obs+'\n';
    if(qty>1){
      txt+='   R$ '+precoUnit.toFixed(2)+' cada = R$ '+(precoUnit*qty).toFixed(2)+'\n';
    }else{
      txt+='   R$ '+precoUnit.toFixed(2)+'\n';
    }
  });
  txt+=sep+'\n';
  if(o.delivery_type==='entrega'){
    txt+='Endereço: '+(o.address||'—')+'\n';
    txt+='Tipo: ENTREGA\n';
    if(o.taxa_entrega) txt+='Taxa de entrega: R$ '+Number(o.taxa_entrega).toFixed(2)+'\n';
  }else{
    txt+='Tipo: RETIRADA\n';
  }
  txt+=sep+'\n';
  txt+='TOTAL: R$ '+Number(o.total||0).toFixed(2)+'\n';
  txt+=sep+'\n';
  txt+='Pagamento: '+(o.payment||'—')+'\n';
  if(o.troco)txt+='Troco: R$ '+Number(o.troco).toFixed(2)+'\n';
  txt+=sep+'\n\n\n';
  return txt;
}
// ponto único pra tentar reconectar (USB primeiro, depois Bluetooth) — trava contra tentativas
// simultâneas dos vários gatilhos abaixo (troca de aba, foco da janela, checagem periódica)
// pisando uma na outra ao mesmo tempo.
let _reconectandoAgora=false;
async function tentarReconectarImpressoraAgora(){
  if(_reconectandoAgora||btChar||usbEndpointOut) return;
  _reconectandoAgora=true;
  try{
    await reconectarUSBAuto();
    if(!btChar&&!usbEndpointOut) await reconectarImpressoraAuto();
  }finally{
    _reconectandoAgora=false;
  }
}

setTimeout(tentarReconectarImpressoraAgora,1500);

// reconecta sozinha sempre que a tela volta a ficar ativa (usuário trocou de aba/app e voltou)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) tentarReconectarImpressoraAgora();
});
window.addEventListener('focus', tentarReconectarImpressoraAgora);
// checagem periódica de segurança — se cair a conexão por algum caminho que não disparou o
// backoff automático (ex: impressora USB, ou perda de estado depois de recarregar a página),
// tenta voltar sozinha em até 8s.
setInterval(tentarReconectarImpressoraAgora, 8000);

// veio do Painel pedindo reimpressão (?reimprimir=ID) — imprime direto, sem abrir o carrinho
(function(){
  const reimpId=new URLSearchParams(window.location.search).get('reimprimir');
  if(!reimpId||!FS) return;
  FS.collection('orders').doc(reimpId).get().then(doc=>{
    if(!doc.exists) return;
    imprimirBluetooth(formatarCupom({id:doc.id,...doc.data()}));
  }).catch(e=>console.warn('Não foi possível reimprimir.',e));
})();
(function(){
  const pedidoId=new URLSearchParams(window.location.search).get('pedido');
  if(!pedidoId||!FS) return;
  FS.collection('orders').doc(pedidoId).get().then(doc=>{
    if(!doc.exists) return;
    notificacaoAtual={id:doc.id,...doc.data()};
    confirmarPedidoNotificacao();
  }).catch(e=>console.warn('Não foi possível carregar o pedido vindo do Painel.',e));
})();

// ── BOOT (movido pra cá na modularização: precisa rodar só depois que TODOS os
// arquivos do Caixa carregaram, porque iniciarEscutaNotificacoes() é definida em
// notificacoes.js — no arquivo único original isso funcionava por hoisting dentro
// do mesmo <script>; separado em arquivos, a ordem de carregamento importa) ──
renderCats();
renderProdutos();
alternarCampoEntregador();
if(iniciarFirebase()){ iniciarEscutaNotificacoes(); verificarSessaoCaixa(); carregarCardapioDoBanco(); }
