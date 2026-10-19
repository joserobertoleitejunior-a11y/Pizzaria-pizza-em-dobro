// ══════════════════════════════════════════════════════════
//  UTILS COMPARTILHADOS — Pizza em Dobro
//  Funções usadas em mais de um módulo (Caixa, Relatórios,
//  Clientes, Cupom). Mudar aqui muda em todo lugar de uma vez.
// ══════════════════════════════════════════════════════════

function fmt(v){ return 'R$ '+Number(v||0).toFixed(2).replace('.',','); }

// Gera o próximo número sequencial do pedido (reinicia por dia).
// Usa o mesmo contador do Firestore que o bot do WhatsApp (contadores/pedidos_AAAA-MM-DD),
// então a numeração fica sempre única, venha o pedido de onde vier.
// Recebe a instância do Firestore (FS) já inicializada de quem chama.
async function obterProximoNumeroSequencial(FS){
  if(!FS) return null;
  const d=new Date();
  const hoje=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const ref=FS.collection('contadores').doc('pedidos_'+hoje);
  try{
    return await FS.runTransaction(async (t)=>{
      const doc=await t.get(ref);
      const atual=(doc.exists?doc.data().atual:0)+1;
      t.set(ref,{atual},{merge:true});
      return atual;
    });
  }catch(e){ console.warn('Não foi possível gerar o número sequencial do pedido.',e); return null; }
}

// ── Leitura segura de created_at ──
// Hoje toda gravação nova usa string ISO (new Date().toISOString()), sempre igual
// em todos os módulos. Esses helpers só existem pra não quebrar se algum pedido
// muito antigo (de antes dessa padronização) ainda tiver o valor como Timestamp
// do Firebase em vez de string.
function toMillis(v){
  if(!v) return 0;
  if(v.toMillis) return v.toMillis();
  const t=new Date(v).getTime();
  return isNaN(t)?0:t;
}
function dataStr(v){
  if(!v) return '';
  if(typeof v==='string') return v;
  if(v.toDate) try{ return v.toDate().toISOString(); }catch(e){ return ''; }
  return '';
}

// Agrupa a forma de pagamento numa categoria padrão (usado no fechamento de caixa e nos relatórios)
function categoriaPagamento(raw){
  const p=(raw||'').toLowerCase();
  if(p.includes('crédito')||p.includes('credito')) return 'Cartão de Crédito';
  if(p.includes('débito')||p.includes('debito')) return 'Cartão de Débito';
  if(p.includes('pix')) return 'Pix';
  if(p.includes('dinheiro')) return 'Dinheiro';
  if(p.includes('cart')) return 'Cartão (não especificado)';
  return raw ? raw : 'Não informado';
}

// ── Normaliza categoria do cardápio: aceita tanto o código interno (p,s,co,dw,cz,d)
// quanto palavras comuns em português — nunca deixa um item "sumir" por categoria não reconhecida ──
const CATEGORIAS_CARDAPIO={p:'Tradicional',s:'Especial',co:'Combo',dw:'Doce',cz:'Calzone Doce',d:'Bebida'};
function _normalizarCategoriaCardapio(cat){
  const c=(cat||'').trim().toLowerCase();
  if(CATEGORIAS_CARDAPIO[c]) return c;
  const mapa={
    'tradicional':'p','tradicionais':'p','pizza tradicional':'p',
    'especial':'s','especiais':'s','pizza especial':'s',
    'doce':'dw','doces':'dw','pizza doce':'dw','sobremesa':'dw','sobremesas':'dw',
    'calzone':'cz','calzones':'cz','calzone doce':'cz',
    'bebida':'d','bebidas':'d','drink':'d','refrigerante':'d',
    'combo':'co','combos':'co'
  };
  return mapa[c]||'p';
}
// ── Combos "2 por X" — fonte única (site, Caixa e bot do WhatsApp seguem esta lista) ──
const COMBOS_DEFAULT=[
  {id:'combo65', preco:65.00, titulo:'2 Por R$ 65,00', sabores:['Mussarela','Calabresa']},
  {id:'combo75', preco:75.00, titulo:'2 Por R$ 75,00', sabores:['Marguerita','Palmito','Frango Catupiry','Milho','Alho Frito','Calabresa Piry']},
  {id:'combo80', preco:80.00, titulo:'2 Por R$ 80,00', sabores:['Portuguesa','Toscana','4 Queijos','Franqueijo','Bauru','Bacon']},
  {id:'combo85', preco:85.00, titulo:'2 Por R$ 85,00', sabores:['Brócolis com Bacon','Peperone','Franqueijo Piry','Toscana Piry','Bacon','Atum','Lombo','Peito de Peru']}
];

// ── Combo BROTO: 2 pizzas broto por R$ 50,00, QUALQUER sabor (tradicional ou especial), pode repetir ──
const COMBO_BROTO={id:'broto50', preco:50.00, titulo:'2 Broto por R$ 50,00'};

// ── ESFIHAS: R$ 5,00 cada, 6 sabores. O cliente monta o próprio combo: 10 por R$ 50, 20 por R$ 90,
// 30 por R$ 130 (o de 10 custa igual a 10 avulsas). Qualquer quantidade é cobrada pelo MENOR preço
// combinando pacotes de 20/30 + avulsas (ex.: 25 = 20 por 90 + 5 avulsas = R$ 115).
const ESFIHA_SABORES=['Carne','Frango Catupiry','Mussarela','Calabresa','Bacon','Mista'];
const ESFIHA_PRECO_UN=5.00;
const ESFIHA_PACOTES=[{qtd:10,preco:50.00},{qtd:20,preco:90.00},{qtd:30,preco:130.00}];
// ── ENTREGA GRÁTIS: 3 ou mais combos no mesmo pedido (combo de pizza "2 por X", combo broto e
// combos de esfiha — cada 10 esfihas = 1 combo). Muda aqui pra mudar na loja, no Caixa e no WhatsApp.
const COMBOS_ENTREGA_GRATIS=3;
function combosDeEsfiha(n){ return Math.floor((Number(n)||0)/10); }

function precoEsfihas(n){
  n=Math.max(0,Math.floor(Number(n)||0));
  const f=[0];
  for(let i=1;i<=n;i++){
    let m=f[i-1]+ESFIHA_PRECO_UN*100;
    ESFIHA_PACOTES.forEach(pk=>{ if(i>=pk.qtd) m=Math.min(m,f[i-pk.qtd]+pk.preco*100); });
    f[i]=m;
  }
  return f[n]/100;
}
// contagens: {Carne:4, Mista:6} → "Esfihas (10) — 4 Carne + 6 Mista"
function nomeEsfihas(contagens){
  const partes=ESFIHA_SABORES.filter(sab=>(contagens[sab]||0)>0).map(sab=>`${contagens[sab]} ${sab}`);
  const total=ESFIHA_SABORES.reduce((t,sab)=>t+(contagens[sab]||0),0);
  return `Esfihas (${total}) — ${partes.join(' + ')}`;
}

// Resolve a faixa de combo certa a partir dos 2 sabores (usado pelo Colar Pedido — ver caixa/js/colar-pedido.js).
// Nunca adivinha: se uma faixa explícita foi informada e bate com os 2 sabores, usa ela; senão só
// resolve sozinho quando os 2 sabores pertencem a UMA ÚNICA faixa (alguns sabores existem em mais
// de uma faixa, ex: "Bacon" está em 2 por 80 E 2 por 85 — nesse caso, sem faixa explícita, retorna
// null em vez de arriscar cobrar o preço errado).
function resolverFaixaCombo(sabor1, sabor2, faixaPrecoExplicita){
  if(!sabor1||!sabor2||sabor1===sabor2) return null;
  if(faixaPrecoExplicita){
    const porPreco=COMBOS_DEFAULT.find(c=>c.preco===Number(faixaPrecoExplicita));
    if(porPreco && porPreco.sabores.includes(sabor1) && porPreco.sabores.includes(sabor2)) return porPreco;
  }
  const candidatos=COMBOS_DEFAULT.filter(c=>c.sabores.includes(sabor1)&&c.sabores.includes(sabor2));
  return candidatos.length===1 ? candidatos[0] : null;
}

// Decompõe o nome de um item do carrinho nos sabores reais que ele representa — usado pelo
// ranking "sabores mais vendidos" do Dashboard (relatorios.js). Sem isso, um combo salvo como
// "2 Por R$ 65,00 — Mussarela + Calabresa" ou um meio a meio salvo como "Meio a Meio: Toscana /
// Frango Catupiry" aparecem no ranking como um "sabor" composto raro, e NUNCA contam pro sabor
// de verdade — o que faz o gráfico mentir bem pros sabores que mais vendem via combo/meio a meio.
function decomporSaboresItem(nome){
  const n=(nome||'').trim();
  if(!n) return [];
  let m=n.match(/^Meio a Meio:\s*(.+?)\s*\/\s*(.+)$/);
  if(m) return [m[1].trim(), m[2].trim()];
  m=n.match(/^2 (?:Por|Broto por) R\$\s*[\d.,]+\s*—\s*(.+?)\s*\+\s*(.+)$/i);
  if(m) return [m[1].trim(), m[2].trim()];
  m=n.match(/^Esfihas \(\d+\)\s*—\s*(.+)$/);
  if(m) return m[1].split('+').map(x=>'Esfiha '+x.trim().replace(/^\d+\s*/,''));
  return [n];
}

// Quantas pizzas FÍSICAS uma linha do carrinho representa (diferente de decomporSaboresItem:
// um combo "2 Por X" são 2 pizzas inteiras separadas, mas um meio a meio é 1 pizza só, cortada
// ao meio — ambos "decompõem" em 2 sabores, mas só o combo decompõe em 2 pizzas de verdade).
// Usado no total "pizzas vendidas no período" do Dashboard.
function pizzasFisicasPorItem(nome){
  const n=(nome||'').trim();
  if(/^Esfihas \(/.test(n)) return 0; // esfiha não é pizza
  return /^2 (?:Por|Broto por) R\$\s*[\d.,]+\s*—/i.test(n) ? 2 : 1;
}

// Converte um dia de Brasília (AAAA-MM-DD) num limite comparável com created_at.
// NUNCA construir a string "AAAA-MM-DDT00:00:00-03:00" na mão e comparar direto com
// created_at — o Firestore compara STRING (created_at é salvo como string ISO via
// new Date().toISOString(), formato "...Z" em UTC), e comparação de string não entende
// fuso horário: "T00:00:00-03:00" às vezes ordena DEPOIS de um "T00:xx:xx.xxxZ" de UTC
// por causa do ponto do milissegundo vir depois do hífen no código ASCII — bug real:
// pedido de véspera feito entre 21h e 23h59 (horário de Brasília) aparecia contado como
// "hoje" no Dashboard/Caixa/stats públicos. Passar pelo Date().toISOString() aqui garante
// que o limite fica no MESMO formato "...Z" salvo em created_at, então a comparação de
// string bate com a comparação de data de verdade.
function limiteDiaBrasilia(diaISO, fimDoDia){
  const hora=fimDoDia?'23:59:59.999':'00:00:00.000';
  return new Date(diaISO+'T'+hora+'-03:00').toISOString();
}

// Venda de balcão (cliente sem nome/telefone no Caixa): não é "cliente" de verdade e não pode
// entrar em ranking de mais vendido/clientes. Pedidos novos trazem balcao:true; os antigos
// são reconhecidos pelo nome padrão "Cliente Balcão" quando não há telefone.
function ehClienteBalcao(p){
  if(!p) return false;
  if(p.balcao===true) return true;
  if(String(p.client_phone||p.telefone||'').replace(/\D+/g,'').length>=8) return false; // tem telefone = cliente identificado
  const n=String(p.client_name||p.nome||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return /^(cliente\s+)?balcao$/.test(n);
}

// Borda só aparece quando existe de verdade: "Sem borda", "Sem Borda Recheada", "nenhuma"... = nada
// (não imprime nem mostra linha de borda).
function bordaReal(b){
  const t=String(b==null?'':b).trim();
  if(!t) return null;
  if(/^(sem|nenhuma|nao|não)\b/i.test(t)||/^(simples|normal|sem borda.*)$/i.test(t)) return null;
  return t;
}

if(typeof module!=='undefined' && module.exports){
  module.exports={ fmt, toMillis, dataStr, categoriaPagamento, CATEGORIAS_CARDAPIO, _normalizarCategoriaCardapio, COMBOS_DEFAULT, COMBO_BROTO, ESFIHA_SABORES, ESFIHA_PRECO_UN, ESFIHA_PACOTES, precoEsfihas, nomeEsfihas, resolverFaixaCombo, decomporSaboresItem, pizzasFisicasPorItem, limiteDiaBrasilia, ehClienteBalcao, bordaReal, COMBOS_ENTREGA_GRATIS, combosDeEsfiha };
}
