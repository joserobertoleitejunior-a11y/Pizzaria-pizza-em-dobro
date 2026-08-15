// ══════════════════════════════════════════════════════════
//  RELATÓRIOS — Pizza em Dobro
//  Somente LEITURA da coleção 'orders'. Não grava nada.
//  Gráficos são só apresentação — se o Chart.js não carregar,
//  os números continuam disponíveis nos cards e na planilha CSV.
// ══════════════════════════════════════════════════════════



// Fallback de segurança: se por cache/CDN o shared/utils.js não tiver carregado,
// define aqui também — assim a tela nunca quebra por isso.
if(typeof fmt==='undefined'){ window.fmt=function(v){ return 'R$ '+Number(v||0).toFixed(2).replace('.',','); }; }
if(typeof dataStr==='undefined'){ window.dataStr=function(v){ if(!v) return ''; if(typeof v==='string') return v; if(v.toDate) try{ return v.toDate().toISOString(); }catch(e){ return ''; } return ''; }; }
if(typeof categoriaPagamento==='undefined'){ window.categoriaPagamento=function(raw){ const p=(raw||'').toLowerCase(); if(p.includes('crédito')||p.includes('credito')) return 'Cartão de Crédito'; if(p.includes('débito')||p.includes('debito')) return 'Cartão de Débito'; if(p.includes('pix')) return 'Pix'; if(p.includes('dinheiro')) return 'Dinheiro'; if(p.includes('cart')) return 'Cartão (não especificado)'; return raw?raw:'Não informado'; }; }

let FS=null;
function iniciarFirebase(){
  try{
    if(typeof firebase==='undefined') return false;
    const _fbCfg=FB_CONFIG;
    if(!firebase.apps.length) firebase.initializeApp(_fbCfg);
    FS=firebase.firestore();
    return true;
  }catch(e){ console.error('Erro ao iniciar Firebase:',e); return false; }
}

// fmt() agora vem de shared/utils.js
function isoDia(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
// dataStr() agora vem de shared/utils.js

const PERIODOS=[
  {id:'hoje', lbl:'Hoje', dias:1},
  {id:'7d', lbl:'7 dias', dias:7},
  {id:'30d', lbl:'30 dias', dias:30},
];
let periodoAtivo='7d';
let dataCustomSelecionada=null; // 'AAAA-MM-DD' quando o usuário escolhe uma data específica no calendário
let mesCalendarioAtual=new Date();
let pedidosPeriodo=[];
let pedidosPeriodoTodos=[];
let filtroPagamentoAtivo=null;
let ordemSequenciaAtiva='desc';
let charts={};
let acordeaoLancamentosAberto=false;
let acordeaoSequenciaAberto=false;

function alternarAccordionLancamentos(){
  acordeaoLancamentosAberto=!acordeaoLancamentosAberto;
  document.getElementById('chevron-lancamentos').textContent=acordeaoLancamentosAberto?'▾':'▸';
  renderLancamentos();
}
function alternarAccordionSequencia(){
  acordeaoSequenciaAberto=!acordeaoSequenciaAberto;
  document.getElementById('chevron-sequencia').textContent=acordeaoSequenciaAberto?'▾':'▸';
  document.getElementById('controles-sequencia').style.display=acordeaoSequenciaAberto?'block':'none';
  renderSequencia();
}
// separador de dia — pra deixar claro que a numeração reinicia a cada dia (igual no cupom impresso)
function rotuloDia(iso){
  try{
    const [a,m,d]=iso.split('-');
    return d+'/'+m+'/'+a;
  }catch(e){ return iso; }
}
const CORES=['#FF9F1C','#E71D36','#3ddc84','#4aa8ff','#c084fc','#ffd166','#ff6a1a','#9c8f83'];

function renderChipsPeriodo(){
  document.getElementById('periodo').innerHTML=PERIODOS.map(p=>
    `<div class="periodo-chip ${p.id===periodoAtivo?'active':''}" onclick="selecionarPeriodo('${p.id}')">${p.lbl}</div>`
  ).join('') + `<div class="periodo-chip ${periodoAtivo==='custom'?'active':''}" onclick="abrirCalendario()">📅 ${periodoAtivo==='custom'&&dataCustomSelecionada?rotuloDia(dataCustomSelecionada):'Escolher data'}</div>`;
}
function selecionarPeriodo(id){ periodoAtivo=id; dataCustomSelecionada=null; filtroPagamentoAtivo=null; renderChipsPeriodo(); carregarRelatorio(); }

// ── CALENDÁRIO (estilo iOS) — escolher qualquer dia específico ──
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
  const primeiroDia=new Date(ano,mes,1);
  const inicioSemana=primeiroDia.getDay(); // 0=domingo
  const diasNoMes=new Date(ano,mes+1,0).getDate();
  const hojeISO=isoDia(new Date());
  let html='';
  const diasSemana=['D','S','T','Q','Q','S','S'];
  html+='<div class="cal-grid cal-semana">'+diasSemana.map(d=>`<div class="cal-dow">${d}</div>`).join('')+'</div>';
  html+='<div class="cal-grid">';
  for(let i=0;i<inicioSemana;i++) html+='<div class="cal-dia vazio"></div>';
  for(let dia=1;dia<=diasNoMes;dia++){
    const iso=ano+'-'+String(mes+1).padStart(2,'0')+'-'+String(dia).padStart(2,'0');
    const isHoje=iso===hojeISO;
    const isFuturo=iso>hojeISO;
    const isSel=iso===dataCustomSelecionada;
    html+=`<div class="cal-dia ${isHoje?'cal-hoje':''} ${isSel?'cal-sel':''} ${isFuturo?'cal-futuro':''}" ${isFuturo?'':`onclick="selecionarDataCalendario('${iso}')"`}>${dia}</div>`;
  }
  html+='</div>';
  document.getElementById('cal-corpo').innerHTML=html;
}
function selecionarDataCalendario(iso){
  dataCustomSelecionada=iso;
  periodoAtivo='custom';
  fecharCalendario();
  renderChipsPeriodo();
  carregarRelatorio();
}

function destruirGrafico(id){ if(charts[id]){ try{charts[id].destroy();}catch(e){} delete charts[id]; } }

async function carregarRelatorio(){
  if(!FS){
    document.getElementById('kpis').innerHTML='<div class="empty">⚠️ Sem conexão com o banco de dados.</div>';
    return;
  }
  let inicioISO, fimISO=null, cfg;
  if(periodoAtivo==='custom' && dataCustomSelecionada){
    inicioISO=dataCustomSelecionada+'T00:00:00-03:00';
    fimISO=dataCustomSelecionada+'T23:59:59-03:00';
    cfg={lbl:rotuloDia(dataCustomSelecionada), dias:1};
  }else{
    cfg=PERIODOS.find(p=>p.id===periodoAtivo);
    const hoje=new Date();
    const inicio=new Date(hoje); inicio.setDate(hoje.getDate()-(cfg.dias-1));
    inicioISO=isoDia(inicio)+'T00:00:00-03:00';
  }

  try{
    let query=FS.collection('orders').where('created_at','>=',inicioISO);
    if(fimISO) query=query.where('created_at','<=',fimISO);
    const snap=await query.orderBy('created_at','desc').limit(2000).get();
    pedidosPeriodoTodos=snap.docs.map(d=>d.data());
    pedidosPeriodo=pedidosPeriodoTodos.filter(p=>p.status!=='cancelado');
  }catch(e){
    console.error('Erro ao carregar relatório:',e);
    document.getElementById('kpis').innerHTML='<div class="empty">⚠️ Não foi possível carregar os dados. Verifique a conexão.</div>';
    return;
  }

  const total=pedidosPeriodo.reduce((s,p)=>s+Number(p.total||0),0);
  const qtd=pedidosPeriodo.length;
  const ticket=qtd?total/qtd:0;

  document.getElementById('kpis').innerHTML=`
    <div class="kpi-card"><div class="kpi-num">${fmt(total)}</div><div class="kpi-lbl">Faturamento total</div></div>
    <div class="kpi-card"><div class="kpi-num">${qtd}</div><div class="kpi-lbl">Pedidos</div></div>
    <div class="kpi-card"><div class="kpi-num">${fmt(ticket)}</div><div class="kpi-lbl">Ticket médio</div></div>
    <div class="kpi-card"><div class="kpi-num">${cfg.lbl}</div><div class="kpi-lbl">Período analisado</div></div>
  `;

  renderGraficoFaturamento(cfg.dias);
  renderGraficoPagamento();
  renderGraficoSabores();
  renderTipoVenda();
  renderClientes();
  renderPizzaStats();
  renderFiltroPagamento();
  renderSequencia();
  renderLancamentos();
}

// ---- GRÁFICO 1: faturamento dia a dia (linha) ----
function renderGraficoFaturamento(dias){
  const hoje=(periodoAtivo==='custom'&&dataCustomSelecionada)?new Date(dataCustomSelecionada+'T12:00:00'):new Date();
  const rotulos=[], valores=[];
  for(let i=dias-1;i>=0;i--){
    const d=new Date(hoje); d.setDate(hoje.getDate()-i);
    const iso=isoDia(d);
    rotulos.push(d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}));
    valores.push(pedidosPeriodo.filter(p=>dataStr(p.created_at).startsWith(iso)).reduce((s,p)=>s+Number(p.total||0),0));
  }
  destruirGrafico('fat');
  const ctx=document.getElementById('chart-faturamento');
  const emptyFat=document.getElementById('empty-faturamento');
  if(typeof Chart==='undefined'||!ctx){ return; }
  const semDados=valores.every(v=>v===0);
  if(emptyFat) emptyFat.style.display=semDados?'flex':'none';
  ctx.style.display=semDados?'none':'';
  if(semDados) return;
  const ctx2d=ctx.getContext('2d');
  const gradient=ctx2d.createLinearGradient(0,0,0,220);
  gradient.addColorStop(0,'rgba(255,159,28,.38)');
  gradient.addColorStop(1,'rgba(255,159,28,0)');
  charts.fat=new Chart(ctx,{
    type:'line',
    data:{labels:rotulos,datasets:[{label:'Faturamento (R$)',data:valores,borderColor:'#FF9F1C',borderWidth:2.5,
      backgroundColor:gradient,fill:true,tension:.4,pointRadius:3,pointHoverRadius:6,pointBackgroundColor:'#FF9F1C',
      pointBorderColor:'#07060a',pointBorderWidth:2}]},
    options:{
      responsive:true,maintainAspectRatio:false,
      interaction:{intersect:false,mode:'index'},
      plugins:{legend:{display:false},tooltip:{backgroundColor:'#181310',borderColor:'rgba(255,159,28,.4)',borderWidth:1,padding:10,titleColor:'#FF9F1C',bodyColor:'#f3ece2',callbacks:{label:c=>fmt(c.parsed.y)}}},
      scales:{
        y:{ticks:{color:'#9c8f83',callback:v=>'R$'+v},grid:{color:'rgba(255,255,255,.06)'}},
        x:{ticks:{color:'#9c8f83'},grid:{display:false}}
      }
    }
  });
}

// ---- GRÁFICO 2: formas de pagamento (rosca) ----
function renderGraficoPagamento(){
  const porPag={};
  pedidosPeriodo.forEach(p=>{ const k=p.payment||'Não informado'; porPag[k]=(porPag[k]||0)+Number(p.total||0); });
  const labels=Object.keys(porPag), valores=Object.values(porPag);
  destruirGrafico('pag');
  const ctx=document.getElementById('chart-pagamento');
  const emptyEl=document.getElementById('empty-pagamento');
  if(!ctx) return;
  if(typeof Chart==='undefined'||labels.length===0){
    if(emptyEl) emptyEl.style.display='flex';
    ctx.style.display='none';
    return;
  }
  if(emptyEl) emptyEl.style.display='none';
  ctx.style.display='';
  charts.pag=new Chart(ctx,{
    type:'doughnut',
    data:{labels,datasets:[{data:valores,backgroundColor:CORES,borderWidth:3,borderColor:'#07060a',hoverOffset:10}]},
    options:{
      responsive:true,maintainAspectRatio:false,cutout:'62%',
      plugins:{legend:{position:'right',labels:{color:'#f3ece2',font:{size:10},boxWidth:12,padding:12}},
        tooltip:{backgroundColor:'#181310',borderColor:'rgba(255,159,28,.4)',borderWidth:1,padding:10,titleColor:'#FF9F1C',bodyColor:'#f3ece2',callbacks:{label:c=>c.label+': '+fmt(c.parsed)}}}
    }
  });
}

// ---- GRÁFICO 3: sabores mais pedidos (barras) ----
function renderGraficoSabores(){
  const contagem={};
  pedidosPeriodo.forEach(p=>{
    (p.items_json||[]).forEach(it=>{
      const qtd=it.qty||1;
      // decomporSaboresItem() vem de shared/utils.js — sem isso, combo e meio a meio
      // aparecem como "sabor" composto e nunca contam pro sabor real (ver comentário lá)
      const sabores=(typeof decomporSaboresItem==='function')?decomporSaboresItem(it.name):[it.name||'—'];
      sabores.forEach(s=>{ contagem[s]=(contagem[s]||0)+qtd; });
    });
  });
  const ranking=Object.entries(contagem).sort((a,b)=>b[1]-a[1]).slice(0,6);
  destruirGrafico('sab');
  const ctx=document.getElementById('chart-sabores');
  const emptySab=document.getElementById('empty-sabores');
  if(!ctx) return;
  if(typeof Chart==='undefined'||ranking.length===0){
    if(emptySab) emptySab.style.display='flex';
    ctx.style.display='none';
    return;
  }
  if(emptySab) emptySab.style.display='none';
  ctx.style.display='';
  charts.sab=new Chart(ctx,{
    type:'bar',
    data:{labels:ranking.map(r=>r[0]),datasets:[{label:'Vezes pedida',data:ranking.map(r=>r[1]),backgroundColor:'#FF9F1C',hoverBackgroundColor:'#ffb238',borderRadius:8,barThickness:16}]},
    options:{
      indexAxis:'y',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{backgroundColor:'#181310',borderColor:'rgba(255,159,28,.4)',borderWidth:1,padding:10,titleColor:'#FF9F1C',bodyColor:'#f3ece2'}},
      scales:{
        x:{ticks:{color:'#9c8f83',precision:0},grid:{color:'rgba(255,255,255,.06)'}},
        y:{ticks:{color:'#f3ece2',font:{size:10}},grid:{display:false}}
      }
    }
  });
}

// ---- ESTATÍSTICA DE PIZZAS (total vendido + média por pedido) ----
function renderPizzaStats(){
  const qtdPedidos=pedidosPeriodo.length;
  let totalItens=0;
  pedidosPeriodo.forEach(p=>{
    (p.items_json||[]).forEach(it=>{
      const qtd=Number(it.qty)||1;
      // combo "2 Por X" são 2 pizzas físicas por qtd (meio a meio continua sendo 1 — ver pizzasFisicasPorItem)
      const pizzas=(typeof pizzasFisicasPorItem==='function')?pizzasFisicasPorItem(it.name):1;
      totalItens+=qtd*pizzas;
    });
  });
  const media=qtdPedidos?(totalItens/qtdPedidos):0;
  document.getElementById('kpis-pizzas').innerHTML=`
    <div class="kpi-card"><div class="kpi-num">${totalItens}</div><div class="kpi-lbl">Pizzas vendidas no período</div></div>
    <div class="kpi-card"><div class="kpi-num">${media.toFixed(1)}</div><div class="kpi-lbl">Média de pizzas por pedido</div></div>
  `;
}

// ---- FILTRO CLICÁVEL DE FORMA DE PAGAMENTO ----
function renderFiltroPagamento(){
  const formas=[...new Set(pedidosPeriodo.map(p=>p.payment||'Não informado'))].sort();
  const box=document.getElementById('filtro-pagamento');
  if(!box) return;
  const chips=['<div class="periodo-chip '+(!filtroPagamentoAtivo?'active':'')+'" onclick="selecionarPagamento(null)">Todos</div>']
    .concat(formas.map(f=>`<div class="periodo-chip ${filtroPagamentoAtivo===f?'active':''}" onclick="selecionarPagamento('${f.replace(/'/g,"\\'")}')">${f}</div>`));
  box.innerHTML=chips.join('');
}
function selecionarPagamento(forma){
  filtroPagamentoAtivo=forma;
  renderFiltroPagamento();
  renderSequencia();
}

function alternarOrdemSequencia(){
  ordemSequenciaAtiva=(ordemSequenciaAtiva==='desc')?'asc':'desc';
  const btn=document.getElementById('ordem-sequencia-toggle');
  if(btn) btn.textContent=ordemSequenciaAtiva==='desc' ? '⬇ Mais recente primeiro' : '⬆ Mais antigo primeiro';
  renderSequencia();
}

// ---- LISTA SEQUENCIAL DE PEDIDOS (numeração #N reinicia por dia; inclui cancelados marcados) ----
function renderSequencia(){
  const box=document.getElementById('lista-sequencia');
  if(!box) return;
  if(!acordeaoSequenciaAberto){
    box.innerHTML=`<div class="empty">${pedidosPeriodoTodos.length} pedido(s) no período · toque no título acima pra ver a lista</div>`;
    return;
  }
  let lista=pedidosPeriodoTodos.slice();
  if(filtroPagamentoAtivo) lista=lista.filter(p=>(p.payment||'Não informado')===filtroPagamentoAtivo);
  const dir=ordemSequenciaAtiva==='desc'?-1:1;
  lista.sort((a,b)=>dir*(dataStr(b.created_at).localeCompare(dataStr(a.created_at))));
  if(lista.length===0){ box.innerHTML='<div class="empty">Nenhum pedido com esse filtro no período.</div>'; return; }
  let html='';
  let diaAtual=null;
  lista.slice(0,150).forEach(p=>{
    const iso=dataStr(p.created_at).slice(0,10);
    if(iso!==diaAtual){
      diaAtual=iso;
      html+=`<div class="dia-sep">📅 ${rotuloDia(iso)} — numeração começa do 1 nesse dia</div>`;
    }
    const num=p.numero_sequencial?('#'+p.numero_sequencial):'—';
    const cancelado=p.status==='cancelado';
    let hora='—'; try{ hora=new Date(dataStr(p.created_at)).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }catch(e){}
    html+=`<div class="seq-row" style="${cancelado?'opacity:.5;':''}">
      <div class="seq-badge" style="${cancelado?'background:#666;':''}">${num}</div>
      <div class="seq-info"><b>${p.client_name||'Cliente'}</b>${cancelado?' <span style="color:#E71D36;">CANCELADO</span>':''}<div class="seq-sub">${hora} · ${p.payment||'—'} · ${p.delivery_type||'—'}</div></div>
      <div class="seq-total">${fmt(p.total)}</div>
    </div>`;
  });
  if(lista.length>150) html+=`<div class="empty">Mostrando os 150 mais recentes de ${lista.length}.</div>`;
  if(pedidosPeriodoTodos.some(p=>p.numero_sequencial)) html+='<div class="empty" style="padding-top:4px;">O número reinicia todo dia (igual no cupom impresso). Pedidos sem número (—) são de antes da numeração automática. Cancelados aparecem esmaecidos.</div>';
  box.innerHTML=html;
}

// ---- LANÇAMENTOS POR FORMA DE PAGAMENTO (lista cirúrgica: crédito → débito → pix → dinheiro, por horário) ----
// categoriaPagamento() agora vem de shared/utils.js
function renderLancamentos(){
  const box=document.getElementById('lista-lancamentos');
  if(!box) return;
  if(!acordeaoLancamentosAberto){
    box.innerHTML=`<div class="empty">${pedidosPeriodo.length} lançamento(s) no período · toque no título acima pra ver a lista</div>`;
    return;
  }
  const ordemCategorias=['Cartão de Crédito','Cartão de Débito','Pix','Dinheiro','Cartão (não especificado)','Não informado'];
  const grupos={};
  pedidosPeriodo.forEach(p=>{
    const cat=categoriaPagamento(p.payment);
    (grupos[cat]=grupos[cat]||[]).push(p);
  });
  const categoriasComDados=Object.keys(grupos).sort((a,b)=>{
    const ia=ordemCategorias.indexOf(a), ib=ordemCategorias.indexOf(b);
    return (ia===-1?99:ia)-(ib===-1?99:ib);
  });
  if(categoriasComDados.length===0){ box.innerHTML='<div class="empty">Sem lançamentos no período.</div>'; return; }
  let html='';
  categoriasComDados.forEach(cat=>{
    const itens=grupos[cat].slice().sort((a,b)=>dataStr(a.created_at).localeCompare(dataStr(b.created_at)));
    const subtotal=itens.reduce((s,p)=>s+Number(p.total||0),0);
    html+=`<div style="font-family:var(--font-eyebrow);font-size:.72rem;letter-spacing:.6px;text-transform:uppercase;color:var(--pr);margin:14px 0 6px;">${cat} — ${itens.length} lançamento${itens.length>1?'s':''} · ${fmt(subtotal)}</div>`;
    let diaAtual=null;
    itens.forEach(p=>{
      const iso=dataStr(p.created_at).slice(0,10);
      if(iso!==diaAtual){ diaAtual=iso; html+=`<div class="dia-sep">📅 ${rotuloDia(iso)}</div>`; }
      let hora='—'; try{ hora=new Date(dataStr(p.created_at)).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }catch(e){}
      const num=p.numero_sequencial?('#'+p.numero_sequencial+' · '):'';
      html+=`<div class="break-row"><span>${hora} · ${num}${p.client_name||'Cliente'}</span><b>${fmt(p.total)}</b></div>`;
    });
  });
  box.innerHTML=html;
}
function renderTipoVenda(){
  const porTipo={};
  pedidosPeriodo.forEach(p=>{ const k=p.delivery_type||'Não informado'; porTipo[k]=(porTipo[k]||0)+1; });
  document.getElementById('break-tipo').innerHTML=Object.entries(porTipo)
    .sort((a,b)=>b[1]-a[1])
    .map(([k,v])=>`<div class="break-row"><span>${k}</span><b>${v} pedido${v>1?'s':''}</b></div>`).join('')
    || '<div class="empty">Sem dados no período.</div>';
}

// ---- CLIENTES NO PERÍODO ----
function renderClientes(){
  const map={};
  pedidosPeriodo.forEach(p=>{
    const chave=(p.client_phone||p.client_name||'—').toLowerCase();
    map[chave]=(map[chave]||0)+1;
  });
  const totalClientes=Object.keys(map).length;
  const recorrentes=Object.values(map).filter(q=>q>1).length;
  document.getElementById('kpis-clientes').innerHTML=`
    <div class="kpi-card"><div class="kpi-num">${totalClientes}</div><div class="kpi-lbl">Clientes atendidos</div></div>
    <div class="kpi-card"><div class="kpi-num">${recorrentes}</div><div class="kpi-lbl">Voltaram a comprar</div></div>
  `;
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
    const resp=await fetch('/.netlify/functions/dashboard-chat',{
      method:'POST',
      headers:{'content-type':'application/json'},
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

// ---- CORREÇÃO ÚNICA: numerar pedidos antigos que ficaram sem número ----
async function corrigirNumeracaoAntiga(){
  if(!FS) return;
  if(!confirm('Isso vai numerar pedidos antigos que ainda não têm número (mostrados com "—"), sem alterar nenhum número que já existe. Pode levar alguns segundos. Continuar?')) return;
  const btn=document.getElementById('btn-corrigir-numeracao');
  if(btn){ btn.disabled=true; btn.textContent='Corrigindo...'; }
  try{
    const snap=await FS.collection('orders').limit(5000).get();
    const semNumero=snap.docs.filter(d=>!d.data().numero_sequencial && d.data().created_at);
    const porDia={};
    semNumero.forEach(d=>{
      const iso=dataStr(d.data().created_at).slice(0,10);
      if(!iso) return;
      (porDia[iso]=porDia[iso]||[]).push(d);
    });
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
    alert(totalCorrigido>0 ? 'Pronto! '+totalCorrigido+' pedido(s) antigo(s) numerado(s).' : 'Nenhum pedido sem número encontrado — já está tudo certo.');
    carregarRelatorio();
  }catch(e){
    console.error('Erro ao corrigir numeração:',e);
    alert('Não foi possível corrigir a numeração: '+e.message);
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='🔧 Corrigir numeração de pedidos antigos (uma vez)'; }
  }
}

// ---- EXPORTAÇÃO PDF (relatório completo: KPIs, gráficos e tabela de clientes) ----
async function exportarPdf(){
  if(pedidosPeriodo.length===0){ alert('Nenhum pedido no período selecionado.'); return; }
  if(typeof window.jspdf==='undefined'){ alert('Biblioteca de PDF não carregou — verifique a internet e tente de novo.'); return; }

  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'pt',format:'a4'});
  const pageW=doc.internal.pageSize.getWidth();
  let y=40;

  // Cabeçalho
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(230,110,20);
  doc.text('🍕 PIZZA EM DOBRO',40,y);
  doc.setFontSize(11); doc.setTextColor(90,90,90); doc.setFont('helvetica','normal');
  const cfg=PERIODOS.find(p=>p.id===periodoAtivo);
  doc.text('Relatório de Vendas — Período: '+cfg.lbl+'  ·  Gerado em '+new Date().toLocaleString('pt-BR'),40,y+18);
  y+=42;

  // KPIs em texto
  const total=pedidosPeriodo.reduce((s,p)=>s+Number(p.total||0),0);
  const qtd=pedidosPeriodo.length;
  const ticket=qtd?total/qtd:0;
  doc.setFontSize(12); doc.setTextColor(20,20,20); doc.setFont('helvetica','bold');
  doc.text('Faturamento: '+fmt(total)+'      Pedidos: '+qtd+'      Ticket médio: '+fmt(ticket),40,y);
  y+=26;

  // Gráficos (capturados como imagem direto do Chart.js)
  const graficos=[['fat','Faturamento no período'],['pag','Formas de pagamento'],['sab','Pizzas mais pedidas']];
  for(const [key,titulo] of graficos){
    if(!charts[key]) continue;
    if(y>620){ doc.addPage(); y=40; }
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(60,60,60);
    doc.text(titulo,40,y);
    const img=charts[key].toBase64Image();
    doc.addImage(img,'PNG',40,y+8,pageW-80,150);
    y+=170;
  }

  // Tabela de clientes (nome, telefone, pedidos, total gasto)
  const mapCli={};
  pedidosPeriodo.forEach(p=>{
    const chave=(p.client_phone||p.client_name||'—').toLowerCase();
    if(!mapCli[chave]) mapCli[chave]={nome:p.client_name||'—',tel:p.client_phone||'—',qtd:0,total:0};
    mapCli[chave].qtd++;
    mapCli[chave].total+=Number(p.total||0);
    if(p.client_name) mapCli[chave].nome=p.client_name;
  });
  const linhasClientes=Object.values(mapCli).sort((a,b)=>b.total-a.total)
    .map(c=>[c.nome,c.tel,String(c.qtd),fmt(c.total)]);

  doc.addPage(); y=40;
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(230,110,20);
  doc.text('👥 Detalhes dos Clientes',40,y);
  doc.autoTable({
    startY:y+14,
    head:[['Cliente','Telefone','Pedidos','Total Gasto']],
    body:linhasClientes,
    theme:'striped',
    headStyles:{fillColor:[230,110,20]},
    styles:{fontSize:9},
    margin:{left:40,right:40}
  });

  // Tabela de todos os pedidos do período
  const linhasPedidos=pedidosPeriodo
    .sort((a,b)=>dataStr(b.created_at).localeCompare(dataStr(a.created_at)))
    .map(p=>[
      new Date(dataStr(p.created_at)).toLocaleDateString('pt-BR'),
      p.client_name||'—',
      p.client_phone||'—',
      (p.items_json||[]).map(i=>i.name).join(', '),
      p.payment||'—',
      p.delivery_type||'—',
      fmt(p.total)
    ]);
  doc.addPage();
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(230,110,20);
  doc.text('🧾 Todos os Pedidos do Período',40,40);
  doc.autoTable({
    startY:54,
    head:[['Data','Cliente','Telefone','Itens','Pagamento','Tipo','Total']],
    body:linhasPedidos,
    theme:'striped',
    headStyles:{fillColor:[230,110,20]},
    styles:{fontSize:8,cellWidth:'wrap'},
    columnStyles:{3:{cellWidth:170}},
    margin:{left:30,right:30}
  });

  doc.save('relatorio_pizza_em_dobro_'+periodoAtivo+'_'+isoDia(new Date())+'.pdf');
}

// ---- EXPORTAÇÃO CSV ----
function exportarCsv(){
  if(pedidosPeriodo.length===0){ alert('Nenhum pedido no período selecionado.'); return; }
  const linhas=[['Data','Cliente','Telefone','Itens','Pagamento','Tipo','Total']];
  pedidosPeriodo.forEach(p=>{
    linhas.push([
      dataStr(p.created_at),
      (p.client_name||'').replace(/[",\n]/g,' '),
      p.client_phone||'',
      (p.items_json||[]).map(i=>i.name).join(' | ').replace(/[",\n]/g,' '),
      p.payment||'',
      p.delivery_type||'',
      Number(p.total||0).toFixed(2)
    ]);
  });
  const csv=linhas.map(l=>l.map(c=>`"${c}"`).join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='relatorio_'+periodoAtivo+'_'+isoDia(new Date())+'.csv';
  a.click();
  URL.revokeObjectURL(url);
}

renderChipsPeriodo();
if(iniciarFirebase()){ carregarRelatorio(); }
else{ document.getElementById('kpis').innerHTML='<div class="empty">⚠️ Sem conexão com o banco de dados.</div>'; }
