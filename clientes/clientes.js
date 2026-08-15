// ══════════════════════════════════════════════════════════
//  CLIENTES — Pizza em Dobro
//  Somente LEITURA da coleção 'orders'. Agrega por telefone (ou nome)
//  para montar o mini perfil de cada cliente.
//  "Foto" = avatar com iniciais (não há armazenamento de foto real
//  no momento; se no futuro o login social salvar foto de perfil,
//  basta trocar o avatar por <img src="...">).
// ══════════════════════════════════════════════════════════



// Fallback de segurança: se por cache/CDN o shared/utils.js não tiver carregado,
// define aqui também — assim a tela nunca quebra por isso.
if(typeof fmt==='undefined'){ window.fmt=function(v){ return 'R$ '+Number(v||0).toFixed(2).replace('.',','); }; }
if(typeof toMillis==='undefined'){ window.toMillis=function(v){ if(!v) return 0; if(v.toMillis) return v.toMillis(); const t=new Date(v).getTime(); return isNaN(t)?0:t; }; }

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
function fmtData(iso){ try{return new Date(iso).toLocaleDateString('pt-BR');}catch{return '—';} }
// toMillis() agora vem de shared/utils.js
function iniciais(nome){
  const partes=(nome||'?').trim().split(/\s+/);
  return ((partes[0]?.[0]||'')+(partes[1]?.[0]||'')).toUpperCase()||'?';
}

let clientesMap=[];

async function carregarClientes(){
  const lista=document.getElementById('lista');
  if(!FS){ lista.innerHTML='<div class="empty"><span>⚠️</span>Sem conexão com o banco de dados.</div>'; return; }
  try{
    let pedidos;
    try{
      const snap=await FS.collection('orders').orderBy('created_at','desc').limit(1000).get();
      pedidos=snap.docs.map(d=>({id:d.id,...d.data()}));
    }catch(erroOrdenado){
      // alguns pedidos guardam a data como texto e outros como timestamp — se a busca ordenada falhar,
      // busca sem ordenar direto no banco e organiza aqui mesmo, sem quebrar a tela
      console.warn('Busca ordenada falhou, tentando sem ordenar:',erroOrdenado);
      const snap=await FS.collection('orders').limit(1000).get();
      pedidos=snap.docs.map(d=>({id:d.id,...d.data()}));
      pedidos.sort((a,b)=>{
        const da=a.created_at?.toMillis ? a.created_at.toMillis() : new Date(a.created_at||0).getTime();
        const db_=b.created_at?.toMillis ? b.created_at.toMillis() : new Date(b.created_at||0).getTime();
        return db_-da;
      });
    }
    agregarClientes(pedidos);
    renderResumo();
    renderLista();
  }catch(e){
    console.error('Erro ao carregar clientes:',e);
    lista.innerHTML='<div class="empty"><span>⚠️</span>Não foi possível carregar os clientes.<br><span style="font-size:.68rem;">Verifique a conexão.</span><br><span style="font-size:.6rem;opacity:.7;">'+(e.message||'')+'</span></div>';
  }
}

function agregarClientes(pedidos){
  const map={};
  pedidos.forEach(p=>{
    const chave=(p.client_phone||p.client_email||p.client_name||'—').toString().trim().toLowerCase();
    if(!map[chave]){
      map[chave]={
        nome:p.client_name||'Cliente sem nome',
        telefone:p.client_phone||null,
        email:p.client_email||null,
        uid:p.client_uid||null,
        endereco:p.address?(p.address+(p.house_number?', '+p.house_number:'')):null,
        pedidos:[],
        total:0
      };
    }
    map[chave].pedidos.push(p);
    map[chave].total+=Number(p.total||0);
    if(p.client_name) map[chave].nome=p.client_name;
    if(p.client_email) map[chave].email=p.client_email;
    if(p.client_uid) map[chave].uid=p.client_uid;
    if(p.address && !map[chave].endereco) map[chave].endereco=p.address+(p.house_number?', '+p.house_number:'');
  });
  clientesMap=Object.values(map).map(c=>({
    ...c,
    qtd:c.pedidos.length,
    ultimo:c.pedidos.reduce((max,p)=>(toMillis(p.created_at)>toMillis(max)?p.created_at:max),c.pedidos[0]?.created_at||''),
    logado: !!(c.uid || c.email)
  })).sort((a,b)=>toMillis(b.ultimo)-toMillis(a.ultimo));
}

function renderResumo(){
  const totalClientes=clientesMap.length;
  const recorrentes=clientesMap.filter(c=>c.qtd>1).length;
  const logados=clientesMap.filter(c=>c.logado).length;
  document.getElementById('summary').innerHTML=`
    <div class="summary-item"><div class="summary-num">${totalClientes}</div><div class="summary-lbl">Clientes</div></div>
    <div class="summary-item"><div class="summary-num">${recorrentes}</div><div class="summary-lbl">Recorrentes</div></div>
    <div class="summary-item"><div class="summary-num">${logados}</div><div class="summary-lbl">Com login</div></div>
  `;
}

function renderLista(){
  const termo=(document.getElementById('busca').value||'').toLowerCase().trim();
  const tresDiasAtras=new Date(); tresDiasAtras.setDate(tresDiasAtras.getDate()-3);
  const limiteISO=tresDiasAtras.toISOString().slice(0,10);
  const filtrados=clientesMap.filter(c=>{
    if(termo) return c.nome.toLowerCase().includes(termo) || (c.telefone||'').includes(termo);
    return (c.ultimo||'') >= limiteISO; // sem busca: só quem comprou nos últimos 3 dias
  });
  const lista=document.getElementById('lista');
  document.getElementById('aviso-periodo').style.display = termo ? 'none' : 'block';
  if(filtrados.length===0){
    lista.innerHTML = termo
      ? '<div class="empty"><span>🔍</span>Nenhum cliente encontrado.</div>'
      : '<div class="empty"><span>🕒</span>Nenhum cliente nos últimos 3 dias.<br><span style="font-size:.68rem;">Busque por nome ou telefone para ver clientes mais antigos.</span></div>';
    return;
  }
  lista.innerHTML=filtrados.map(c=>`
    <div class="cli-card" onclick="abrirHist(${clientesMap.indexOf(c)})">
      <div class="cli-avatar">${iniciais(c.nome)}</div>
      <div class="cli-body">
        <div class="cli-top">
          <span class="cli-nome">${c.nome}</span>
          <span class="cli-badge ${c.qtd>1?'':'novo'}">${c.qtd>1?'Recorrente':'Novo'}</span>
        </div>
        <div class="cli-meta">
          <span>${c.telefone||'sem telefone'}</span>
          ${c.logado?'<span class="cli-login">🔐 Login</span>':''}
          <span>último em ${fmtData(c.ultimo)}</span>
        </div>
        <div class="cli-stats">
          <span>Pedidos: <b>${c.qtd}</b></span>
          <span>Total: <b>${fmt(c.total)}</b></span>
        </div>
      </div>
    </div>`).join('');
}

function abrirHist(idx){
  const c=clientesMap[idx];
  if(!c) return;
  document.getElementById('hist-avatar').textContent=iniciais(c.nome);
  document.getElementById('hist-nome').textContent=c.nome;
  document.getElementById('hist-login').textContent=c.logado?'🔐 Cliente com login no site':'👤 Cliente sem login (pedido avulso)';
  document.getElementById('hist-tel').textContent=c.telefone||'—';
  document.getElementById('hist-email').textContent=c.email||'—';
  document.getElementById('hist-endereco').textContent=c.endereco||'—';
  const waBtn=document.getElementById('hist-whatsapp');
  if(c.telefone){
    const digitos=c.telefone.replace(/\D/g,'');
    const comDDI=digitos.length<=11?'55'+digitos:digitos; // adiciona código do Brasil se não tiver
    waBtn.href='https://wa.me/'+comDDI;
    waBtn.style.display='inline-flex';
  }else{
    waBtn.style.display='none';
  }
  document.getElementById('hist-lista').innerHTML=c.pedidos
    .sort((a,b)=>toMillis(b.created_at)-toMillis(a.created_at))
    .map(p=>`
      <div class="hist-row">
        <div>
          <div>${(p.items_json||[]).map(i=>i.name).join(', ')||'—'}</div>
          <div class="d">${fmtData(p.created_at)} · ${p.payment||'—'} · ${p.delivery_type||'—'}</div>
        </div>
        <div>${fmt(p.total)}</div>
      </div>`).join('');
  document.getElementById('modal-hist').classList.add('open');
}
function fecharHist(){ document.getElementById('modal-hist').classList.remove('open'); }

if(iniciarFirebase()){ carregarClientes(); }
