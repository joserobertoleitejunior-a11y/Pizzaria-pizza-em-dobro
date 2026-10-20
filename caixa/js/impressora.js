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

// Serviços BLE usados pelas térmicas baratas (cada fabricante usa um). Precisam estar listados
// pro Chrome deixar o site acessar; a característica de escrita é descoberta sozinha.
const BT_SERVICOS=[
  '000018f0-0000-1000-8000-00805f9b34fb','0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb','0000fff0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb','0000ae30-0000-1000-8000-00805f9b34fb',
  '0000ae3a-0000-1000-8000-00805f9b34fb','0000ff12-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455','e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000ffe5-0000-1000-8000-00805f9b34fb'
];
let btSemResposta=false; // característica aceita escrita "sem resposta" (bem mais rápido)
async function acharCaracteristicaEscrita(server){
  let servicos=[];
  try{ servicos=await server.getPrimaryServices(); }catch(e){}
  if(!servicos.length){
    for(const uuid of BT_SERVICOS){ try{ servicos.push(await server.getPrimaryService(uuid)); }catch(e){} }
  }
  for(const sv of servicos){
    let cs=[]; try{ cs=await sv.getCharacteristics(); }catch(e){ continue; }
    const c=cs.find(x=>x.properties&&(x.properties.writeWithoutResponse||x.properties.write));
    if(c){ btSemResposta=!!c.properties.writeWithoutResponse; return c; }
  }
  return null;
}

async function conectarDispositivo(device){
  try{
    const server=await device.gatt.connect();
    const c=await acharCaracteristicaEscrita(server);
    if(!c){ try{ device.gatt.disconnect(); }catch(e){} return false; }
    btChar=c;
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
    alert('Este navegador não tem Bluetooth pelo site. Use o Google Chrome (Android ou Windows) ou conecte pelo cabo USB.');
    return;
  }
  const SERVICES=BT_SERVICOS;
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
      alert('A impressora apareceu, mas não aceitou a conexão. Desligue e ligue a impressora, confira se ela não está conectada em outro aparelho e toque em "BT" de novo. Se continuar, use o cabo USB.');
    }
  }catch(e){
    if(nameEl)nameEl.innerText='Não conectada';
    if(e.name==='NotFoundError'||e.name==='AbortError'){
      // cancelado pelo usuário
    }else if(e.name==='SecurityError'){
      alert('Bluetooth bloqueado por segurança. Verifique se o site está aberto com HTTPS.');
    }else{
      alert('Não foi possível conectar: '+e.message+'\n\nDicas:\n• A impressora só aceita UM aparelho por vez no Bluetooth: desconecte do outro celular/notebook (ou desligue e ligue a impressora).\n• Ative o Bluetooth e a Localização do celular.\n• Se ela não aparecer na lista, o Bluetooth dela é do tipo antigo (que o navegador não enxerga): use o cabo USB.');
    }
  }
  if(btnEl){btnEl.innerText=origTxt||'Conectar Impressora';btnEl.disabled=false;}
}

let usbDevice=null, usbEndpointOut=null, usbInterfaceNumber=null;

// ── Acentos: a maioria das térmicas (inclui a POS-5890U) NÃO entende UTF-8 — imprime lixo no lugar
// de ã/ç/é. Convertemos o texto para a tabela de caracteres da impressora. Modos (botão "Teste"
// troca até os acentos saírem certos; a escolha fica salva neste computador):
//   cp850 = ESC t 2 (padrão da maioria) · cp1252 = ESC t 16 · sem = tira os acentos (sempre funciona)
const CP850={'Ç':0x80,'ü':0x81,'é':0x82,'â':0x83,'ä':0x84,'à':0x85,'å':0x86,'ç':0x87,'ê':0x88,'ë':0x89,'è':0x8A,'ï':0x8B,'î':0x8C,'ì':0x8D,'Ä':0x8E,'Å':0x8F,'É':0x90,'ô':0x93,'ö':0x94,'ò':0x95,'û':0x96,'ù':0x97,'Ö':0x99,'Ü':0x9A,'á':0xA0,'í':0xA1,'ó':0xA2,'ú':0xA3,'ñ':0xA4,'Ñ':0xA5,'ª':0xA6,'º':0xA7,'¿':0xA8,'Á':0xB5,'Â':0xB6,'À':0xB7,'ã':0xC6,'Ã':0xC7,'Ê':0xD2,'Ë':0xD3,'È':0xD4,'Í':0xD6,'Î':0xD7,'Ï':0xD8,'Ì':0xDE,'Ó':0xE0,'Ô':0xE2,'Ò':0xE3,'õ':0xE4,'Õ':0xE5,'Ú':0xE9,'Û':0xEA,'Ù':0xEB,'×':0x9E,'─':0xC4,'—':0x2D,'–':0x2D,'•':0xF9,'°':0xF8,'€':0xD5};
const MODOS_ACENTO=['cp850','cp1252','sem'];
function modoAcento(){ try{ const m=localStorage.getItem('ped_acento'); return MODOS_ACENTO.includes(m)?m:'cp850'; }catch(e){ return 'cp850'; } }
function semAcentos(t){ return t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[—–]/g,'-').replace(/[─]/g,'-').replace(/[•]/g,'*'); }
function codificarTexto(t,modo){
  if(modo==='sem') t=semAcentos(t);
  const out=[];
  for(const ch of t){
    const c=ch.codePointAt(0);
    if(c<128){ out.push(c); continue; }
    if(modo==='cp850'){ out.push(CP850[ch]!==undefined?CP850[ch]:0x3F); }
    else if(modo==='cp1252'){ out.push(c<=0xFF?c:(ch==='—'||ch==='–'?0x2D:ch==='─'?0x2D:0x3F)); }
    else out.push(0x3F);
  }
  return out;
}
function montarBytesImpressao(texto){
  const ESC=0x1B,GS=0x1D;
  const modo=modoAcento();
  const cmds=[ESC,0x40]; // inicia
  if(modo==='cp850') cmds.push(ESC,0x74,2);        // tabela PC850 (multilíngue)
  else if(modo==='cp1252') cmds.push(ESC,0x74,16); // tabela WPC1252
  cmds.push(ESC,0x61,0x00,ESC,0x45,0x01); // à esquerda + negrito (mais escuro/legível)
  for(const l of texto.split('\n')){
    for(const b of codificarTexto(l,modo)) cmds.push(b);
    cmds.push(0x0A);
  }
  cmds.push(0x0A,0x0A,GS,0x56,0x01); // avança papel e corta
  return new Uint8Array(cmds);
}

// ── Impressão pelo driver do Windows (sem WebUSB): imprime sozinha, sem janela, quando o Chrome
// do Caixa é aberto com a opção --kiosk-printing (ver instruções no botão "Auto"). Serve pra
// qualquer impressora instalada no Windows, inclusive a POS-5890U com o driver do fabricante.
// No celular (Android/iPhone) não existe impressão silenciosa: o window.print() abre a tela de
// "Todas as impressoras" do sistema. Lá a impressora térmica é sempre pelo cabo USB (OTG) ou BT.
const EH_CELULAR=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'');
function autoDriverAtivo(){ if(EH_CELULAR) return false; try{ return localStorage.getItem('ped_auto_driver')==='1'; }catch(e){ return false; } }
function impressoraPronta(){ return !!(btChar||usbEndpointOut||autoDriverAtivo()); }
function imprimirViaNavegador(texto){
  return new Promise((resolve)=>{
    const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;');
    // linha só de "─" vira um traço de verdade (não estoura a largura do papel)
    const html=String(texto).split('\n').map(l=>/^[─\-=]{6,}$/.test(l.trim())?'<hr>':'<div>'+(esc(l)||'&nbsp;')+'</div>').join('');
    const ifr=document.createElement('iframe');
    ifr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(ifr);
    const d=ifr.contentWindow.document;
    d.open();
    // papel 58mm: a área imprimível é ~48mm — por isso largura fixa menor que o papel (antes cortava a direita).
    // Fonte em negrito e preta pra sair escura na térmica.
    d.write('<html><head><meta charset="utf-8"><style>@page{size:58mm auto;margin:0}html,body{margin:0;padding:0;background:#fff}body{width:46mm;padding:1mm 1mm 6mm 2mm;font:700 13px/1.3 Arial,Helvetica,sans-serif;color:#000;overflow-wrap:anywhere}div{white-space:pre-wrap}hr{border:0;border-top:2px dashed #000;margin:4px 0}</style></head><body>'+html+'</body></html>');
    d.close();
    setTimeout(()=>{ try{ ifr.contentWindow.focus(); ifr.contentWindow.print(); }catch(e){ console.warn('Falha ao imprimir pelo navegador:',e); } setTimeout(()=>{ ifr.remove(); resolve(); },1500); },300);
  });
}

async function imprimirBluetooth(texto){
  if(!usbEndpointOut && !btChar){
    if(autoDriverAtivo()){ await imprimirViaNavegador(texto); return; }
    throw new Error('Impressora não conectada. Conecte a impressora primeiro (botões Bluetooth ou USB no topo da tela).');
  }
  const arr=montarBytesImpressao(texto);
  if(usbEndpointOut){
    // impressora USB — envia tudo de uma vez
    await usbDevice.transferOut(usbEndpointOut, arr);
  }else{
    // impressora Bluetooth — envia em pedacinhos (limite do BLE)
    for(let i=0;i<arr.length;i+=20){
      const pedaco=arr.slice(i,i+20);
      if(btSemResposta&&btChar.writeValueWithoutResponse){ await btChar.writeValueWithoutResponse(pedaco); await new Promise(r=>setTimeout(r,16)); } // 16 ms: abaixo disso a impressora perdia o final do texto
      else await btChar.writeValue(pedaco);
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
    if(!ok) explicarFalhaUSB(_ultimoErroUSB);
  }catch(e){
    if(e.name!=='NotFoundError') explicarFalhaUSB(e);
  }
}

let _ultimoErroUSB=null;
// No Windows, quando o driver da impressora está instalado, o próprio Windows "segura" o USB e o
// navegador recebe "Access denied". Nesse caso o caminho certo é o modo AUTO (imprime pelo driver).
function explicarFalhaUSB(e){
  const msg=String((e&&e.message)||e||'');
  if(!EH_CELULAR&&/access denied|acesso negado|SecurityError|Unable to claim|claim/i.test(msg+(e&&e.name||''))){
    if(confirm('O Windows está usando esta impressora pelo driver dele, então o site não consegue falar direto pelo cabo USB.\n\nOK = ligar o modo AUTO (imprime pelo driver do Windows — é o jeito certo no notebook).')){
      try{ localStorage.setItem('ped_auto_driver','1'); }catch(err){}
      atualizarBotaoAuto();
      alert('Modo AUTO ligado.\n\n1) No Windows, deixe a POS-5890U como impressora PADRÃO (Configurações > Impressoras).\n2) Pra imprimir sem abrir a janela de impressão: clique direito no atalho do Chrome > Propriedades > no fim do campo Destino acrescente um espaço e --kiosk-printing\n3) Feche TODAS as janelas do Chrome e abra pelo atalho.\n4) Toque em "Teste".');
    }
    return;
  }
  alert('Não foi possível conectar pelo USB'+(msg?': '+msg:'')+'.\n\nConfira o cabo e se a impressora está ligada.'+(EH_CELULAR?'\nNo celular o cabo precisa ser OTG (USB-C/micro-USB para USB).':'\nNo notebook use o botão AUTO (driver do Windows).'));
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
  }catch(e){ _ultimoErroUSB=e; console.warn('Erro ao conectar impressora USB:',e); return false; }
}

async function reconectarUSBAuto(){
  if(!navigator.usb || usbEndpointOut) return;
  try{
    const devices=await navigator.usb.getDevices();
    if(devices.length>0) await conectarDispositivoUSB(devices[0]);
  }catch(e){ /* silencioso — só tenta de novo depois */ }
}

// Cupom da COZINHA: sem preço por item, sabores um por linha, o que importa em destaque.
// Divide o nome do item em título + linhas ("Esfihas (20) — 4 Carne + 3 Mista" vira uma lista).
function linhasDoItem(nome){
  const n=String(nome||'—').trim();
  let m=n.match(/^Esfihas\s*\((\d+)\)\s*[—-]\s*(.+)$/i);
  if(m) return {titulo:'ESFIHAS ('+m[1]+')',subs:m[2].split(/\s*\+\s*/)};
  m=n.match(/^Meio a Meio:\s*(.+?)\s*\/\s*(.+)$/i);
  if(m) return {titulo:'MEIA A MEIA',subs:['1/2 '+m[1],'1/2 '+m[2]]};
  m=n.match(/^(.+?)\s+[—-]\s+(.+\+.+)$/); // combos: "2 Por R$ 65,00 — A + B"
  if(m) return {titulo:'COMBO '+m[1].toUpperCase(),subs:m[2].split(/\s*\+\s*/)};
  return {titulo:n,subs:[]};
}
function formatarCupom(o){
  const dt=new Date(dataStr(o.created_at)||Date.now());
  const data=dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
  const hora=dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const sep='────────────────────────';
  const entrega=o.delivery_type==='entrega';
  const R=v=>'R$ '+Number(v||0).toFixed(2).replace('.',',');
  const dir=t=>String(t).padStart(24); // valor alinhado à direita
  let txt='PEDIDO Nº '+(o.numero_sequencial||'—')+'  '+(entrega?'ENTREGA':'RETIRADA')+'\n';
  txt+=data+' '+hora+'  PIZZA EM DOBRO\n'+sep+'\n';
  // total: usa o do pedido; se não veio, soma os itens (+ entrega) — a comanda nunca sai sem valor
  const somaItens=(o.items_json||[]).reduce((t,it)=>t+(Number(it.price??it.p??it.unitPrice)||0)*(Number(it.qty)||1),0);
  const totalPedido=Number(o.total)>0?Number(o.total):somaItens+(entrega?(Number(o.taxa_entrega)||0):0);
  // nome e valor logo no topo (e de novo no fim): se algum pedaço da impressão se perder, o essencial já saiu
  txt+=(o.client_name&&o.client_name.trim()?o.client_name:'** SEM NOME **')+(o.client_phone?'  '+o.client_phone:'')+'\n';
  txt+='TOTAL '+R(totalPedido)+'  '+(o.payment||'—')+'\n'+sep+'\n';
  // endereço logo no começo: se a impressão cortar no meio, o que não pode faltar é pra onde vai
  if(entrega){
    const numCasa=o.house_number&&!new RegExp('(^|[^0-9])'+String(o.house_number).replace(/[^0-9A-Za-z]/g,'')+'([^0-9]|$)').test(String(o.address||''))?', nº '+o.house_number:'';
    txt+=(o.address||'—')+numCasa+'\n'+sep+'\n';
  }
  (o.items_json||[]).forEach(it=>{
    const nome=it.name||(it.halves?it.halves.map(h=>h.n).join(' + '):it.n)||'—';
    const qty=Number(it.qty)||1;
    const li=linhasDoItem(nome);
    txt+=qty+'x '+li.titulo+'\n';
    li.subs.forEach(x=>{ txt+='   '+x+'\n'; });
    if(bordaReal(it.borda))txt+='   BORDA: '+it.borda+'\n';
    if(it.added&&it.added.length)txt+='   + '+it.added.join(', ')+'\n';
    if(it.removed&&it.removed.length)txt+='   SEM: '+it.removed.join(', ')+'\n';
    if(it.obs)txt+='   OBS: '+it.obs+'\n';
    const unit=Number(it.price??it.p??it.unitPrice);
    if(unit>0)txt+=dir(R(unit*qty))+'\n'; // valor do item
  });
  txt+=sep+'\n';
  if(entrega) txt+='Entrega'+dir(Number(o.taxa_entrega)>0?R(o.taxa_entrega):'grátis').slice(7)+'\n';
  txt+='TOTAL'+dir(R(totalPedido)).slice(5)+'\n';
  txt+='Pagto: '+(o.payment||'—')+'\n';
  if(o.troco)txt+='Troco: '+R(o.troco)+'\n';
  else if(o.change_for&&Number(String(o.change_for).replace(',','.'))>0)txt+='Troco p/ '+R(String(o.change_for).replace(',','.'))+'\n';
  return txt+'\n';
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
// tenta voltar sozinha em até 15s.
setInterval(()=>{ if(!document.hidden) tentarReconectarImpressoraAgora(); }, 15000);

// Botão "Teste": imprime uma linha com acentos e troca o modo de acentuação a cada toque
function testarImpressora(){
  const modos=MODOS_ACENTO, atual=modoAcento();
  const prox=modos[(modos.indexOf(atual)+1)%modos.length];
  const txt='TESTE - Pizza em Dobro\nModo de acentos: '+atual+'\nAção, coração, é, ú, ô, ç, Õ\n────────────────────────\nSe saiu certo, está pronto.\nSe saiu estranho, toque em\n"Teste" de novo (troca o modo).';
  imprimirBluetooth(txt).then(()=>{
    try{ localStorage.setItem('ped_acento',prox); }catch(e){}
    avisoRapido('🖨️ Teste enviado ('+atual+'). Saiu errado? Toque de novo — próximo modo: '+prox);
  }).catch(e=>alert('Não foi possível imprimir: '+e.message));
}
// Botão "Auto": liga/desliga a impressão pelo driver do Windows
function alternarAutoDriver(){
  const novo=!autoDriverAtivo();
  try{ localStorage.setItem('ped_auto_driver',novo?'1':'0'); }catch(e){}
  atualizarBotaoAuto();
  if(novo) alert('Impressão automática pelo Windows LIGADA.\n\nPra imprimir SEM abrir a janela de impressão, abra o Google Chrome do Caixa com a opção --kiosk-printing:\n1) Clique direito no atalho do Chrome > Propriedades\n2) No campo "Destino", no fim, acrescente um espaço e: --kiosk-printing\n3) Defina a POS-5890U como impressora padrão do Windows\n4) Feche e abra o Chrome de novo.');
}
function atualizarBotaoAuto(){
  const b=document.getElementById('btn-auto-driver'); if(!b) return;
  if(EH_CELULAR){ b.style.display='none'; return; }
  b.classList.toggle('ligado',autoDriverAtivo());
  b.textContent=autoDriverAtivo()?'🖨️ AUTO ✓':'🖨️ AUTO';
  const el=document.getElementById('bt-name');
  if(autoDriverAtivo()&&!btChar&&!usbEndpointOut){
    if(el) el.innerText='Windows (AUTO) ✅';
    if(typeof esconderAlertaImpressora==='function') esconderAlertaImpressora();
  }else if(!autoDriverAtivo()&&!btChar&&!usbEndpointOut&&el&&/AUTO/.test(el.innerText)) el.innerText='Não conectada';
}
setTimeout(atualizarBotaoAuto,300);

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
