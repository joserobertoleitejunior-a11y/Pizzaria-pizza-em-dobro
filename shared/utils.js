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
  m=n.match(/^2 Por R\$\s*[\d.,]+\s*—\s*(.+?)\s*\+\s*(.+)$/);
  if(m) return [m[1].trim(), m[2].trim()];
  return [n];
}

// Quantas pizzas FÍSICAS uma linha do carrinho representa (diferente de decomporSaboresItem:
// um combo "2 Por X" são 2 pizzas inteiras separadas, mas um meio a meio é 1 pizza só, cortada
// ao meio — ambos "decompõem" em 2 sabores, mas só o combo decompõe em 2 pizzas de verdade).
// Usado no total "pizzas vendidas no período" do Dashboard.
function pizzasFisicasPorItem(nome){
  return /^2 Por R\$\s*[\d.,]+\s*—/.test((nome||'').trim()) ? 2 : 1;
}

if(typeof module!=='undefined' && module.exports){
  module.exports={ fmt, toMillis, dataStr, categoriaPagamento, CATEGORIAS_CARDAPIO, _normalizarCategoriaCardapio, COMBOS_DEFAULT, resolverFaixaCombo, decomporSaboresItem, pizzasFisicasPorItem };
}
