// ══════════════════════════════════════════════════════════
//  DASHBOARD — Pizza em Dobro
//  REGRA DE OURO: nada pode ficar invisível esperando uma biblioteca
//  externa ou o Firestore responder. Tudo já nasce visível no HTML/CSS;
//  Three.js / GSAP / Anime.js / Motion.dev só ENRIQUECEM por cima,
//  nunca são pré-requisito pra ver o conteúdo.
// ══════════════════════════════════════════════════════════

function fmt(v){ return 'R$ '+Number(v||0).toFixed(2).replace('.',','); }
function isoDia(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

// ── saudação por horário (sempre roda, não depende de nada) ──
(function saudacao(){
  const h=new Date().getHours();
  const txt=h<12?'Bom dia ☀️':h<18?'Boa tarde 🍕':'Boa noite 🔥';
  const el=document.getElementById('hero-title');
  if(el) el.textContent=txt;
})();

// ══════════════════════════════════
//  THREE.JS — brasas subindo no hero (decorativo, 100% opcional)
// ══════════════════════════════════
function iniciarBrasas(){
  try{
    if(typeof THREE==='undefined') return;
    const canvas=document.getElementById('embers-canvas');
    if(!canvas) return;
    const hero=canvas.parentElement;
    const w=hero.clientWidth, h=hero.clientHeight;
    if(!w||!h) return;

    const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
    renderer.setSize(w,h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));

    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(50,w/h,0.1,100);
    camera.position.z=12;

    const COUNT=40;
    const geo=new THREE.BufferGeometry();
    const pos=new Float32Array(COUNT*3);
    const speeds=[];
    for(let i=0;i<COUNT;i++){
      pos[i*3]=(Math.random()-0.5)*16;
      pos[i*3+1]=(Math.random()-0.5)*8;
      pos[i*3+2]=(Math.random()-0.5)*6;
      speeds.push(0.01+Math.random()*0.02);
    }
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const mat=new THREE.PointsMaterial({color:0xff9f1c,size:0.14,transparent:true,opacity:0.85});
    const points=new THREE.Points(geo,mat);
    scene.add(points);

    function animate(){
      requestAnimationFrame(animate);
      const p=geo.attributes.position.array;
      for(let i=0;i<COUNT;i++){
        p[i*3+1]+=speeds[i];
        p[i*3]+=Math.sin(Date.now()*0.001+i)*0.002;
        if(p[i*3+1]>4){ p[i*3+1]=-4; p[i*3]=(Math.random()-0.5)*16; }
      }
      geo.attributes.position.needsUpdate=true;
      renderer.render(scene,camera);
    }
    animate();

    window.addEventListener('resize',()=>{
      try{
        const nw=hero.clientWidth, nh=hero.clientHeight;
        renderer.setSize(nw,nh);
        camera.aspect=nw/nh;
        camera.updateProjectionMatrix();
      }catch(e){}
    });
  }catch(e){
    console.warn('Efeito de brasas (Three.js) não pôde iniciar — seguindo sem ele.',e);
  }
}

// ══════════════════════════════════
//  GSAP — realce visual em cima do que já está visível (opcional)
// ══════════════════════════════════
function aplicarRealceGsap(seletor){
  try{
    if(typeof gsap==='undefined') return;
    document.querySelectorAll(seletor).forEach(el=>{
      gsap.from(el,{opacity:0,y:14,duration:.5,ease:'power2.out'});
    });
  }catch(e){
    console.warn('Animação GSAP falhou — conteúdo já está visível de qualquer forma.',e);
  }
}

// ══════════════════════════════════
//  MOTION.DEV — micro-interação de hover/tap (opcional)
// ══════════════════════════════════
function ativarMicroInteracoes(){
  try{
    if(typeof Motion==='undefined') return;
    document.querySelectorAll('.kpi-card,.manage-card,.top-row').forEach(el=>{
      el.addEventListener('pointerenter',()=>Motion.animate(el,{scale:1.03},{duration:.18}));
      el.addEventListener('pointerleave',()=>Motion.animate(el,{scale:1},{duration:.18}));
    });
  }catch(e){
    console.warn('Motion.dev não pôde iniciar — sem micro-interação de hover.',e);
  }
}

// ══════════════════════════════════
//  ANIME.JS — contagem animada dos números (com fallback direto)
// ══════════════════════════════════
function animarNumero(el,valorFinal,ehMoeda){
  if(!el) return;
  try{
    if(typeof anime==='undefined'){ el.textContent=ehMoeda?fmt(valorFinal):valorFinal; return; }
    const obj={v:0};
    anime({
      targets:obj, v:valorFinal, round:ehMoeda?100:1, duration:900, easing:'easeOutExpo',
      update:()=>{ el.textContent = ehMoeda ? fmt(obj.v) : Math.round(obj.v); }
    });
  }catch(e){
    el.textContent=ehMoeda?fmt(valorFinal):valorFinal;
  }
}

// ══════════════════════════════════
//  FIREBASE — carregado separado, com verificação
// ══════════════════════════════════
let FS=null;
function iniciarFirebase(){
  try{
    if(typeof firebase==='undefined'){
      console.error('Firebase não carregou (CDN bloqueada ou sem internet).');
      return false;
    }
    const _fbCfg={apiKey:"AIzaSyBLLQy93cqeAVivrIDbO1VCA01FgkXSQME",authDomain:"pizza-em-dobro-b525b.firebaseapp.com",projectId:"pizza-em-dobro-b525b",storageBucket:"pizza-em-dobro-b525b.firebasestorage.app",messagingSenderId:"528538209807",appId:"1:528538209807:web:37bfb998dbdb0f932b9d7a"};
    if(!firebase.apps.length) firebase.initializeApp(_fbCfg);
    FS=firebase.firestore();
    return true;
  }catch(e){
    console.error('Erro ao iniciar Firebase:',e);
    return false;
  }
}

// ══════════════════════════════════
//  DADOS
// ══════════════════════════════════
async function carregarDashboard(){
  if(!FS){
    document.getElementById('kpis-hoje').innerHTML='<div class="empty">⚠️ Não foi possível conectar ao banco de dados. Verifique sua internet e recarregue a página.</div>';
    return;
  }

  const hoje=new Date();
  const diaHojeISO=isoDia(hoje);
  const seteDiasAtras=new Date(hoje); seteDiasAtras.setDate(hoje.getDate()-6);
  const inicioPeriodo=isoDia(seteDiasAtras)+'T00:00:00-03:00';

  let pedidos=[];
  try{
    const snap=await FS.collection('orders')
      .where('created_at','>=',inicioPeriodo)
      .orderBy('created_at','desc')
      .limit(1000)
      .get();
    pedidos=snap.docs.map(d=>d.data());
  }catch(e){
    console.error('Erro ao carregar pedidos para dashboard:',e);
    document.getElementById('kpis-hoje').innerHTML='<div class="empty">⚠️ Não foi possível carregar os pedidos. Verifique a conexão.</div>';
    return;
  }

  const pedidosHoje=pedidos.filter(p=>(p.created_at||'').startsWith(diaHojeISO));
  const faturamentoHoje=pedidosHoje.reduce((s,p)=>s+Number(p.total||0),0);
  const qtdHoje=pedidosHoje.length;
  const ticketMedio=qtdHoje?faturamentoHoje/qtdHoje:0;
  const entregasHoje=pedidosHoje.filter(p=>p.delivery_type==='entrega').length;

  document.getElementById('kpis-hoje').innerHTML=`
    <div class="kpi-card"><div class="kpi-num" id="kn-fat">R$ 0,00</div><div class="kpi-lbl">Faturamento</div></div>
    <div class="kpi-card"><div class="kpi-num" id="kn-ped">0</div><div class="kpi-lbl">Pedidos</div></div>
    <div class="kpi-card"><div class="kpi-num" id="kn-tkt">R$ 0,00</div><div class="kpi-lbl">Ticket médio</div></div>
    <div class="kpi-card"><div class="kpi-num" id="kn-ent">0</div><div class="kpi-lbl">Entregas</div></div>
  `;
  animarNumero(document.getElementById('kn-fat'),faturamentoHoje,true);
  animarNumero(document.getElementById('kn-ped'),qtdHoje,false);
  animarNumero(document.getElementById('kn-tkt'),ticketMedio,true);
  animarNumero(document.getElementById('kn-ent'),entregasHoje,false);

  // ---- Faturamento últimos 7 dias ----
  const dias=[];
  for(let i=6;i>=0;i--){
    const d=new Date(hoje); d.setDate(hoje.getDate()-i);
    dias.push({iso:isoDia(d), lbl:d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')});
  }
  const totaisPorDia=dias.map(d=>({
    ...d,
    total: pedidos.filter(p=>(p.created_at||'').startsWith(d.iso)).reduce((s,p)=>s+Number(p.total||0),0)
  }));
  const maxTotal=Math.max(1,...totaisPorDia.map(d=>d.total));
  document.getElementById('bars-7dias').innerHTML=totaisPorDia.map((d,i)=>`
    <div class="bar-row">
      <div class="bar-lbl">${d.lbl}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((d.total/maxTotal)*100)}%" id="bar-${i}"></div></div>
      <div class="bar-val">${fmt(d.total)}</div>
    </div>`).join('');

  // ---- Sabores mais vendidos (7 dias) ----
  const contagem={};
  pedidos.forEach(p=>{
    (p.items_json||[]).forEach(it=>{
      const nome=it.name||'—';
      contagem[nome]=(contagem[nome]||0)+1;
    });
  });
  const ranking=Object.entries(contagem).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const topBox=document.getElementById('top-sabores');
  if(ranking.length===0){
    topBox.innerHTML='<div class="empty">Sem vendas no período.</div>';
  }else{
    topBox.innerHTML=ranking.map(([nome,qtd])=>`
      <div class="top-row"><span>${nome}</span><span class="qtd">${qtd}×</span></div>`).join('');
  }

  document.getElementById('updated-at').textContent='Atualizado às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

  // realce visual por cima do conteúdo (que já está 100% visível e funcional)
  aplicarRealceGsap('.kpi-card');
  aplicarRealceGsap('.bar-row');
  aplicarRealceGsap('.top-row');
  ativarMicroInteracoes();
}

// ══════════════════════════════════
//  BOOT — tudo já visível; enriquecimentos por cima, cada um isolado
// ══════════════════════════════════
iniciarBrasas();
aplicarRealceGsap('.nav,.hero-content,.section-title,.manage-card');
ativarMicroInteracoes();

if(iniciarFirebase()){
  carregarDashboard();
  setInterval(carregarDashboard,120000);
} else {
  document.getElementById('kpis-hoje').innerHTML='<div class="empty">⚠️ Não foi possível conectar ao banco de dados. Verifique sua internet e recarregue a página.</div>';
}
