// ══════════════════════════════════════════════════════════
//  ASSISTENTE DE IA DO DASHBOARD — Pizza em Dobro
//  Analisa as vendas dos últimos 30 dias e dá sugestões práticas
//  pro Marco: o que vende bem, o que não vende, melhor horário
//  pra anúncio, e ideias pra aumentar as vendas (com pesquisa na
//  internet). Roda só quando alguém aperta o botão — não é automático,
//  pra não gastar API à toa.
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

    // ── 1. Junta os dados de vendas dos últimos 30 dias ──
    const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ordersSnap = await db.collection('orders').where('created_at', '>=', desde).get();
    const pedidos = ordersSnap.docs.map(d => d.data()).filter(p => p.status !== 'cancelado');

    const menuSnap = await db.collection('menu_items').where('active', '==', true).get();
    const cardapioCompleto = menuSnap.docs.map(d => d.data().name);

    if (pedidos.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ texto: 'Ainda não tem pedidos suficientes nos últimos 30 dias pra gerar uma análise útil. Volta aqui depois de vender mais um pouco! 🍕' }) };
    }

    const totalFaturamento = pedidos.reduce((s, p) => s + Number(p.total || 0), 0);
    const ticketMedio = totalFaturamento / pedidos.length;

    // vendas por item
    const vendasPorItem = {};
    pedidos.forEach(p => {
      (p.items_json || []).forEach(it => {
        const nome = it.name || 'Item';
        vendasPorItem[nome] = (vendasPorItem[nome] || 0) + (Number(it.qty) || 1);
      });
    });
    const rankingItens = Object.entries(vendasPorItem).sort((a, b) => b[1] - a[1]);
    const maisVendidos = rankingItens.slice(0, 8);
    const nomesVendidos = new Set(Object.keys(vendasPorItem));
    const nuncaVendidos = cardapioCompleto.filter(n => !nomesVendidos.has(n));

    // vendas por dia da semana
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const porDiaSemana = {};
    // vendas por hora
    const porHora = {};
    pedidos.forEach(p => {
      try {
        const d = new Date(p.created_at);
        const dia = diasSemana[d.getDay()];
        const hora = d.getHours();
        porDiaSemana[dia] = (porDiaSemana[dia] || 0) + Number(p.total || 0);
        porHora[hora] = (porHora[hora] || 0) + 1;
      } catch (e) { /* ignora data inválida */ }
    });

    // pagamento
    const porPagamento = {};
    pedidos.forEach(p => {
      const cat = categoriaPagamento(p.payment);
      porPagamento[cat] = (porPagamento[cat] || 0) + 1;
    });

    // entrega vs retirada
    const porTipo = {};
    pedidos.forEach(p => { const t = p.delivery_type || 'não informado'; porTipo[t] = (porTipo[t] || 0) + 1; });

    const dadosResumo = `
DADOS DE VENDAS DOS ÚLTIMOS 30 DIAS — PIZZARIA "PIZZA EM DOBRO" (Itapetininga-SP, Brasil):

Faturamento total: R$ ${totalFaturamento.toFixed(2)}
Total de pedidos: ${pedidos.length}
Ticket médio: R$ ${ticketMedio.toFixed(2)}

ITENS MAIS VENDIDOS (quantidade vendida):
${maisVendidos.map(([n, q]) => `- ${n}: ${q}x`).join('\n')}

ITENS DO CARDÁPIO QUE NÃO VENDERAM NADA NESSE PERÍODO:
${nuncaVendidos.length ? nuncaVendidos.map(n => `- ${n}`).join('\n') : '(todos os itens ativos venderam pelo menos uma vez)'}

FATURAMENTO POR DIA DA SEMANA:
${Object.entries(porDiaSemana).sort((a, b) => b[1] - a[1]).map(([d, v]) => `- ${d}: R$ ${v.toFixed(2)}`).join('\n')}

PEDIDOS POR HORÁRIO DO DIA (hora local, 0-23h):
${Object.entries(porHora).sort((a, b) => Number(a[0]) - Number(b[0])).map(([h, q]) => `- ${h}h: ${q} pedido(s)`).join('\n')}

FORMA DE PAGAMENTO:
${Object.entries(porPagamento).map(([f, q]) => `- ${f}: ${q} pedido(s)`).join('\n')}

TIPO DE VENDA:
${Object.entries(porTipo).map(([t, q]) => `- ${t}: ${q} pedido(s)`).join('\n')}
`;

    const systemPrompt = `Você é um consultor de negócios especializado em pizzarias e delivery no Brasil, atuando como gerente virtual da pizzaria "Pizza em Dobro". Você é direto, prático e fala a língua de um dono de pizzaria de bairro — sem economês, sem enrolação.

Analise os dados de vendas fornecidos e escreva um relatório curto e MUITO prático em português, organizado exatamente nestas seções, cada uma com um título em negrito markdown (##):

## 🍕 O que está vendendo bem
(2-4 frases, cite os itens específicos e possíveis motivos)

## 📉 O que não está vendendo
(2-4 frases sobre os itens fracos ou parados — sugira o que fazer: promoção, combo, tirar do cardápio, etc.)

## ⏰ Melhor horário pra anunciar
(baseado nos horários e dias de mais pedido, diga o melhor horário e dia pra rodar um anúncio no Instagram/Facebook/WhatsApp pra pegar o pico de fome antes que ele comece)

## 💡 3 ideias práticas pra vender mais
(ideias concretas e realistas pra uma pizzaria pequena de bairro — pode pesquisar na internet tendências atuais de marketing pra delivery/pizzaria no Brasil se ajudar a dar ideias melhores e atualizadas)

Regras: seja objetivo, sem enrolação, frases curtas. Nada de disclaimer ou introdução — comece direto no primeiro título. Não invente números que não foram dados.`;

    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1800,
        system: systemPrompt,
        messages: [{ role: 'user', content: dadosResumo }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });
    const claudeData = await claudeResp.json();
    const texto = (claudeData?.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n\n') || 'Não consegui gerar a análise agora. Tenta de novo em instantes.';

    const geradoEm = new Date().toISOString();
    await db.collection('analises_ia').doc('latest').set({ texto, geradoEm, totalPedidosAnalisados: pedidos.length });

    return { statusCode: 200, body: JSON.stringify({ texto, geradoEm }) };
  } catch (err) {
    console.error('Erro no assistente de IA do dashboard:', err);
    return { statusCode: 500, body: JSON.stringify({ erro: 'Não foi possível gerar a análise agora.' }) };
  }
};
