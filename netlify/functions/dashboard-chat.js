// ══════════════════════════════════════════════════════════
//  CHAT DO ASSISTENTE DO DASHBOARD — Pizza em Dobro
//  Conversa de verdade (várias mensagens) com um "gerente" de IA
//  que conhece os dados reais de vendas e pode pesquisar na internet.
//  Cada chamada busca os dados frescos do banco, então a IA nunca
//  fala com números desatualizados.
// ══════════════════════════════════════════════════════════

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}
const db = admin.firestore();

function categoriaPagamento(raw) {
  const p = (raw || '').toLowerCase();
  if (p.includes('crédito') || p.includes('credito')) return 'Cartão de Crédito';
  if (p.includes('débito') || p.includes('debito')) return 'Cartão de Débito';
  if (p.includes('pix')) return 'Pix';
  if (p.includes('dinheiro')) return 'Dinheiro';
  return raw || 'Não informado';
}

// Mesmas definições do site/Caixa (shared/utils.js) — mantidas aqui também porque
// esta função roda no servidor (Node), sem acesso direto ao arquivo do navegador.
const COMBOS_DEFAULT = [
  { titulo: '2 Por R$ 65,00', preco: 65.00, sabores: ['Mussarela', 'Calabresa'] },
  { titulo: '2 Por R$ 75,00', preco: 75.00, sabores: ['Marguerita', 'Palmito', 'Frango Catupiry', 'Milho', 'Alho Frito', 'Calabresa Piry'] },
  { titulo: '2 Por R$ 80,00', preco: 80.00, sabores: ['Portuguesa', 'Toscana', '4 Queijos', 'Franqueijo', 'Bauru', 'Bacon'] },
  { titulo: '2 Por R$ 85,00', preco: 85.00, sabores: ['Brócolis com Bacon', 'Peperone', 'Franqueijo Piry', 'Toscana Piry', 'Bacon', 'Atum', 'Lombo', 'Peito de Peru'] }
];
const BORDAS_DEFAULT = [
  { name: 'Sem Borda Recheada', price: 0 }, { name: 'Catupiry', price: 10 }, { name: 'Cheddar', price: 10 },
  { name: 'Mussarela', price: 15 }, { name: 'Presunto', price: 15 }, { name: 'Tampinha', price: 15 },
  { name: 'Chocolate', price: 15 }
];

async function montarContextoVendas() {
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ordersSnap = await db.collection('orders').where('created_at', '>=', desde).orderBy('created_at', 'desc').limit(600).get();
  const todosPedidos = ordersSnap.docs.map(d => d.data());
  const pedidosValidos = todosPedidos.filter(p => p.status !== 'cancelado');

  const menuSnap = await db.collection('menu_items').get();
  const menuCompleto = menuSnap.docs.map(d => d.data());
  const cardapioAtivo = menuCompleto.filter(m => m.active);
  const cardapioCompleto = cardapioAtivo.map(m => m.name);

  const cfgSnap = await db.collection('config').doc('bot').get();
  const cfg = cfgSnap.exists ? cfgSnap.data() : {};

  if (todosPedidos.length === 0) {
    return 'Ainda não há pedidos suficientes nos últimos 30 dias pra analisar.';
  }

  const totalFaturamento = pedidosValidos.reduce((s, p) => s + Number(p.total || 0), 0);
  const ticketMedio = pedidosValidos.length ? totalFaturamento / pedidosValidos.length : 0;

  const vendasPorItem = {};
  pedidosValidos.forEach(p => {
    (p.items_json || []).forEach(it => {
      const nome = it.name || 'Item';
      vendasPorItem[nome] = (vendasPorItem[nome] || 0) + (Number(it.qty) || 1);
    });
  });
  const rankingItens = Object.entries(vendasPorItem).sort((a, b) => b[1] - a[1]);
  const nomesVendidos = new Set(Object.keys(vendasPorItem));
  const nuncaVendidos = cardapioCompleto.filter(n => !nomesVendidos.has(n));

  // formata created_at no horário de Brasília, não no horário do servidor (UTC) —
  // sem isso, pedidos da noite viravam "amanhã" incorretamente
  const fmtBR = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const weekdayFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long' });
  const diaSemanaMap = { 'Sunday':'Domingo','Monday':'Segunda','Tuesday':'Terça','Wednesday':'Quarta','Thursday':'Quinta','Friday':'Sexta','Saturday':'Sábado' };

  function dataHoraBR(iso) {
    const d = new Date(iso);
    const partes = {};
    fmtBR.formatToParts(d).forEach(part => { partes[part.type] = part.value; });
    return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: partes.hour, minuto: partes.minute, hora24: Number(partes.hour), diaSemana: diaSemanaMap[weekdayFmt.format(d)] };
  }

  const porDiaSemana = {};
  const porHora = {};
  const porDataExata = {};
  pedidosValidos.forEach(p => {
    try {
      const { data, hora24, diaSemana } = dataHoraBR(p.created_at);
      porDiaSemana[diaSemana] = (porDiaSemana[diaSemana] || 0) + Number(p.total || 0);
      porHora[hora24] = (porHora[hora24] || 0) + 1;
      if (!porDataExata[data]) porDataExata[data] = { faturamento: 0, pedidos: 0 };
      porDataExata[data].faturamento += Number(p.total || 0);
      porDataExata[data].pedidos += 1;
    } catch (e) { /* ignora */ }
  });

  const porPagamento = {};
  pedidosValidos.forEach(p => { const c = categoriaPagamento(p.payment); porPagamento[c] = (porPagamento[c] || 0) + 1; });

  const porTipo = {};
  pedidosValidos.forEach(p => { const t = p.delivery_type || 'não informado'; porTipo[t] = (porTipo[t] || 0) + 1; });

  // ── RANKING DE CLIENTES (por telefone, já que nome pode se repetir/variar) ──
  const porCliente = {};
  pedidosValidos.forEach(p => {
    const chave = (p.client_phone || p.client_name || 'desconhecido').trim();
    if (!porCliente[chave]) porCliente[chave] = { nome: p.client_name || 'não informado', telefone: p.client_phone || '—', totalGasto: 0, qtdPedidos: 0, qtdItensTotal: 0 };
    porCliente[chave].totalGasto += Number(p.total || 0);
    porCliente[chave].qtdPedidos += 1;
    porCliente[chave].qtdItensTotal += (p.items_json || []).reduce((s, it) => s + (Number(it.qty) || 1), 0);
  });
  const rankingClientes = Object.values(porCliente).sort((a, b) => b.totalGasto - a.totalGasto);
  const clientesRecorrentes = rankingClientes.filter(c => c.qtdPedidos > 1).length;

  // ── LISTA DE PEDIDOS INDIVIDUAIS — permite a IA responder QUALQUER pergunta granular:
  // por cliente, por horário exato, quantidade de pizzas por pedido, etc. ──
  const listaPedidos = todosPedidos.map(p => {
    const { data, hora, minuto } = dataHoraBR(p.created_at || new Date().toISOString());
    const itens = (p.items_json || []).map(it => `${Number(it.qty) || 1}x ${it.name || 'item'}`).join(', ') || 'sem itens registrados';
    const qtdTotalItens = (p.items_json || []).reduce((s, it) => s + (Number(it.qty) || 1), 0);
    const statusTag = p.status === 'cancelado' ? ' [CANCELADO]' : '';
    return `${data} ${hora}:${minuto} | #${p.numero_sequencial || '—'} | Cliente: ${p.client_name || 'não informado'} | Tel: ${p.client_phone || '—'} | Itens(${qtdTotalItens}): ${itens} | Total: R$ ${Number(p.total || 0).toFixed(2)} | Pagamento: ${p.payment || '—'} | Tipo: ${p.delivery_type || '—'} | Origem: ${p.origem || '—'}${statusTag}`;
  }).join('\n');

  return `DADOS DE VENDAS DOS ÚLTIMOS 30 DIAS (ou até 600 pedidos mais recentes) — PIZZARIA "PIZZA EM DOBRO" (Itapetininga-SP, Brasil):

═══ SOBRE A LOJA (config real do sistema) ═══
Endereço: ${cfg.enderecoLoja || 'não cadastrado no painel'}
Taxa de entrega: ${cfg.taxaEntrega ? 'R$ ' + cfg.taxaEntrega : 'não cadastrada no painel'}
Tempo médio de entrega: ${cfg.tempoEntrega || 'não cadastrado'}
Formas de pagamento aceitas: ${cfg.formasPagamento || 'não cadastrado'}
Horário de funcionamento do atendimento (bot WhatsApp): ${cfg.horarioInicio != null ? cfg.horarioInicio + 'h às ' + cfg.horarioFim + 'h' : 'não cadastrado'}
Loja fechada pra pedidos novos hoje (flag manual): ${cfg.lojaFechada ? 'SIM — ' + (cfg.mensagemFechado || '') : 'não'}
${cfg.observacoesLoja ? 'Observações cadastradas: ' + cfg.observacoesLoja : ''}

═══ CARDÁPIO COMPLETO (todos os itens cadastrados no sistema, com descrição e preço) ═══
${menuCompleto.map(m => `- [${m.active ? 'ativo' : 'INATIVO'}] ${m.name} (categoria: ${m.category || '—'}) — R$ ${Number(m.price || 0).toFixed(2)}${m.description ? ' — ' + m.description : ''}`).join('\n')}

═══ COMBOS "2 POR X" (promoção fixa do cardápio, sempre 2 sabores diferentes) ═══
${COMBOS_DEFAULT.map(c => `- ${c.titulo} (R$ ${c.preco.toFixed(2)}): escolha 2 sabores diferentes entre ${c.sabores.join(', ')}`).join('\n')}

═══ OPÇÕES DE BORDA RECHEADA ═══
${BORDAS_DEFAULT.map(b => `- ${b.name}${b.price > 0 ? ': +R$ ' + b.price.toFixed(2) : ' (sem custo extra)'}`).join('\n')}

═══ RESUMO RÁPIDO DE VENDAS (não conta pedidos cancelados) ═══
Faturamento total: R$ ${totalFaturamento.toFixed(2)}
Total de pedidos válidos: ${pedidosValidos.length}
Total de pedidos cancelados no período: ${todosPedidos.length - pedidosValidos.length}
Ticket médio: R$ ${ticketMedio.toFixed(2)}
Clientes únicos no período: ${rankingClientes.length}
Clientes recorrentes (2+ pedidos): ${clientesRecorrentes}

═══ RANKING DE CLIENTES (por valor total gasto, últimos 30 dias) ═══
${rankingClientes.slice(0, 30).map((c, i) => `${i + 1}. ${c.nome} (${c.telefone}) — R$ ${c.totalGasto.toFixed(2)} em ${c.qtdPedidos} pedido(s), ${c.qtdItensTotal} item(ns) no total`).join('\n')}
${rankingClientes.length > 30 ? `... e mais ${rankingClientes.length - 30} cliente(s) na lista completa de pedidos abaixo.` : ''}

TODOS OS ITENS VENDIDOS (quantidade, do mais ao menos vendido):
${rankingItens.map(([n, q]) => `- ${n}: ${q}x`).join('\n')}

ITENS DO CARDÁPIO ATIVOS QUE NÃO VENDERAM NADA NESSE PERÍODO:
${nuncaVendidos.length ? nuncaVendidos.map(n => `- ${n}`).join('\n') : '(todos os itens ativos venderam pelo menos uma vez)'}

FATURAMENTO POR DIA DA SEMANA (soma de todos os dias desse tipo, últimos 30 dias):
${Object.entries(porDiaSemana).sort((a, b) => b[1] - a[1]).map(([d, v]) => `- ${d}: R$ ${v.toFixed(2)}`).join('\n')}

FATURAMENTO POR DATA EXATA (últimos 30 dias, dia a dia):
${Object.entries(porDataExata).sort((a, b) => a[0].localeCompare(b[0])).map(([data, v]) => `- ${data}: R$ ${v.faturamento.toFixed(2)} (${v.pedidos} pedido(s))`).join('\n')}

PEDIDOS POR HORÁRIO DO DIA (hora local de Brasília, 0-23h, acumulado dos 30 dias):
${Object.entries(porHora).sort((a, b) => Number(a[0]) - Number(b[0])).map(([h, q]) => `- ${h}h: ${q} pedido(s)`).join('\n')}

FORMA DE PAGAMENTO:
${Object.entries(porPagamento).map(([f, q]) => `- ${f}: ${q} pedido(s)`).join('\n')}

TIPO DE VENDA:
${Object.entries(porTipo).map(([t, q]) => `- ${t}: ${q} pedido(s)`).join('\n')}

═══ LISTA COMPLETA DE PEDIDOS INDIVIDUAIS (mais recentes primeiro, até 600 pedidos, inclui cancelados marcados) ═══
Use esta lista para QUALQUER pergunta granular: por cliente específico, por faixa de horário exata, quantidade de pizzas por pedido, quem pediu mais, comparação entre dois períodos exatos, etc. Cada linha é um pedido.
${listaPedidos}`;
}

// ── FERRAMENTAS DE EDIÇÃO DO CARDÁPIO — o assistente executa de verdade, direto no banco ──
async function buscarItemPorNome(nome) {
  const snap = await db.collection('menu_items').get();
  const alvo = (nome || '').trim().toLowerCase();
  const exatos = [];
  const parciais = [];
  snap.docs.forEach(d => {
    const dados = d.data();
    const n = (dados.name || '').trim().toLowerCase();
    if (n === alvo) exatos.push({ ref: d.ref, data: dados });
    else if (n.includes(alvo)) parciais.push({ ref: d.ref, data: dados });
  });
  if (exatos.length > 1) {
    return { ambiguo: true, opcoes: exatos };
  }
  if (exatos.length === 1) return exatos[0];
  if (parciais.length > 1) {
    return { ambiguo: true, opcoes: parciais };
  }
  return parciais[0] || null;
}
async function proximoIdCardapio() {
  const snap = await db.collection('menu_items').get();
  let max = 0;
  snap.docs.forEach(d => { const idNum = Number(d.data().slug_id || d.id) || 0; if (idNum > max) max = idNum; });
  return max + 1;
}
const CATEGORIAS_VALIDAS = { p: 'Tradicional', s: 'Especial', co: 'Combo', dw: 'Doce', cz: 'Calzone Doce', d: 'Bebida' };
function normalizarCategoria(cat) {
  const c = (cat || '').trim().toLowerCase();
  if (CATEGORIAS_VALIDAS[c]) return c; // já é um código válido (p, s, dw, cz, d, co)
  const mapa = {
    'tradicional': 'p', 'tradicionais': 'p', 'pizza tradicional': 'p',
    'especial': 's', 'especiais': 's', 'pizza especial': 's',
    'doce': 'dw', 'doces': 'dw', 'pizza doce': 'dw', 'sobremesa': 'dw', 'sobremesas': 'dw',
    'calzone': 'cz', 'calzones': 'cz', 'calzone doce': 'cz',
    'bebida': 'd', 'bebidas': 'd', 'drink': 'd', 'refrigerante': 'd',
    'combo': 'co', 'combos': 'co'
  };
  return mapa[c] || 'p'; // padrão seguro: tradicional, nunca deixa a categoria em branco/inválida
}

const ferramentasCardapio = [
  {
    name: 'adicionar_item_cardapio',
    description: 'Adiciona um novo item ao cardápio (pizza, bebida, doce, calzone). Use quando o Marco pedir pra criar/adicionar um item novo com nome e preço definidos. Não use pra combos "2 por X" (esses são fixos no sistema).',
    input_schema: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome do item, ex: "Pizza Calabresa Acebolada"' },
        descricao: { type: 'string', description: 'Descrição/ingredientes do item' },
        preco: { type: 'number', description: 'Preço em reais, ex: 45.99' },
        categoria: { type: 'string', enum: Object.keys(CATEGORIAS_VALIDAS), description: 'p=Tradicional, s=Especial, dw=Doce, cz=Calzone Doce, d=Bebida' }
      },
      required: ['nome', 'preco', 'categoria']
    }
  },
  {
    name: 'editar_item_cardapio',
    description: 'Edita nome, preço, descrição ou categoria de um item já existente no cardápio. Encontra o item pelo nome atual (ou parte dele). Só preencha os campos que devem mudar; deixe os outros de fora.',
    input_schema: {
      type: 'object',
      properties: {
        nome_atual: { type: 'string', description: 'Nome (ou parte do nome) do item a editar, ex: "Calabresa"' },
        novo_nome: { type: 'string', description: 'Novo nome, se for mudar' },
        nova_descricao: { type: 'string', description: 'Nova descrição, se for mudar' },
        novo_preco: { type: 'number', description: 'Novo preço em reais, se for mudar' },
        nova_categoria: { type: 'string', enum: Object.keys(CATEGORIAS_VALIDAS), description: 'Nova categoria, se for mudar' }
      },
      required: ['nome_atual']
    }
  },
  {
    name: 'remover_item_cardapio',
    description: 'Remove definitivamente um item do cardápio. Use com cuidado — ação não tem volta fácil.',
    input_schema: {
      type: 'object',
      properties: { nome: { type: 'string', description: 'Nome (ou parte do nome) do item a remover' } },
      required: ['nome']
    }
  },
  {
    name: 'ativar_ou_desativar_item',
    description: 'Ativa ou desativa (esconde do site/bot sem apagar) um item do cardápio — útil quando um sabor está temporariamente em falta.',
    input_schema: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome (ou parte do nome) do item' },
        ativo: { type: 'boolean', description: 'true pra ativar/mostrar, false pra desativar/esconder' }
      },
      required: ['nome', 'ativo']
    }
  }
];

async function executarFerramentaCardapio(nomeFerramenta, entrada) {
  if (nomeFerramenta === 'adicionar_item_cardapio') {
    const nome = (entrada.nome || '').trim();
    if (!nome) return { mensagem: 'Erro: nome do item não foi informado.' };
    if (isNaN(Number(entrada.preco)) || Number(entrada.preco) < 0) return { mensagem: 'Erro: preço inválido.' };
    const existente = await buscarItemPorNome(nome);
    if (existente && !existente.ambiguo && existente.data.name.trim().toLowerCase() === nome.toLowerCase()) {
      return { mensagem: `Já existe um item chamado exatamente "${existente.data.name}" (id ${existente.ref.id}, R$ ${Number(existente.data.price || 0).toFixed(2)}). Não criei outro pra não duplicar — use editar_item_cardapio se for pra mudar esse, ou use um nome diferente se for um item realmente novo.` };
    }
    const id = await proximoIdCardapio();
    const categoria = normalizarCategoria(entrada.categoria);
    await db.collection('menu_items').doc(String(id)).set({
      id: String(id), slug_id: id, name: nome, description: entrada.descricao || '',
      price: Number(entrada.preco), category: categoria, img_url: null, active: true,
      updated_at: new Date().toISOString()
    });
    return { mensagem: `Item "${nome}" (id ${id}) adicionado com sucesso ao cardápio, categoria ${CATEGORIAS_VALIDAS[categoria]}, preço R$ ${Number(entrada.preco).toFixed(2)}.`, item: { id: String(id), nome } };
  }
  if (nomeFerramenta === 'editar_item_cardapio') {
    const achado = await buscarItemPorNome(entrada.nome_atual);
    if (!achado) return { mensagem: `Não achei nenhum item parecido com "${entrada.nome_atual}" no cardápio. Confira o nome exato.` };
    if (achado.ambiguo) return { mensagem: _mensagemAmbiguidade(entrada.nome_atual, achado.opcoes) };
    const atualizacoes = { updated_at: new Date().toISOString() };
    if (entrada.novo_nome) atualizacoes.name = entrada.novo_nome;
    if (entrada.nova_descricao !== undefined) atualizacoes.description = entrada.nova_descricao;
    if (entrada.novo_preco !== undefined) atualizacoes.price = Number(entrada.novo_preco);
    if (entrada.nova_categoria) atualizacoes.category = normalizarCategoria(entrada.nova_categoria);
    await achado.ref.set(atualizacoes, { merge: true });
    const nomeFinal = atualizacoes.name || achado.data.name;
    return { mensagem: `Item "${achado.data.name}" (id ${achado.ref.id}) atualizado com sucesso: ${JSON.stringify(atualizacoes)}.`, item: { id: achado.ref.id, nome: nomeFinal } };
  }
  if (nomeFerramenta === 'remover_item_cardapio') {
    const achado = await buscarItemPorNome(entrada.nome);
    if (!achado) return { mensagem: `Não achei nenhum item parecido com "${entrada.nome}" no cardápio.` };
    if (achado.ambiguo) return { mensagem: _mensagemAmbiguidade(entrada.nome, achado.opcoes) };
    await achado.ref.delete();
    return { mensagem: `Item "${achado.data.name}" (id ${achado.ref.id}) removido definitivamente do cardápio.` };
  }
  if (nomeFerramenta === 'ativar_ou_desativar_item') {
    const achado = await buscarItemPorNome(entrada.nome);
    if (!achado) return { mensagem: `Não achei nenhum item parecido com "${entrada.nome}" no cardápio.` };
    if (achado.ambiguo) return { mensagem: _mensagemAmbiguidade(entrada.nome, achado.opcoes) };
    await achado.ref.set({ active: !!entrada.ativo, updated_at: new Date().toISOString() }, { merge: true });
    return { mensagem: `Item "${achado.data.name}" (id ${achado.ref.id}) agora está ${entrada.ativo ? 'ATIVO (visível no site e bot)' : 'INATIVO (escondido do site e bot)'}.` };
  }
  return { mensagem: 'Ferramenta desconhecida.' };
}
function _mensagemAmbiguidade(nomeBuscado, opcoes) {
  const lista = opcoes.map(o => `- id ${o.ref.id}: "${o.data.name}" — R$ ${Number(o.data.price || 0).toFixed(2)} — categoria ${o.data.category || '—'} — ${o.data.active ? 'ativo' : 'inativo'}`).join('\n');
  return `Encontrei MAIS DE UM item chamado ou parecido com "${nomeBuscado}" no cardápio — isso é uma duplicidade no banco de dados, provavelmente de um teste anterior:\n${lista}\nNão fiz nenhuma alteração pra não mexer no item errado. Pergunte ao Marco qual dos ids acima ele quer editar/remover, ou se prefere remover o duplicado.`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'ok' };
  }

  try {
    const cfgSnap = await db.collection('config').doc('bot').get();
    const cfg = cfgSnap.exists ? cfgSnap.data() : null;
    if (!cfg || !cfg.anthropicKey) {
      return { statusCode: 500, body: JSON.stringify({ erro: 'Chave da IA não configurada.' }) };
    }

    const payload = JSON.parse(event.body || '{}');
    const mensagens = Array.isArray(payload.mensagens) ? payload.mensagens : [];
    if (mensagens.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ erro: 'Sem mensagem.' }) };
    }
    // Limita histórico pra não estourar tokens em conversas muito longas
    const historico = mensagens.slice(-20).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 4000)
    }));

    const contextoVendas = await montarContextoVendas();

    const hojeISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const systemPrompt = `Você é o gerente virtual de IA da pizzaria "Pizza em Dobro" (Itapetininga-SP, Brasil), conversando diretamente com o Marco, dono da pizzaria, pelo painel administrativo do sistema.

Hoje é ${hojeISO} (formato AAAA-MM-DD, horário de Brasília). Use essa data como referência pra resolver "hoje", "ontem", "essa semana" etc.

Você é direto, prático e fala a língua de dono de pizzaria de bairro — sem economês, sem enrolação, sem embromation. Frases curtas. Pode usar emoji com moderação (🍕📈💡).

Você TEM acesso à lista COMPLETA de pedidos individuais dos últimos 30 dias (ou até 600 pedidos), incluindo cliente, telefone, itens exatos com quantidade, horário exato, forma de pagamento e status. Isso quer dizer que você consegue responder QUALQUER pergunta granular calculando na hora a partir dessa lista, por exemplo:
- "quantas pizzas vendemos hoje" → some a coluna de itens de todos os pedidos de hoje (não cancelados)
- "qual cliente pediu mais pizzas num pedido só" → percorra a lista e ache o maior
- "faturamento das 18h às 20h hoje" → filtre pedidos de hoje nesse intervalo de horário e some
- "quanto o cliente fulano já gastou" → some os pedidos desse nome/telefone
Nunca diga que "não tem esse dado disponível" ou "não consigo calcular" se a informação estiver na lista de pedidos — sempre calcule você mesmo, mostrando o resultado direto. Você é um analista de dados competente, não apenas um leitor de resumos prontos.

Regra de ouro: NUNCA invente ou estime número que não esteja literalmente nos dados abaixo. Se genuinamente não houver dado suficiente pra responder (ex: pergunta sobre algo de antes dos últimos 30 dias, ou um cliente que nunca pediu), diga isso claramente e não invente um número aproximado nem cite dados que pareçam plausíveis mas não estão na lista.

Pedidos marcados [CANCELADO] na lista não devem entrar em somas de faturamento nem contagem de pedidos "vendidos", a menos que o Marco peça especificamente sobre cancelamentos.

Você TEM permissão de pesquisar na internet quando for útil — por exemplo, pra sugerir tendências de marketing pra delivery, melhores horários pra anúncio no Instagram/Facebook, ideias de promoção, preços de concorrência, etc. Quando pesquisar, traga informação prática e atual, sem citar fonte formal, só incorpore na resposta.

Você TEM permissão de editar o cardápio de verdade, ao vivo, usando as ferramentas disponíveis (adicionar, editar, remover, ativar/desativar item). Quando o Marco pedir algo do tipo "adiciona uma pizza X por RY", "muda o preço da Calabresa pra R$40", "tira a pizza tal do cardápio" ou "desativa esse sabor", USE A FERRAMENTA CORRESPONDENTE diretamente — não apenas explique o que faria, execute de verdade, sempre, em toda mensagem em que a intenção estiver clara.

REGRA CRÍTICA sobre "já existe": a lista "CARDÁPIO COMPLETO" nesta mensagem é buscada do banco de dados NA HORA, sempre atual — é a ÚNICA fonte confiável sobre o que existe ou não. NUNCA recuse adicionar um item dizendo "já existe" baseado em alguma coisa que você mesmo disse antes nesta conversa — se um item que você tentou criar antes não aparecer literalmente na lista "CARDÁPIO COMPLETO" de agora, é porque ele NÃO foi criado de verdade (pode ter falhado), e você deve tentar adicionar de novo, não recusar. Só recuse por "já existe" se o nome aparecer literalmente na lista do cardápio desta mensagem.

IMPORTANTE — pedidos com VÁRIOS itens de uma vez (ex: "adiciona bolo de pote de chocolate, morango e prestígio por R$14,99"): isso significa UM item por sabor mencionado. Você deve chamar a ferramenta adicionar_item_cardapio UMA VEZ PRA CADA sabor/variação citada, todas na mesma resposta (várias chamadas de ferramenta na mesma mensagem) — nunca resuma isso como um pedido só, e nunca pule nenhum item da lista que o Marco mencionou. Se ele citou 3 sabores, são 3 chamadas de ferramenta, uma pra cada nome completo (ex: "Bolo de Pote de Chocolate", "Bolo de Pote de Morango", "Bolo de Pote de Prestígio"), mesmo preço e categoria repetidos em cada uma. Chame as ferramentas direto, sem escrever parágrafo de texto entre uma chamada e outra — só confirme tudo junto no final, num resumo curto de cada item criado.

Se faltar alguma informação obrigatória (por exemplo, preço ao adicionar item novo), pergunte antes de executar. Você NÃO consegue processar ou anexar foto de item por aqui — depois de adicionar/editar um item, a pessoa vai ver um link separado pra escolher a foto; você não precisa (e não consegue) fazer nada em relação a isso, é automático.

Seu papel: ajudar o Marco a tomar decisões de negócio — o que vender mais, quando anunciar, que promoção fazer, como melhorar o cardápio, como aumentar o ticket médio, quais clientes são mais valiosos, etc. Responda como um gerente experiente aconselhando o dono, não como um relatório formal.

${contextoVendas}`;

    let mensagensAPI = [...historico];
    let textoFinal = '';
    let itensAfetados = [];
    const tools = [{ type: 'web_search_20250305', name: 'web_search' }, ...ferramentasCardapio];

    for (let tentativa = 0; tentativa < 10; tentativa++) {
      const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': cfg.anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: systemPrompt,
          messages: mensagensAPI,
          tools
        })
      });
      const claudeData = await claudeResp.json();
      if (claudeData?.type === 'error') {
        console.error('ERRO da API da Anthropic:', JSON.stringify(claudeData.error));
      }
      const blocos = claudeData?.content || [];
      console.log(`[tentativa ${tentativa}] stop_reason=${claudeData?.stop_reason} blocos=${blocos.map(b => b.type + (b.type === 'tool_use' ? ':' + b.name : '')).join(',')}`);
      const textoBloco = blocos.filter(b => b.type === 'text').map(b => b.text).join('\n\n');
      if (textoBloco) textoFinal = textoBloco;

      const chamadasFerramenta = blocos.filter(b => b.type === 'tool_use' && ferramentasCardapio.some(f => f.name === b.name));
      if (chamadasFerramenta.length === 0) break; // sem ferramenta de cardápio pra executar, terminou

      mensagensAPI.push({ role: 'assistant', content: blocos });
      const resultados = [];
      for (const chamada of chamadasFerramenta) {
        console.log(`Executando ferramenta ${chamada.name} com input:`, JSON.stringify(chamada.input));
        let saida;
        try {
          saida = await executarFerramentaCardapio(chamada.name, chamada.input || {});
          console.log(`Resultado de ${chamada.name}:`, JSON.stringify(saida));
        } catch (e) {
          console.error('Erro ao executar ferramenta de cardápio:', chamada.name, e);
          saida = { mensagem: 'Erro ao executar essa ação no banco de dados. Não foi concluída.' };
        }
        if (saida.item) itensAfetados.push(saida.item);
        resultados.push({ type: 'tool_result', tool_use_id: chamada.id, content: saida.mensagem });
      }
      mensagensAPI.push({ role: 'user', content: resultados });
    }

    const texto = textoFinal || 'Desculpa, não consegui responder agora. Tenta de novo.';

    return { statusCode: 200, body: JSON.stringify({ texto, itensAfetados }) };
  } catch (err) {
    console.error('Erro no chat do assistente:', err);
    return { statusCode: 500, body: JSON.stringify({ erro: 'Não foi possível responder agora. Tenta de novo.' }) };
  }
};
