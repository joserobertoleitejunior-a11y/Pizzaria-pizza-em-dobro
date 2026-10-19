// ══════════════════════════════════════════════════════════
//  DASHBOARD — Pizza em Dobro
//  Lê os pedidos (coleção 'orders') e mostra SÓ números que dá pra conferir:
//   • dias e horas sempre no fuso de Brasília (antes agrupava por UTC e jogava
//     pedido das 21h–23h59 no dia seguinte);
//   • "pizzas" = só pizzas (bebida, esfiha, calzone e taxa não entram na conta);
//   • cada informação aparece uma vez só (formas de pagamento = 1 lista, que também filtra os pedidos).
//  Sem biblioteca de gráfico: as barras são desenhadas com HTML/CSS (carrega rápido em computador fraco).
// ══════════════════════════════════════════════════════════

if(typeof fmt==='undefined'){ window.fmt=function(v){ return 'R$ '+Number(v||0).toFixed(2).replace('.',','); }; }
if(typeof dataStr==='undefined'){ window.dataStr=function(v){ if(!v) return ''; if(typeof v==='string') return v; if(v.toDate) try{ return v.toDate().toISOString(); }catch(e){ return ''; } return ''; }; }
if(typeof categoriaPagamento==='undefined'){ window.categoriaPagamento=function(raw){ const p=(raw||'').toLowerCase(); if(p.includes('crédito')||p.includes('credito')) return 'Cartão de Crédito'; if(p.includes('débito')||p.includes('debito')) return 'Cartão de Débito'; if(p.includes('pix')) return 'Pix'; if(p.includes('dinheiro')) return 'Dinheiro'; if(p.includes('cart')) return 'Cartão'; return raw?raw:'Não informado'; }; }

let FS=null;
function iniciarFirebase(){
  try{
    if(typeof firebase==='undefined') return false;
    if(!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    FS=firebase.firestore();
    return true;
  }catch(e){ console.error('Erro ao iniciar Firebase:',e); return false; }
}

// ── datas SEMPRE no fuso de Brasília ──
const _fmtDia=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'});
const _fmtHora=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false});
const _fmtHoraNum=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',hour12:false});
function diaBR(iso){ const d=new Date(iso); return isNaN(d)?'':_fmtDia.format(d); }            // 'AAAA-MM-DD'
function horaBR(iso){ const d=new Date(iso); return isNaN(d)?'—':_fmtHora.format(d); }          // 'HH:MM'
function hojeBR(){ return _fmtDia.format(new Date()); }
function somaDias(isoDia,n){ const d=new Date(isoDia+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
function rotuloDia(iso){ try{ const [a,m,d]=iso.split('-'); return d+'/'+m+'/'+a; }catch(e){ return iso; } }
function rotuloCurto(iso){ const [,m,d]=iso.split('-'); return d+'/'+m; }
function nomeSemana(iso){ return ['dom','seg','ter','qua','qui','sex','sáb'][new Date(iso+'T12:00:00Z').getUTCDay()]; }
function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const PERIODOS=[
  {id:'hoje', lbl:'Hoje', dias:1},
  {id:'7d', lbl:'7 dias', dias:7},
  {id:'30d', lbl:'30 dias', dias:30},
];
let periodoAtivo='7d';
let dataCustomSelecionada=null;
let mesCalendarioAtual=new Date();
let pedidosPeriodo=[];        // sem cancelados (é o que conta no faturamento)
let pedidosPeriodoTodos=[];   // com cancelados (só pra lista)
let filtroPagamentoAtivo=null;
let ordemSequenciaAtiva='desc';
let acordeaoSequenciaAberto=false;
let periodoRotulo='';
let cardapioPorNome=null;     // nome → categoria (p, s, dw, cz, d...)

function rotuloPeriodoAtual(){
  if(periodoAtivo==='custom'&&dataCustomSelecionada) return rotuloDia(dataCustomSelecionada);
  const p=PERIODOS.find(x=>x.id===periodoAtivo); return p?p.lbl:'';
}

function renderChipsPeriodo(){
  document.getElementById('periodo').innerHTML=PERIODOS.map(p=>
    `<div class="periodo-chip ${p.id===periodoAtivo?'active':''}" onclick="selecionarPeriodo('${p.id}')">${p.lbl}</div>`
  ).join('') + `<div class="periodo-chip ${periodoAtivo==='custom'?'active':''}" onclick="abrirCalendario()">📅 ${periodoAtivo==='custom'&&dataCustomSelecionada?rotuloDia(dataCustomSelecionada):'Escolher data'}</div>`;
}
function selecionarPeriodo(id){ periodoAtivo=id; dataCustomSelecionada=null; filtroPagamentoAtivo=null; renderChipsPeriodo(); carregarRelatorio(); }

// ── CALENDÁRIO ──
function abrirCalendario(){
  mesCalendarioAtual=dataCustomSelecionada?new Date(dataCustomSelecionada+'T12:00:00'):new Date();
  renderCalendario();
  document.getElementById('calendario-overlay').style.display='flex';
}
function fecharCalendario(){ document.getElementById('calendario-overlay').style.display='none'; }
function mudarMesCalendario(delta){
  mesCalendarioAtual=new Date(mesCalendarioAtual.getFullYear(),mesCalendarioAtual.getMonth()+delta,1);
  renderCalendario();
}
function renderCalendario(){
  const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const ano=mesCalendarioAtual.getFullYear(), mes=mesCalendarioAtual.getMonth();
  document.getElementById('cal-titulo').textContent=meses[mes]+' de '+ano;
  const inicioSemana=new Date(ano,mes,1).getDay();
  const diasNoMes=new Date(ano,mes+1,0).getDate();
  const hojeISO=hojeBR();
  let html='<div class="cal-grid cal-semana">'+['D','S','T','Q','Q','S','S'].map(d=>`<div class="cal-dow">${d}</div>`).join('')+'</div><div class="cal-grid">';
  for(let i=0;i<inicioSemana;i++) html+='<div class="cal-dia vazio"></div>';
  for(let dia=1;dia<=diasNoMes;dia++){
    const iso=ano+'-'+String(mes+1).padStart(2,'0')+'-'+String(dia).padStart(2,'0');
    const futuro=iso>hojeISO;
    html+=`<div class="cal-dia ${iso===hojeISO?'cal-hoje':''} ${iso===dataCustomSelecionada?'cal-sel':''} ${futuro?'cal-futuro':''}" ${futuro?'':`onclick="selecionarDataCalendario('${iso}')"`}>${dia}</div>`;
  }
  document.getElementById('cal-corpo').innerHTML=html+'</div>';
}
function selecionarDataCalendario(iso){
  dataCustomSelecionada=iso; periodoAtivo='custom'; filtroPagamentoAtivo=null;
  fecharCalendario(); renderChipsPeriodo(); carregarRelatorio();
}

// ── cardápio (pra saber o que é pizza e o que é bebida/esfiha) ──
async function carregarCardapioMapa(){
  if(cardapioPorNome) return;
  cardapioPorNome={};
  try{
    const snap=await FS.collection('menu_items').get();
    snap.docs.forEach(d=>{ const m=d.data(); if(m&&m.name) cardapioPorNome[m.name]=m.category||'p'; });
  }catch(e){ console.warn('Não carregou o cardápio pro dashboard (usa nomes como fallback):',e); }
}
const NAO_PIZZA=/coca|guaran|fanta|sprite|suco|refri|água|agua|cerveja|\bml\b|\d\s?l\b|litro|calzone|esfiha|taxa/i;
// o que UM item do pedido representa: pizzas inteiras, esfihas e os "sabores" pra ranking
function analisarItem(it){
  const nome=(it.name||'').trim(), qtd=Number(it.qty)||1;
  let m=nome.match(/^Esfihas \((\d+)\)/);
  if(m) return {pizzas:0,esfihas:Number(m[1])*qtd,sabores:[]};
  if(/^2 (?:Por|Broto por) R\$/i.test(nome)){
    const s=(typeof decomporSaboresItem==='function')?decomporSaboresItem(nome):[nome];
    return {pizzas:2*qtd,esfihas:0,sabores:s.map(x=>[x,qtd])};
  }
  if(/^Meio a Meio:/i.test(nome)){
    const s=(typeof decomporSaboresItem==='function')?decomporSaboresItem(nome):[nome];
    return {pizzas:1*qtd,esfihas:0,sabores:s.map(x=>[x,qtd])};
  }
  const cat=cardapioPorNome&&cardapioPorNome[nome];
  const ehPizza=cat?(cat==='p'||cat==='s'||cat==='dw'):!NAO_PIZZA.test(nome);
  return ehPizza?{pizzas:qtd,esfihas:0,sabores:[[nome,qtd]]}:{pizzas:0,esfihas:0,sabores:[]};
}

async function carregarRelatorio(){
  if(!FS){ document.getElementById('kpis').innerHTML='<div class="empty">⚠️ Sem conexão com o banco de dados.</div>'; return; }
  let diaIni, diaFim;
  if(periodoAtivo==='custom'&&dataCustomSelecionada){ diaIni=diaFim=dataCustomSelecionada; }
  else{ const cfg=PERIODOS.find(p=>p.id===periodoAtivo); diaFim=hojeBR(); diaIni=somaDias(diaFim,-(cfg.dias-1)); }
  periodoRotulo=rotuloPeriodoAtual();
  document.getElementById('kpis').innerHTML='<div class="sk-wrap" aria-hidden="true"><i class="sk"></i><i class="sk"></i><i class="sk"></i></div>';
  try{
    await carregarCardapioMapa();
    const snap=await FS.collection('orders')
      .where('created_at','>=',limiteDiaBrasilia(diaIni))
      .where('created_at','<=',limiteDiaBrasilia(diaFim,true))
      .orderBy('created_at','desc').limit(3000).get();
    pedidosPeriodoTodos=snap.docs.map(d=>Object.assign({id:d.id},d.data()));
    pedidosPeriodo=pedidosPeriodoTodos.filter(p=>p.status!=='cancelado');
    window._corte=(snap.size>=3000);
  }catch(e){
    console.error('Erro ao carregar relatório:',e);
    document.getElementById('kpis').innerHTML='<div class="empty" style="grid-column:1/-1">⚠️ Não foi possível carregar os dados. Verifique a conexão e toque no período de novo.</div>';
    return;
  }
  window._dias={ini:diaIni,fim:diaFim};
  renderKpis(); renderFaturamento(); renderPagamento(); renderTipoVenda(); renderSabores(); renderSequencia();
}

function renderKpis(){
  const total=pedidosPeriodo.reduce((s,p)=>s+Number(p.total||0),0);
  const qtd=pedidosPeriodo.length, ticket=qtd?total/qtd:0;
  let pizzas=0, esfihas=0;
  pedidosPeriodo.forEach(p=>(p.items_json||[]).forEach(it=>{ const a=analisarItem(it); pizzas+=a.pizzas; esfihas+=a.esfihas; }));
  const cli={};
  pedidosPeriodo.forEach(p=>{ if(ehClienteBalcao(p)) return; const k=(p.client_phone||p.client_name||'').toString().replace(/\D+/g,'')||(p.client_name||'').toLowerCase(); if(k) cli[k]=(cli[k]||0)+1; });
  const clientes=Object.keys(cli).length, voltaram=Object.values(cli).filter(q=>q>1).length;
  const cancelados=pedidosPeriodoTodos.length-qtd;
  document.getElementById('kpis').innerHTML=`
    <div class="kpi-card kpi-destaque"><div class="kpi-lbl">Faturamento · ${esc(periodoRotulo)}</div><div class="kpi-num">${fmt(total)}</div><div class="kpi-sub">${qtd} pedido${qtd===1?'':'s'}${cancelados?` · ${cancelados} cancelado${cancelados>1?'s':''} (fora da conta)`:''}</div></div>
    <div class="kpi-card"><div class="kpi-lbl">Ticket médio</div><div class="kpi-num">${fmt(ticket)}</div></div>
    <div class="kpi-card"><div class="kpi-lbl">Pizzas vendidas</div><div class="kpi-num">${pizzas}</div><div class="kpi-sub">${qtd?(pizzas/qtd).toFixed(1).replace('.',','):'0'} por pedido</div></div>
    <div class="kpi-card"><div class="kpi-lbl">Esfihas</div><div class="kpi-num">${esfihas}</div></div>
    <div class="kpi-card"><div class="kpi-lbl">Clientes</div><div class="kpi-num">${clientes}</div><div class="kpi-sub">${voltaram} voltaram a comprar</div></div>`
    +(window._corte?'<div class="empty" style="grid-column:1/-1;padding:0">⚠️ Período muito grande: mostrando só os 3.000 pedidos mais recentes. Escolha um período menor.</div>':'');
}

// ── FATURAMENTO: barras (1 dia = por hora; vários dias = por dia) ──
function renderFaturamento(){
  const box=document.getElementById('grafico-fat'), det=document.getElementById('fat-detalhe');
  const {ini,fim}=window._dias;
  let itens=[];
  if(ini===fim){
    const porHora={}; pedidosPeriodo.forEach(p=>{ const h=Number(_fmtHoraNum.format(new Date(dataStr(p.created_at)))); porHora[h]=(porHora[h]||0)+Number(p.total||0); });
    const horas=Object.keys(porHora).map(Number);
    if(horas.length){ const a=Math.min(...horas), b=Math.max(...horas); for(let h=a;h<=b;h++) itens.push({rot:String(h).padStart(2,'0')+'h',valor:porHora[h]||0,tit:'às '+String(h).padStart(2,'0')+'h'}); }
    document.getElementById('fat-titulo').textContent='Faturamento por hora';
  }else{
    const porDia={}; pedidosPeriodo.forEach(p=>{ const d=diaBR(dataStr(p.created_at)); porDia[d]=(porDia[d]||0)+Number(p.total||0); });
    for(let d=ini; d<=fim; d=somaDias(d,1)) itens.push({rot:rotuloCurto(d),valor:porDia[d]||0,tit:nomeSemana(d)+' '+rotuloDia(d)});
    document.getElementById('fat-titulo').textContent='Faturamento dia a dia';
  }
  if(!itens.length||itens.every(i=>i.valor===0)){ box.innerHTML='<div class="empty">Sem vendas no período.</div>'; det.textContent=''; return; }
  const max=Math.max(...itens.map(i=>i.valor));
  const passo=itens.length>16?Math.ceil(itens.length/8):1;
  box.innerHTML=itens.map((i,k)=>`<button type="button" class="barra-col" data-i="${k}" onclick="detalheBarra(${k})" aria-label="${esc(i.tit)}: ${esc(fmt(i.valor))}">
      <span class="barra-fill" style="height:${Math.max(3,Math.round(i.valor/max*100))}%"></span>
      <span class="barra-rot">${k%passo===0?i.rot:''}</span></button>`).join('');
  window._barras=itens;
  const melhor=itens.reduce((m,i)=>i.valor>m.valor?i:m,itens[0]);
  det.innerHTML=`Melhor momento: <b>${esc(melhor.tit)}</b> · ${esc(fmt(melhor.valor))} <span class="dica">(toque numa barra pra ver o valor)</span>`;
}
function detalheBarra(k){
  const i=window._barras[k]; if(!i) return;
  document.querySelectorAll('.barra-col').forEach((b,n)=>b.classList.toggle('sel',n===k));
  document.getElementById('fat-detalhe').innerHTML=`<b>${esc(i.tit)}</b> · ${esc(fmt(i.valor))}`;
}

// ── FORMAS DE PAGAMENTO: uma lista só (valor, pedidos, %) — tocar filtra a lista de pedidos ──
function renderPagamento(){
  const g={};
  pedidosPeriodo.forEach(p=>{ const c=categoriaPagamento(p.payment); (g[c]=g[c]||{n:0,v:0}); g[c].n++; g[c].v+=Number(p.total||0); });
  const total=Object.values(g).reduce((s,x)=>s+x.v,0);
  const ordem=['Pix','Dinheiro','Cartão de Crédito','Cartão de Débito','Cartão','Cartão (não especificado)','Não informado'];
  const lista=Object.keys(g).sort((a,b)=>(ordem.indexOf(a)<0?99:ordem.indexOf(a))-(ordem.indexOf(b)<0?99:ordem.indexOf(b)));
  document.getElementById('lista-pagamento').innerHTML=lista.length?lista.map(c=>{
    const x=g[c], pct=total?Math.round(x.v/total*100):0;
    return `<button type="button" class="linha-barra ${filtroPagamentoAtivo===c?'sel':''}" onclick="selecionarPagamento('${c.replace(/'/g,"\\'")}')">
      <span class="lb-topo"><b>${esc(c)}</b><span>${esc(fmt(x.v))}</span></span>
      <span class="lb-barra"><i style="width:${pct}%"></i></span>
      <span class="lb-sub">${x.n} pedido${x.n>1?'s':''} · ${pct}%</span></button>`;
  }).join(''):'<div class="empty">Sem vendas no período.</div>';
}
function selecionarPagamento(c){
  filtroPagamentoAtivo=(filtroPagamentoAtivo===c)?null:c;
  renderPagamento();
  if(filtroPagamentoAtivo&&!acordeaoSequenciaAberto) alternarAccordionSequencia(); else renderSequencia();
}

function renderTipoVenda(){
  const nomes={entrega:'Entrega',retirada:'Retirada',balcao:'Balcão','balcão':'Balcão',mesa:'Mesa'};
  const g={};
  pedidosPeriodo.forEach(p=>{ const k=nomes[(p.delivery_type||'').toLowerCase()]||(p.delivery_type||'Não informado'); g[k]=(g[k]||{n:0,v:0}); g[k].n++; g[k].v+=Number(p.total||0); });
  const total=pedidosPeriodo.length;
  document.getElementById('lista-tipo').innerHTML=Object.entries(g).sort((a,b)=>b[1].n-a[1].n).map(([k,x])=>{
    const pct=total?Math.round(x.n/total*100):0;
    return `<div class="linha-barra"><span class="lb-topo"><b>${esc(k)}</b><span>${x.n} pedido${x.n>1?'s':''}</span></span><span class="lb-barra"><i style="width:${pct}%"></i></span><span class="lb-sub">${esc(fmt(x.v))} · ${pct}%</span></div>`;
  }).join('')||'<div class="empty">Sem vendas no período.</div>';
}

function renderSabores(){
  const cont={};
  pedidosPeriodo.forEach(p=>(p.items_json||[]).forEach(it=>analisarItem(it).sabores.forEach(([s,q])=>{ cont[s]=(cont[s]||0)+q; })));
  const rank=Object.entries(cont).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const max=rank.length?rank[0][1]:1;
  document.getElementById('lista-sabores').innerHTML=rank.length?rank.map(([s,q],i)=>
    `<div class="linha-barra"><span class="lb-topo"><b>${i+1}. ${esc(s)}</b><span>${q}×</span></span><span class="lb-barra"><i style="width:${Math.round(q/max*100)}%"></i></span></div>`).join('')
    :'<div class="empty">Sem pizzas vendidas no período.</div>';
}

// ── PEDIDOS DO PERÍODO (lista; vira "lançamentos por forma" quando você toca numa forma de pagamento) ──
function alternarAccordionSequencia(){
  acordeaoSequenciaAberto=!acordeaoSequenciaAberto;
  document.getElementById('chevron-sequencia').textContent=acordeaoSequenciaAberto?'▾':'▸';
  document.getElementById('controles-sequencia').style.display=acordeaoSequenciaAberto?'block':'none';
  renderSequencia();
}
function alternarOrdemSequencia(){
  ordemSequenciaAtiva=(ordemSequenciaAtiva==='desc')?'asc':'desc';
  const btn=document.getElementById('ordem-sequencia-toggle');
  if(btn) btn.textContent=ordemSequenciaAtiva==='desc'?'⬇ Mais recente primeiro':'⬆ Mais antigo primeiro';
  renderSequencia();
}
function renderSequencia(){
  const box=document.getElementById('lista-sequencia'); if(!box) return;
  if(!acordeaoSequenciaAberto){ box.innerHTML=`<div class="empty">${pedidosPeriodoTodos.length} pedido(s) no período · toque no título acima pra ver a lista</div>`; return; }
  let lista=pedidosPeriodoTodos.slice();
  if(filtroPagamentoAtivo) lista=lista.filter(p=>categoriaPagamento(p.payment)===filtroPagamentoAtivo);
  const dir=ordemSequenciaAtiva==='desc'?-1:1;
  lista.sort((a,b)=>dir*(dataStr(b.created_at).localeCompare(dataStr(a.created_at))));
  const filtroHtml=filtroPagamentoAtivo?`<div class="filtro-ativo">Mostrando só <b>${esc(filtroPagamentoAtivo)}</b> <button type="button" onclick="selecionarPagamento('${filtroPagamentoAtivo.replace(/'/g,"\\'")}')">✕ limpar</button></div>`:'';
  if(!lista.length){ box.innerHTML=filtroHtml+'<div class="empty">Nenhum pedido com esse filtro.</div>'; return; }
  let html=filtroHtml, diaAtual=null;
  lista.slice(0,200).forEach(p=>{
    const iso=dataStr(p.created_at), dia=diaBR(iso);
    if(dia!==diaAtual){ diaAtual=dia; html+=`<div class="dia-sep">📅 ${nomeSemana(dia)} ${rotuloDia(dia)}</div>`; }
    const cancelado=p.status==='cancelado';
    html+=`<div class="seq-row" style="${cancelado?'opacity:.5;':''}">
      <div class="seq-badge" style="${cancelado?'background:#9CA3AF;':''}">${p.numero_sequencial?'#'+esc(p.numero_sequencial):'—'}</div>
      <div class="seq-info"><b>${esc(p.client_name||'Cliente')}</b>${cancelado?' <span style="color:#B91C1C;">CANCELADO</span>':''}<div class="seq-sub">${horaBR(iso)} · ${esc(categoriaPagamento(p.payment))} · ${esc(p.delivery_type||'—')}</div></div>
      <div class="seq-total">${fmt(p.total)}</div></div>`;
  });
  if(lista.length>200) html+=`<div class="empty">Mostrando os 200 mais recentes de ${lista.length}.</div>`;
  box.innerHTML=html;
}

// ── assistente do gerente: abre/fecha (começa fechado pra tela ficar limpa) ──
function alternarAssistente(){
  const b=document.getElementById('ia-caixa'), ab=b.style.display!=='none';
  b.style.display=ab?'none':'flex';
  document.getElementById('chevron-ia').textContent=ab?'▸':'▾';
}

// ── ASSISTENTE DE IA — chat de verdade, com histórico da conversa ──
let historicoChatIA=[]; // {role:'user'|'assistant', content:string}
function formatarTextoIA(texto){
  return texto
    .replace(/^## (.+)$/gm, '<div style="font-family:var(--font-eyebrow);font-size:.72rem;letter-spacing:.5px;text-transform:uppercase;color:var(--pr);margin:8px 0 4px;">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .split('\n').map(l=>l.trim()).join('<br>');
}
function adicionarBolhaChatIA(texto, tipo){
  const box=document.getElementById('ia-chat-mensagens');
  const div=document.createElement('div');
  div.className='ia-msg '+(tipo==='user'?'ia-msg-user':'ia-msg-bot');
  div.innerHTML=tipo==='user'?texto.replace(/</g,'&lt;'):formatarTextoIA(texto);
  box.appendChild(div);
  box.scrollTop=box.scrollHeight;
}
function adicionarAcoesImagemChatIA(itens){
  const box=document.getElementById('ia-chat-mensagens');
  const div=document.createElement('div');
  div.className='ia-msg ia-msg-bot';
  div.style.cssText='display:flex;flex-direction:column;gap:6px;padding:8px 13px;';
  div.innerHTML=itens.map(it=>
    `<span style="color:var(--pr);text-decoration:underline;cursor:pointer;font-size:.78rem;" onclick="abrirModalImagemItem('${it.id}','${(it.nome||'').replace(/'/g,"\\'")}')">Adicionar imagem para "${it.nome}"</span>`
  ).join('');
  box.appendChild(div);
  box.scrollTop=box.scrollHeight;
}
async function enviarMensagemIA(){
  const input=document.getElementById('ia-chat-input');
  const texto=(input.value||'').trim();
  if(!texto) return;
  input.value='';
  input.disabled=true;
  document.getElementById('ia-chat-digitando').style.display='block';
  adicionarBolhaChatIA(texto,'user');
  historicoChatIA.push({role:'user',content:texto});
  try{
    const resp=await fetch('/api/dashboard-chat',{
      method:'POST',
      headers:await cabecalhosEquipe(),
      body:JSON.stringify({mensagens:historicoChatIA})
    });
    const data=await resp.json();
    const resposta=data.texto||data.erro||'Não consegui responder agora, tenta de novo.';
    adicionarBolhaChatIA(resposta,'bot');
    if(Array.isArray(data.itensAfetados) && data.itensAfetados.length){
      adicionarAcoesImagemChatIA(data.itensAfetados);
    }
    historicoChatIA.push({role:'assistant',content:resposta});
  }catch(e){
    adicionarBolhaChatIA('Não consegui responder agora. Confere a conexão e tenta de novo.','bot');
  }finally{
    document.getElementById('ia-chat-digitando').style.display='none';
    input.disabled=false;
    input.focus();
  }
}

// ── FOTO DE ITEM VIA CHAT — contextual (aberta pela confirmação da IA) ──
let itemImagemAtualId=null;
let itemImagemAtualNome=null;
let imagemItemComprimida=null;

function abrirModalImagemItem(id, nome){
  itemImagemAtualId=id||null;
  itemImagemAtualNome=nome||'';
  document.getElementById('img-item-titulo').textContent=itemImagemAtualNome?`Foto de "${itemImagemAtualNome}"`:'Foto do item';
  document.getElementById('img-item-select-wrap').style.display='none';
  document.getElementById('modal-imagem-item').style.display='flex';
  imagemItemComprimida=null;
  document.getElementById('img-item-preview').innerHTML='Nenhuma foto escolhida';
  document.getElementById('img-item-file').value='';
  document.getElementById('img-item-status').textContent='';
}
function fecharModalImagemItem(){ document.getElementById('modal-imagem-item').style.display='none'; }

function handleImgItemFile(input){
  const f=input.files[0];if(!f)return;
  const prev=document.getElementById('img-item-preview');
  prev.innerHTML='Processando...';
  const r=new FileReader();
  r.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const MAX_LADO=900;
      let w=img.width,h=img.height;
      if(w>h && w>MAX_LADO){ h=Math.round(h*MAX_LADO/w); w=MAX_LADO; }
      else if(h>=w && h>MAX_LADO){ w=Math.round(w*MAX_LADO/h); h=MAX_LADO; }
      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      let qualidade=0.82;
      let dataUrl=canvas.toDataURL('image/jpeg',qualidade);
      while(dataUrl.length>700000 && qualidade>0.35){
        qualidade-=0.12;
        dataUrl=canvas.toDataURL('image/jpeg',qualidade);
      }
      if(dataUrl.length>900000){
        prev.innerHTML='Imagem grande demais mesmo comprimida — tenta outra foto.';
        imagemItemComprimida=null;
        return;
      }
      imagemItemComprimida=dataUrl;
      prev.innerHTML='';
      const preview=document.createElement('img');
      preview.src=dataUrl;
      preview.style.cssText='width:100%;height:100%;object-fit:cover;';
      prev.appendChild(preview);
    };
    img.onerror=()=>{ prev.innerHTML='Não foi possível ler essa imagem.'; };
    img.src=e.target.result;
  };
  r.onerror=()=>{ prev.innerHTML='Não foi possível ler o arquivo.'; };
  r.readAsDataURL(f);
}

async function salvarImagemItem(){
  if(!itemImagemAtualId) return alert('Nenhum item selecionado — abra essa janela a partir da confirmação do assistente.');
  if(!imagemItemComprimida) return alert('Escolhe uma foto primeiro.');
  const btn=document.getElementById('btn-salvar-img-item');
  btn.disabled=true;btn.textContent='Salvando...';
  try{
    await FS.collection('menu_items').doc(itemImagemAtualId).set({img_url:imagemItemComprimida,updated_at:new Date().toISOString()},{merge:true});
    fecharModalImagemItem();
    adicionarBolhaChatIA(`Foto de "${itemImagemAtualNome}" atualizada com sucesso.`,'bot');
  }catch(e){
    alert('Não foi possível salvar a foto agora (sem conexão?). Tenta de novo.');
  }finally{
    btn.disabled=false;btn.textContent='Salvar foto';
  }
}

// ---- CORREÇÃO ÚNICA: numerar pedidos antigos que ficaram sem número (dia = dia de Brasília, igual ao contador do site) ----
async function corrigirNumeracaoAntiga(){
  if(!FS) return;
  if(!confirm('Isso vai numerar pedidos antigos que ainda não têm número, sem alterar nenhum número que já existe. Pode levar alguns segundos. Continuar?')) return;
  const btn=document.getElementById('btn-corrigir-numeracao');
  if(btn){ btn.disabled=true; btn.textContent='Corrigindo...'; }
  try{
    const snap=await FS.collection('orders').limit(5000).get();
    const semNumero=snap.docs.filter(d=>!d.data().numero_sequencial && d.data().created_at);
    const porDia={};
    semNumero.forEach(d=>{ const dia=diaBR(dataStr(d.data().created_at)); if(dia) (porDia[dia]=porDia[dia]||[]).push(d); });
    let totalCorrigido=0;
    for(const dia of Object.keys(porDia)){
      const lista=porDia[dia].slice().sort((a,b)=>dataStr(a.data().created_at).localeCompare(dataStr(b.data().created_at)));
      const contadorRef=FS.collection('contadores').doc('pedidos_'+dia);
      await FS.runTransaction(async(t)=>{
        const contDoc=await t.get(contadorRef);
        let atual=contDoc.exists?(contDoc.data().atual||0):0;
        lista.forEach(d=>{ atual++; t.update(d.ref,{numero_sequencial:atual}); });
        t.set(contadorRef,{atual},{merge:true});
      });
      totalCorrigido+=lista.length;
    }
    alert(totalCorrigido>0?'Pronto! '+totalCorrigido+' pedido(s) antigo(s) numerado(s).':'Nenhum pedido sem número encontrado — já está tudo certo.');
    carregarRelatorio();
  }catch(e){
    console.error('Erro ao corrigir numeração:',e);
    alert('Não foi possível corrigir a numeração: '+e.message);
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='🔧 Corrigir numeração de pedidos antigos (uma vez)'; }
  }
}

// ---- carrega as bibliotecas de PDF só quando alguém pede o PDF (não pesa na abertura) ----
function carregarScript(src){ return new Promise((ok,erro)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>erro(new Error('falhou '+src)); document.head.appendChild(s); }); }
async function garantirPdf(){
  if(window.jspdf&&window.jspdf.jsPDF&&(new window.jspdf.jsPDF()).autoTable) return;
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js');
}

// ---- EXPORTAÇÃO PDF (resumo + formas de pagamento + sabores + clientes + pedidos) ----
async function exportarPdf(){
  if(pedidosPeriodo.length===0){ alert('Nenhum pedido no período selecionado.'); return; }
  try{ await garantirPdf(); }catch(e){ alert('Não consegui carregar o gerador de PDF — verifique a internet e tente de novo.'); return; }
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'pt',format:'a4'});
  let y=40;
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(214,40,40);
  doc.text('PIZZA EM DOBRO',40,y);
  doc.setFontSize(11); doc.setTextColor(90,90,90); doc.setFont('helvetica','normal');
  doc.text('Relatorio de vendas - Periodo: '+periodoRotulo+'  |  Gerado em '+new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}),40,y+18);
  y+=44;
  const total=pedidosPeriodo.reduce((s,p)=>s+Number(p.total||0),0), qtd=pedidosPeriodo.length;
  let pizzas=0, esfihas=0; pedidosPeriodo.forEach(p=>(p.items_json||[]).forEach(it=>{ const a=analisarItem(it); pizzas+=a.pizzas; esfihas+=a.esfihas; }));
  doc.setFontSize(12); doc.setTextColor(20,20,20); doc.setFont('helvetica','bold');
  doc.text('Faturamento: '+fmt(total)+'   Pedidos: '+qtd+'   Ticket medio: '+fmt(qtd?total/qtd:0),40,y); y+=18;
  doc.text('Pizzas: '+pizzas+'   Esfihas: '+esfihas,40,y); y+=14;
  const g={}; pedidosPeriodo.forEach(p=>{ const c=categoriaPagamento(p.payment); (g[c]=g[c]||{n:0,v:0}); g[c].n++; g[c].v+=Number(p.total||0); });
  doc.autoTable({startY:y+8,head:[['Forma de pagamento','Pedidos','Total']],body:Object.entries(g).map(([c,x])=>[c,String(x.n),fmt(x.v)]),theme:'striped',headStyles:{fillColor:[214,40,40]},styles:{fontSize:10},margin:{left:40,right:40}});
  const cont={}; pedidosPeriodo.forEach(p=>(p.items_json||[]).forEach(it=>analisarItem(it).sabores.forEach(([s,q])=>{ cont[s]=(cont[s]||0)+q; })));
  doc.autoTable({startY:doc.lastAutoTable.finalY+16,head:[['Sabor mais pedido','Vezes']],body:Object.entries(cont).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([s,q])=>[s,String(q)]),theme:'striped',headStyles:{fillColor:[214,40,40]},styles:{fontSize:10},margin:{left:40,right:40}});
  const cli={};
  pedidosPeriodo.forEach(p=>{ if(ehClienteBalcao(p)) return; const k=(p.client_phone||p.client_name||'-').toLowerCase(); if(!cli[k]) cli[k]={nome:p.client_name||'-',tel:p.client_phone||'-',qtd:0,total:0}; cli[k].qtd++; cli[k].total+=Number(p.total||0); if(p.client_name) cli[k].nome=p.client_name; });
  doc.addPage();
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(214,40,40); doc.text('Clientes',40,40);
  doc.autoTable({startY:54,head:[['Cliente','Telefone','Pedidos','Total gasto']],body:Object.values(cli).sort((a,b)=>b.total-a.total).map(c=>[c.nome,c.tel,String(c.qtd),fmt(c.total)]),theme:'striped',headStyles:{fillColor:[214,40,40]},styles:{fontSize:9},margin:{left:40,right:40}});
  doc.addPage();
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(214,40,40); doc.text('Pedidos do periodo',40,40);
  doc.autoTable({startY:54,head:[['Data','#','Cliente','Itens','Pagamento','Tipo','Total']],
    body:pedidosPeriodo.slice().sort((a,b)=>dataStr(b.created_at).localeCompare(dataStr(a.created_at))).map(p=>[rotuloDia(diaBR(dataStr(p.created_at)))+' '+horaBR(dataStr(p.created_at)),p.numero_sequencial?String(p.numero_sequencial):'-',p.client_name||'-',(p.items_json||[]).map(i=>(i.qty>1?i.qty+'x ':'')+i.name).join(', '),categoriaPagamento(p.payment),p.delivery_type||'-',fmt(p.total)]),
    theme:'striped',headStyles:{fillColor:[214,40,40]},styles:{fontSize:8,cellWidth:'wrap'},columnStyles:{3:{cellWidth:170}},margin:{left:30,right:30}});
  doc.save('relatorio_pizza_em_dobro_'+(dataCustomSelecionada||periodoAtivo)+'_'+hojeBR()+'.pdf');
}

// ---- EXPORTAÇÃO CSV (planilha: abre no Excel com acentos certos) ----
function exportarCsv(){
  if(pedidosPeriodo.length===0){ alert('Nenhum pedido no período selecionado.'); return; }
  const lim=v=>String(v==null?'':v).replace(/"/g,'""').replace(/[\r\n]+/g,' ');
  const linhas=[['Data','Hora','Numero','Cliente','Telefone','Itens','Pagamento','Tipo','Total']];
  pedidosPeriodo.slice().sort((a,b)=>dataStr(a.created_at).localeCompare(dataStr(b.created_at))).forEach(p=>{
    const iso=dataStr(p.created_at);
    linhas.push([rotuloDia(diaBR(iso)),horaBR(iso),p.numero_sequencial||'',p.client_name||'',p.client_phone||'',(p.items_json||[]).map(i=>(i.qty>1?i.qty+'x ':'')+i.name).join(' | '),categoriaPagamento(p.payment),p.delivery_type||'',Number(p.total||0).toFixed(2).replace('.',',')]);
  });
  const csv=linhas.map(l=>l.map(c=>`"${lim(c)}"`).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
  const a=document.createElement('a'); a.href=url; a.download='relatorio_'+(dataCustomSelecionada||periodoAtivo)+'_'+hojeBR()+'.csv'; a.click(); URL.revokeObjectURL(url);
}

renderChipsPeriodo();
// só carrega depois do login da equipe (as regras do banco exigem; antes dava "sem permissão")
Promise.resolve(window._gate).then(()=>{
  if(iniciarFirebase()){ carregarRelatorio(); }
  else{ document.getElementById('kpis').innerHTML='<div class="empty" style="grid-column:1/-1">⚠️ Sem conexão com o banco de dados.</div>'; }
});
