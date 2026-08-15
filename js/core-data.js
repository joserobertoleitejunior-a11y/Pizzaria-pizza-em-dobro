// ══════════════════════════════════
//  FIREBASE
// ══════════════════════════════════
const _fbCfg=FB_CONFIG;
// Fallback de segurança: se por cache/CDN o shared/utils.js não tiver carregado,
// define aqui também — assim o checkout do cliente nunca quebra por isso.
if(typeof obterProximoNumeroSequencial==='undefined'){
  window.obterProximoNumeroSequencial=async function(FSref){
    if(!FSref) return null;
    const d=new Date();
    const hoje=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const ref=FSref.collection('contadores').doc('pedidos_'+hoje);
    try{
      return await FSref.runTransaction(async (t)=>{
        const doc=await t.get(ref);
        const atual=(doc.exists?doc.data().atual:0)+1;
        t.set(ref,{atual},{merge:true});
        return atual;
      });
    }catch(e){ console.warn('Não foi possível gerar o número sequencial do pedido.',e); return null; }
  };
}

let FS,AUTH;
function _initFB(){
  if(FS)return;
  if(typeof firebase==='undefined')return;
  if(!firebase.apps.length)firebase.initializeApp(_fbCfg);
  FS=firebase.firestore();
  AUTH=firebase.auth();
}
// sg — busca coleção com filtros opcionais
const sg=async(col,opts={})=>{
  _initFB();if(!FS)return null;
  try{
    let q=FS.collection(col);
    if(opts.where)opts.where.forEach(w=>{q=q.where(w[0],w[1],w[2]);});
    if(opts.orderBy)q=q.orderBy(opts.orderBy,opts.orderDir||'asc');
    if(opts.limit)q=q.limit(opts.limit);
    const s=await q.get();
    return s.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){console.warn('sg',col,e);return null;}
};
// sp — adiciona doc (ID automático)
const sp=async(col,data)=>{
  _initFB();if(!FS)return;
  try{await FS.collection(col).add({...data,created_at:data.created_at||new Date().toISOString()});}catch(e){console.warn('sp',col,e);}
};
// obterProximoNumeroSequencial(FS) agora vem de shared/utils.js
// su — upsert por campo ID
const su=async(col,data,idField)=>{
  _initFB();if(!FS)return;
  try{const id=String(data[idField]||data.email||Date.now());await FS.collection(col).doc(id).set({...data,updated_at:new Date().toISOString()},{merge:true});}catch(e){console.warn('su',col,e);}
};
// spatch — atualiza doc por ID
const spatch=async(col,id,data)=>{
  _initFB();if(!FS)return;
  try{await FS.collection(col).doc(String(id)).update({...data,updated_at:new Date().toISOString()});}catch(e){console.warn('spatch',col,e);}
};
// sdel — apaga doc por ID
const sdel=async(col,id)=>{
  _initFB();if(!FS)return;
  try{await FS.collection(col).doc(String(id)).delete();}catch(e){console.warn('sdel',col,e);}
};

// ══════════════════════════════════
//  LOCAL DB
// ══════════════════════════════════
const DB={
  get:k=>{try{return JSON.parse(localStorage.getItem('pd_'+k));}catch{return null;}},
  set:(k,v)=>localStorage.setItem('pd_'+k,JSON.stringify(v)),
  inc:k=>{const v=(DB.get(k)||0)+1;DB.set(k,v);return v;}
};

// ══════════════════════════════════
//  CIRURGIA: ADMIN SESSION + HASH
// ══════════════════════════════════
const ADMIN_USER='Marco';
const ADMIN_PASS_DEFAULT=btoa('1234');
let adminSession=false;

function getAdminPass(){
  return DB.get('admin_pass')||ADMIN_PASS_DEFAULT;
}
function checkAdminSession(){
  const s=DB.get('admin_session');
  if(s&&s.exp>Date.now()){adminSession=true;return true;}
  adminSession=false;return false;
}
function mostrarBotaoAbrirCaixa(){
  if(document.getElementById('btn-abrir-caixa-admin')) return;
  const btn=document.createElement('a');
  btn.id='btn-abrir-caixa-admin';
  btn.href='caixa/index.html';
  btn.innerHTML='🧾 Caixa';
  btn.style.cssText='position:fixed;right:16px;bottom:152px;z-index:99999;background:linear-gradient(135deg,#FF9F1C,#E71D36);'+
    'color:#fff;font-family:Oswald,sans-serif;font-weight:700;letter-spacing:.4px;font-size:.8rem;text-transform:uppercase;'+
    'padding:12px 18px;border-radius:30px;text-decoration:none;box-shadow:0 4px 16px rgba(0,0,0,.45);';
  document.body.appendChild(btn);
}
function setAdminSession(){
  DB.set('admin_session',{exp:Date.now()+30*24*60*60*1000}); // 30 dias
  adminSession=true;
}

// ══════════════════════════════════
//  CIRURGIA: CONFIGURAÇÕES
// ══════════════════════════════════
function getCfg(k,def){return DB.get('cfg_'+k)||def;}
function setCfg(k,v){DB.set('cfg_'+k,v);}

function getWhatsApp(){return getCfg('wpp','5515997058390');}
function getEndereco(){return getCfg('end','Itapetininga, SP');}

function openConfig(){
  document.getElementById('cfg-wpp').value=getWhatsApp();
  document.getElementById('cfg-end').value=getEndereco();
  document.getElementById('cfg-pass1').value='';
  document.getElementById('cfg-pass2').value='';
  document.getElementById('cfg-msg').style.display='none';
  openModal('modal-config');
}
function saveConfig(){
  const wpp=document.getElementById('cfg-wpp').value.trim();
  const end=document.getElementById('cfg-end').value.trim();
  const p1=document.getElementById('cfg-pass1').value;
  const p2=document.getElementById('cfg-pass2').value;
  const msg=document.getElementById('cfg-msg');
  if(wpp) setCfg('wpp',wpp);
  if(end) setCfg('end',end);
  if(p1){
    if(p1!==p2){msg.style.display='block';msg.style.color='var(--se)';msg.innerText='Senhas não conferem.';return;}
    DB.set('admin_pass',btoa(p1));
  }
  msg.style.display='block';msg.style.color='#2ecc71';msg.innerText='✓ Configurações salvas!';
  setTimeout(()=>msg.style.display='none',2000);
}

// ══════════════════════════════════
//  PROMOÇÕES — só entrega grátis 2 pizzas (no cart)
// ══════════════════════════════════
const PROMOS_DEFAULT=[];

function getPromos(){return DB.get('promos')||PROMOS_DEFAULT;}

function getPromoAtiva(){
  const dow=new Date().getDay();
  return getPromos().find(p=>p.ativo&&p.dias.includes(dow))||null;
}

function calcDesconto(cartItems){
  const p=getPromoAtiva();
  if(!p) return 0;
  let desc=0;
  if(p.tipo==='pct'){
    cartItems.forEach(it=>{
      if(p.cats&&p.cats.includes(it.cat)) desc+=Number(it.p)*(p.val/100);
    });
  } else if(p.tipo==='fixo'){
    cartItems.forEach(it=>{
      const matchCat=p.cats&&p.cats.includes(it.cat);
      const matchId=p.ids&&p.ids.includes(it.id);
      if(matchCat||matchId) desc+=p.val;
    });
    desc=Math.min(desc,p.val*cartItems.length);
  } else if(p.tipo==='terceira'){
    const elegiv=cartItems.filter(it=>p.cats&&p.cats.includes(it.cat));
    if(elegiv.length>=3){
      const sorted=[...elegiv].sort((a,b)=>a.p-b.p);
      desc=sorted[0].p*(p.val/100);
    }
  } else if(p.tipo==='brinde'){
    const pizzas=cartItems.filter(i=>i.cat==='p'||i.cat==='s');
    if(pizzas.length>=2){
      const beb=cartItems.find(i=>p.cats&&p.cats.includes(i.cat));
      if(beb) desc=beb.p;
    }
  }
  return Math.round(desc*100)/100;
}

function openPromos(){
  const promos=getPromos();
  const dias=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  document.getElementById('promos-list').innerHTML=promos.map(p=>`
    <div class="promo-row">
      <div class="promo-row-name">${p.nome}</div>
      <div class="promo-row-desc">${p.desc}</div>
      <div class="promo-toggle">
        <span style="font-size:.68rem;color:#555;">${p.dias.map(d=>dias[d]).join(', ')}</span>
        <label class="ptog"><input type="checkbox" id="ptog-${p.id}"${p.ativo?' checked':''}><span class="ptog-sl"></span></label>
      </div>
    </div>`).join('');
  openModal('modal-promos');
}
function savePromos(){
  const promos=getPromos();
  promos.forEach(p=>{
    const el=document.getElementById(`ptog-${p.id}`);
    if(el) p.ativo=el.checked;
  });
  DB.set('promos',[]);
  closeModal('modal-promos');
}

// ══════════════════════════════════
//  DEFAULT MENU
// ══════════════════════════════════
const DEFAULT_MENU=[
  {id:1,  n:'Alho Frito',                  d:'Molho, mussarela, alho frito, orégano e azeitona',                                        p:37.99,cat:'p', img:null},
  {id:2,  n:'Calabresa',                   d:'Molho, calabresa, cebola, orégano e azeitona',                                              p:33.99,cat:'p', img:null},
  {id:3,  n:'Calabresa Piry',              d:'Molho, calabresa, catupiry, orégano e azeitona',                                           p:37.99,cat:'p', img:null},
  {id:4,  n:'Frango Catupiry',             d:'Molho, frango desfiado, catupiry, orégano e azeitona',                                     p:37.99,cat:'p', img:null},
  {id:5,  n:'Marguerita',                  d:'Molho, mussarela, parmesão, manjericão, orégano e azeitona',                               p:37.99,cat:'p', img:null},
  {id:6,  n:'Milho',                       d:'Molho, mussarela, milho, orégano e azeitona',                                             p:37.99,cat:'p', img:null},
  {id:7,  n:'Mussarela',                   d:'Molho, mussarela, tomate, orégano e azeitona',                                              p:33.99,cat:'p', img:null},
  {id:8,  n:'Napolitana',                  d:'Molho, mussarela, parmesão, tomate e orégano',                                             p:37.00,cat:'p', img:null},
  {id:9,  n:'Palmito',                     d:'Molho, mussarela, palmito, orégano e azeitona',                                           p:37.99,cat:'p', img:null},
  {id:10, n:'5 Queijos',                   d:'Molho, requeijão cremoso, mussarela, parmesão, gorgonzola, cheddar, orégano e azeitona',  p:45.99,cat:'s', img:null},
  {id:11, n:'Atum',                        d:'Molho, atum, mussarela, cebola, orégano e azeitona',                                     p:45.99,cat:'s', img:null},
  {id:12, n:'Bacon',                       d:'Molho, mussarela, bacon, alho frito, orégano e azeitona',                                 p:40.99,cat:'s', img:null},
  {id:13, n:'Bauru',                       d:'Molho, presunto, mussarela, tomate, orégano e azeitona',                                  p:40.99,cat:'s', img:null},
  {id:14, n:'Brocolis com Bacon',          d:'Molho, mussarela, brócolis, bacon, alho frito, orégano e azeitona',                      p:45.99,cat:'s', img:null},
  {id:15, n:'Calabresa Cheddar',           d:'Molho, calabresa, cheddar, orégano e azeitonas',                                         p:45.99,cat:'s', img:null},
  {id:16, n:'Frambacon',                   d:'Molho, frango desfiado, mussarela, bacon, alho frito, orégano e azeitona',                p:45.99,cat:'s', img:null},
  {id:17, n:'Franqueijo',                  d:'Molho, frango desfiado, mussarela, orégano e azeitona',                                   p:40.99,cat:'s', img:null},
  {id:18, n:'Franqueijo Piry',             d:'Molho, frango desfiado, mussarela, catupiry, orégano e azeitona',                         p:45.99,cat:'s', img:null},
  {id:19, n:'Lombo',                       d:'Molho, mussarela, lombo, cebola, orégano e azeitona',                                    p:45.99,cat:'s', img:null},
  {id:20, n:'Peito de Peru',               d:'Molho, mussarela, peito de peru, tomate, orégano e azeitona',                            p:45.99,cat:'s', img:null},
  {id:21, n:'Peperone',                    d:'Molho, mussarela, peperone, cebola, orégano e azeitona',                                 p:45.99,cat:'s', img:null},
  {id:22, n:'Portuguesa',                  d:'Molho, mussarela, presunto, ovo, palmito, ervilha, orégano e azeitona',                   p:40.99,cat:'s', img:null},
  {id:23, n:'Quatro Queijos',              d:'Molho, mussarela, parmesão, requeijão cremoso, gorgonzola, orégano e azeitona',           p:40.99,cat:'s', img:null},
  {id:24, n:'Toscana',                     d:'Molho, calabresa, mussarela, cebola, orégano e azeitona',                                 p:40.99,cat:'s', img:null},
  {id:25, n:'Toscana Cheddar',             d:'Molho, calabresa, cebola, cheddar, mussarela, orégano e azeitonas',                      p:45.99,cat:'s', img:null},
  {id:26, n:'Toscana Piry',               d:'Molho, calabresa, mussarela, catupiry, orégano e azeitona',                               p:45.99,cat:'s', img:null},
  {id:45, n:'Baiana',                     d:'Molho, mussarela, calabresa, cebola, ovo, pimenta calabresa, azeitona e orégano',          p:45.99,cat:'s', img:null},
  {id:27, n:'Brigadeirão',                d:'Sobremesa',                                                                               p:6.99, cat:'dw',img:null},
  {id:28, n:'Pizza Doce Brigadeiro',      d:'Chocolate e granulado',                                                                   p:40.99,cat:'dw',img:null},
  {id:29, n:'Pizza Doce Confeti',         d:'Chocolate e confetes',                                                                    p:40.99,cat:'dw',img:null},
  {id:30, n:'Pizza Doce Dois Amores',     d:'Chocolate preto e chocolate branco',                                                      p:40.99,cat:'dw',img:null},
  {id:31, n:'Pizza Doce Prestígio',       d:'Chocolate e coco ralado',                                                                 p:40.99,cat:'dw',img:null},
  {id:32, n:'Pizza Doce Romeu e Julieta', d:'Mussarela e goiabada',                                                                   p:40.99,cat:'dw',img:null},
  {id:33, n:'Pudim Chandelle',            d:'Sobremesa',                                                                               p:6.99, cat:'dw',img:null},
  {id:34, n:'Calzone Doce Brigadeiro',    d:'Chocolate e granulado',                                                                   p:35.99,cat:'cz',img:null},
  {id:35, n:'Calzone Doce Confeti',       d:'Chocolate e confetes',                                                                    p:35.99,cat:'cz',img:null},
  {id:36, n:'Calzone Doce Dois Amores',   d:'Chocolate preto e chocolate branco',                                                      p:35.99,cat:'cz',img:null},
  {id:37, n:'Calzone Doce Prestígio',     d:'Chocolate e coco ralado',                                                                 p:35.99,cat:'cz',img:null},
  {id:38, n:'Calzone Doce Romeu e Julieta',d:'Mussarela e goiabada',                                                                  p:35.99,cat:'cz',img:null},
  {id:39, n:'Água 500ml',                 d:'Gelada',                                                                                  p:5.99, cat:'d', img:null},
  {id:40, n:'Cerveja lata 350ml',         d:'Gelada',                                                                                  p:5.99, cat:'d', img:null},
  {id:41, n:'Coca-Cola 1.5L',             d:'Gelada',                                                                                  p:13.99,cat:'d', img:null},
  {id:42, n:'Fanta 1.5L',                 d:'Gelada',                                                                                  p:13.99,cat:'d', img:null},
  {id:43, n:'Kuat 2L',                    d:'Gelada',                                                                                  p:10.99,cat:'d', img:null},
  {id:44, n:'Tubaína 2L',                 d:'Regional',                                                                                p:10.99,cat:'d', img:null},
  {id:46, n:'Del Valle',                  d:'Suco gelado',                                                                             p:8.00, cat:'d', img:null},
];

const BORDAS_DEFAULT=[
  {name:'Sem Borda Recheada',price:0},{name:'Catupiry',price:10},{name:'Cheddar',price:10},
  {name:'Mussarela',price:15},{name:'Presunto',price:15},{name:'Tampinha',price:15},
  {name:'Chocolate',price:15}
];
let BORDAS=DB.get('bordas_custom')||BORDAS_DEFAULT;

const ACRESCIMOS_DEFAULT=[
  {name:'Catupiry Extra',price:5},{name:'Cheddar Extra',price:5},
  {name:'Bacon',price:7},{name:'Calabresa Extra',price:5},
  {name:'Frango Extra',price:6},{name:'Mussarela Extra',price:5},
  {name:'Ovo',price:3},{name:'Palmito',price:5},
  {name:'Milho',price:3},{name:'Cebola',price:2},
  {name:'Tomate',price:2},{name:'Azeitona',price:2},
  {name:'Alho Frito',price:3},{name:'Parmesão',price:4},
  {name:'Peperone',price:6},{name:'Presunto Extra',price:5}
];
let ACRESCIMOS=DB.get('acrescimos_custom')||ACRESCIMOS_DEFAULT;

const CATS={p:'cat-p',s:'cat-s',co:'cat-co',dw:'cat-dw',cz:'cat-cz',d:'cat-d'};
const CATLABELS={p:'Tradicionais',s:'Especiais',co:'Combos',dw:'Doces',cz:'Calzones Doces',d:'Bebidas'};

let menu=[], cart=[], firstHalf=null, currentUser=null, selStars=0, editId=null, adminImg=null;
let autoSaveTimer=null;
// CIRURGIA: Facebook session
let fbUser=null;

