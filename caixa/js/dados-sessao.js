// ══════════════════════════════════════════════════════════
//  CAIXA / PDV v2 — Pizza em Dobro (uso interno da equipe)
//  Cardápio idêntico ao index.html (preços não alterados aqui).
// ══════════════════════════════════════════════════════════

let DEFAULT_MENU=[
  {id:1,  n:'Alho Frito',                  d:'Molho, mussarela, alho frito, orégano e azeitona',                                        p:37.99,cat:'p'},
  {id:2,  n:'Calabresa',                   d:'Molho, calabresa, cebola, orégano e azeitona',                                              p:33.99,cat:'p'},
  {id:3,  n:'Calabresa Piry',              d:'Molho, calabresa, catupiry, orégano e azeitona',                                           p:37.99,cat:'p'},
  {id:4,  n:'Frango Catupiry',             d:'Molho, frango desfiado, catupiry, orégano e azeitona',                                     p:37.99,cat:'p'},
  {id:5,  n:'Marguerita',                  d:'Molho, mussarela, parmesão, manjericão, orégano e azeitona',                               p:37.99,cat:'p'},
  {id:6,  n:'Milho',                       d:'Molho, mussarela, milho, orégano e azeitona',                                             p:37.99,cat:'p'},
  {id:7,  n:'Mussarela',                   d:'Molho, mussarela, tomate, orégano e azeitona',                                              p:33.99,cat:'p'},
  {id:8,  n:'Napolitana',                  d:'Molho, mussarela, parmesão, tomate e orégano',                                             p:37.00,cat:'p'},
  {id:9,  n:'Palmito',                     d:'Molho, mussarela, palmito, orégano e azeitona',                                           p:37.99,cat:'p'},
  {id:10, n:'5 Queijos',                   d:'Molho, requeijão cremoso, mussarela, parmesão, gorgonzola, cheddar, orégano e azeitona',  p:45.99,cat:'s'},
  {id:11, n:'Atum',                        d:'Molho, atum, mussarela, cebola, orégano e azeitona',                                     p:45.99,cat:'s'},
  {id:12, n:'Bacon',                       d:'Molho, mussarela, bacon, alho frito, orégano e azeitona',                                 p:40.99,cat:'s'},
  {id:13, n:'Bauru',                       d:'Molho, presunto, mussarela, tomate, orégano e azeitona',                                  p:40.99,cat:'s'},
  {id:14, n:'Brocolis com Bacon',          d:'Molho, mussarela, brócolis, bacon, alho frito, orégano e azeitona',                      p:45.99,cat:'s'},
  {id:15, n:'Calabresa Cheddar',           d:'Molho, calabresa, cheddar, orégano e azeitonas',                                         p:45.99,cat:'s'},
  {id:16, n:'Frambacon',                   d:'Molho, frango desfiado, mussarela, bacon, alho frito, orégano e azeitona',                p:45.99,cat:'s'},
  {id:17, n:'Franqueijo',                  d:'Molho, frango desfiado, mussarela, orégano e azeitona',                                   p:40.99,cat:'s'},
  {id:18, n:'Franqueijo Piry',             d:'Molho, frango desfiado, mussarela, catupiry, orégano e azeitona',                         p:45.99,cat:'s'},
  {id:19, n:'Lombo',                       d:'Molho, mussarela, lombo, cebola, orégano e azeitona',                                    p:45.99,cat:'s'},
  {id:20, n:'Peito de Peru',               d:'Molho, mussarela, peito de peru, tomate, orégano e azeitona',                            p:45.99,cat:'s'},
  {id:21, n:'Peperone',                    d:'Molho, mussarela, peperone, cebola, orégano e azeitona',                                 p:45.99,cat:'s'},
  {id:22, n:'Portuguesa',                  d:'Molho, mussarela, presunto, ovo, palmito, ervilha, orégano e azeitona',                   p:40.99,cat:'s'},
  {id:23, n:'Quatro Queijos',              d:'Molho, mussarela, parmesão, requeijão cremoso, gorgonzola, orégano e azeitona',           p:40.99,cat:'s'},
  {id:24, n:'Toscana',                     d:'Molho, calabresa, mussarela, cebola, orégano e azeitona',                                 p:40.99,cat:'s'},
  {id:25, n:'Toscana Cheddar',             d:'Molho, calabresa, cebola, cheddar, mussarela, orégano e azeitonas',                      p:45.99,cat:'s'},
  {id:26, n:'Toscana Piry',               d:'Molho, calabresa, mussarela, catupiry, orégano e azeitona',                               p:45.99,cat:'s'},
  {id:45, n:'Baiana',                     d:'Molho, mussarela, calabresa, cebola, ovo, pimenta calabresa, azeitona e orégano',          p:45.99,cat:'s'},
  {id:27, n:'Brigadeirão',                d:'Sobremesa',                                                                               p:6.99, cat:'dw'},
  {id:28, n:'Pizza Doce Brigadeiro',      d:'Chocolate e granulado',                                                                   p:40.99,cat:'dw'},
  {id:29, n:'Pizza Doce Confeti',         d:'Chocolate e confetes',                                                                    p:40.99,cat:'dw'},
  {id:30, n:'Pizza Doce Dois Amores',     d:'Chocolate preto e chocolate branco',                                                      p:40.99,cat:'dw'},
  {id:31, n:'Pizza Doce Prestígio',       d:'Chocolate e coco ralado',                                                                 p:40.99,cat:'dw'},
  {id:32, n:'Pizza Doce Romeu e Julieta', d:'Mussarela e goiabada',                                                                   p:40.99,cat:'dw'},
  {id:33, n:'Pudim Chandelle',            d:'Sobremesa',                                                                               p:6.99, cat:'dw'},
  {id:34, n:'Calzone Doce Brigadeiro',    d:'Chocolate e granulado',                                                                   p:35.99,cat:'cz'},
  {id:35, n:'Calzone Doce Confeti',       d:'Chocolate e confetes',                                                                    p:35.99,cat:'cz'},
  {id:36, n:'Calzone Doce Dois Amores',   d:'Chocolate preto e chocolate branco',                                                      p:35.99,cat:'cz'},
  {id:37, n:'Calzone Doce Prestígio',     d:'Chocolate e coco ralado',                                                                 p:35.99,cat:'cz'},
  {id:38, n:'Calzone Doce Romeu e Julieta',d:'Mussarela e goiabada',                                                                  p:35.99,cat:'cz'},
  {id:39, n:'Água 500ml',                 d:'Gelada',                                                                                  p:5.99, cat:'d'},
  {id:40, n:'Cerveja lata 350ml',         d:'Gelada',                                                                                  p:5.99, cat:'d'},
  {id:41, n:'Coca-Cola 1.5L',             d:'Gelada',                                                                                  p:13.99,cat:'d'},
  {id:42, n:'Fanta 1.5L',                 d:'Gelada',                                                                                  p:13.99,cat:'d'},
  {id:43, n:'Kuat 2L',                    d:'Gelada',                                                                                  p:10.99,cat:'d'},
  {id:44, n:'Tubaína 2L',                 d:'Regional',                                                                                p:10.99,cat:'d'},
  {id:46, n:'Del Valle',                  d:'Suco gelado',                                                                             p:8.00, cat:'d'},
];
const BORDAS_DEFAULT=[
  {name:'Sem Borda Recheada',price:0},{name:'Catupiry',price:10},{name:'Cheddar',price:10},
  {name:'Mussarela',price:15},{name:'Presunto',price:15},{name:'Tampinha',price:15},
  {name:'Chocolate',price:15}
];
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
const CATS_ORDER=['p','s','co','dw','cz','d'];
const CATLABELS={p:'Tradicionais',s:'Especiais',co:'Combos',dw:'Doces',cz:'Calzones',d:'Bebidas'};
function itemAceitaOpcoes(cat){ return cat==='p'||cat==='s'; }
// fmt() agora vem de shared/utils.js
function getIngredientes(desc){
  return desc.split(',').map(s=>s.trim()).filter(Boolean);
}

// ---- FIREBASE ----
// Fallback de segurança: se por cache/CDN o shared/utils.js não tiver carregado,
// define aqui também — assim a tela nunca quebra por isso.
if(typeof fmt==='undefined'){ window.fmt=function(v){ return 'R$ '+Number(v||0).toFixed(2).replace('.',','); }; }
if(typeof dataStr==='undefined'){ window.dataStr=function(v){ if(!v) return ''; if(typeof v==='string') return v; if(v.toDate) try{ return v.toDate().toISOString(); }catch(e){ return ''; } return ''; }; }
if(typeof categoriaPagamento==='undefined'){ window.categoriaPagamento=function(raw){ const p=(raw||'').toLowerCase(); if(p.includes('crédito')||p.includes('credito')) return 'Cartão de Crédito'; if(p.includes('débito')||p.includes('debito')) return 'Cartão de Débito'; if(p.includes('pix')) return 'Pix'; if(p.includes('dinheiro')) return 'Dinheiro'; if(p.includes('cart')) return 'Cartão (não especificado)'; return raw?raw:'Não informado'; }; }
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

// ---- ABERTURA / FECHAMENTO DE CAIXA ----
let sessaoCaixaAtual=null; // {id, valor_abertura, aberto_em}

async function verificarSessaoCaixa(){
  if(!FS) return;
  try{
    const snap=await FS.collection('caixa_sessoes').where('aberto','==',true).limit(1).get();
    if(!snap.empty){
      const doc=snap.docs[0];
      sessaoCaixaAtual={id:doc.id,...doc.data()};
      mostrarCaixaAberto();
    }else{
      sessaoCaixaAtual=null;
      mostrarCaixaFechado();
    }
  }catch(e){
    // se a checagem falhar (ex: rede instável), não trava a venda por causa disso
    console.warn('Não foi possível checar a sessão do caixa, seguindo sem travar:',e);
  }
}

function mostrarCaixaFechado(){
  const overlay=document.getElementById('caixa-lock-overlay');
  const banner=document.getElementById('caixa-status-banner');
  if(overlay) overlay.style.display='flex';
  if(banner) banner.style.display='none';
}

function mostrarCaixaAberto(){
  const overlay=document.getElementById('caixa-lock-overlay');
  const banner=document.getElementById('caixa-status-banner');
  const valorEl=document.getElementById('caixa-status-valor');
  if(overlay) overlay.style.display='none';
  if(banner) banner.style.display='flex';
  if(valorEl && sessaoCaixaAtual) valorEl.textContent=fmt(sessaoCaixaAtual.valor_abertura);
}

async function abrirCaixa(){
  if(!FS){ alert('Sem conexão com o banco agora. Tente novamente em instantes.'); return; }
  const input=document.getElementById('caixa-valor-abertura');
  const valor=Number(input && input.value)||0;
  try{
    const ref=await FS.collection('caixa_sessoes').add({
      aberto:true,
      valor_abertura:valor,
      aberto_em:new Date().toISOString(),
      fechado_em:null
    });
    sessaoCaixaAtual={id:ref.id, aberto:true, valor_abertura:valor, aberto_em:new Date().toISOString()};
    mostrarCaixaAberto();
  }catch(e){
    console.error('Erro ao abrir caixa:',e);
    alert('Não foi possível abrir o caixa agora. Tente de novo.');
  }
}

async function fecharCaixa(){
  if(!sessaoCaixaAtual){ return; }
  if(!confirm('Tem certeza que quer fechar o caixa? Isso encerra o turno atual.')) return;
  try{
    const agora=new Date().toISOString();
    // resumo de vendas desde a abertura, por forma de pagamento (não conta cancelados)
    const snap=await FS.collection('orders')
      .where('created_at','>=',sessaoCaixaAtual.aberto_em)
      .get();
    const resumo={};
    let totalGeral=0;
    snap.docs.forEach(d=>{
      const o=d.data();
      if(o.status==='cancelado') return;
      const cat=categoriaPagamento(o.payment);
      resumo[cat]=(resumo[cat]||0)+Number(o.total||0);
      totalGeral+=Number(o.total||0);
    });
    await FS.collection('caixa_sessoes').doc(sessaoCaixaAtual.id).set({
      aberto:false, fechado_em:agora, resumo_fechamento:resumo, total_fechamento:totalGeral
    },{merge:true});
    sessaoCaixaAtual=null;
    mostrarCaixaFechado();
  }catch(e){
    console.error('Erro ao fechar caixa:',e);
    alert('Não foi possível fechar o caixa agora. Tente de novo.');
  }
}

// ---- ESTADO ----
let catAtiva='p';
let cart=[]; // {id,name,unitPrice,qty,borda,removedIng,isMeia,halfNames}
let itemEmEdicao=null; // {menuItem, borda, removidos:[], acrescimos:[]}
let meiaAMeiaAtivo=false;
let meiaPrimeiraMetade=null; // guarda a 1ª pizza escolhida no modo meia a meia
let pagamentoSelecionado='Dinheiro';
let motoboys=[];
let pedidoEmEdicaoId=null; // se setado, finalizarVenda() ATUALIZA esse pedido em vez de criar um novo

