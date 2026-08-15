// ══════════════════════════════════════════════════════════
//  WEBHOOK DO BOT WHATSAPP — Pizza em Dobro
//  Recebe mensagem da Evolution API → Claude decide resposta → responde
//  Todas as chaves/URLs ficam em Firestore (config/bot), editáveis no painel.
//  ÚNICA credencial que fica fora do banco: FIREBASE_SERVICE_ACCOUNT (env var Netlify)
// ══════════════════════════════════════════════════════════

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}
const db = admin.firestore();

async function obterProximoNumeroSequencial() {
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD
  const ref = db.collection('contadores').doc('pedidos_' + hoje);
  return db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const atual = (doc.exists ? doc.data().atual : 0) + 1;
    t.set(ref, { atual }, { merge: true });
    return atual;
  });
}

// Verifica se esse telefone já tem um pedido recente feito por outro canal (site/cardápio,
// conversor) nos últimos 45 minutos, pra evitar que o bot feche um pedido duplicado.
async function buscarPedidoRecenteMesmoTelefone(telefone) {
  try {
    const digitos = (telefone || '').replace(/\D/g, '');
    const sufixo = digitos.slice(-8);
    if (!sufixo) return null;
    const desde = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    const snap = await db.collection('orders').where('created_at', '>=', desde).get();
    for (const doc of snap.docs) {
      const o = doc.data();
      if (o.origem === 'whatsapp_bot') continue; // esse já é do próprio bot, não conta como duplicidade
      if (o.status === 'cancelado') continue;
      const foneDigitos = (o.client_phone || '').replace(/\D/g, '');
      if (foneDigitos && foneDigitos.slice(-8) === sufixo) {
        return { id: doc.id, ...o };
      }
    }
    return null;
  } catch (e) {
    console.warn('Não foi possível checar pedido recente pelo telefone:', e);
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'ok' };
  }

  let telefone = null;
  let cfg = null;

  try {
    const payload = JSON.parse(event.body || '{}');

    // Evolution API manda vários tipos de evento — só nos interessa mensagem recebida
    const msg = payload?.data;
    if (!msg || msg.key?.fromMe) {
      return { statusCode: 200, body: 'ignorado' };
    }

    telefone = (msg.key?.remoteJid || '').replace('@s.whatsapp.net', '');
    const texto = msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || '';
    if (!telefone || !texto) {
      return { statusCode: 200, body: 'sem texto' };
    }

    // ── 1. Carrega config do bot (tudo editável no painel) ──
    const cfgSnap = await db.collection('config').doc('bot').get();
    cfg = cfgSnap.exists ? cfgSnap.data() : null;
    if (!cfg || !cfg.ativo) {
      return { statusCode: 200, body: 'bot inativo' };
    }

    // ── 2. Trava de horário (18h-00h por padrão, configurável) ──
    const agora = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const horaAtual = new Date(agora).getHours();
    const dentroDoHorario = cfg.horarioInicio <= cfg.horarioFim
      ? (horaAtual >= cfg.horarioInicio && horaAtual < cfg.horarioFim)
      : (horaAtual >= cfg.horarioInicio || horaAtual < cfg.horarioFim); // vira meia-noite
    if (!dentroDoHorario) {
      const fmtHora = h => `${String(h).padStart(2, '0')}h`;
      const avisoForaHorario = cfg.mensagemForaHorario
        || `Olá! No momento estamos fora do horário de atendimento (funcionamos das ${fmtHora(cfg.horarioInicio)} às ${fmtHora(cfg.horarioFim)}). Assim que abrirmos, te atendemos e fechamos seu pedido! 🍕`;

      const convRef = db.collection('bot_conversas').doc(telefone);
      const convSnap = await convRef.get();
      const conv = convSnap.exists ? convSnap.data() : {
        telefone, estado: 'novo', assumidoPor: null,
        pedidoRascunho: {}, pedidoId: null, criadoEm: admin.firestore.FieldValue.serverTimestamp()
      };

      // Não responde de novo se a conversa já foi assumida por humano/fechada
      const jaAvisadoRecente = conv.avisoForaHorarioEm
        && (Date.now() - conv.avisoForaHorarioEm.toMillis()) < 3 * 60 * 60 * 1000; // 3h
      const podeAvisar = !['assumido_humano', 'fechado', 'aguardando_atendente'].includes(conv.estado)
        && !jaAvisadoRecente;

      if (podeAvisar) {
        await fetch(`${cfg.evolutionUrl}/message/sendText/${cfg.instanceName}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'apikey': cfg.evolutionKey },
          body: JSON.stringify({ number: telefone, text: avisoForaHorario })
        });
        await convRef.collection('mensagens').add({
          remetente: 'bot', texto: avisoForaHorario, timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      await convRef.collection('mensagens').add({
        remetente: 'cliente', texto, timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      await convRef.set({
        ...conv,
        ultimaMensagemEm: admin.firestore.FieldValue.serverTimestamp(),
        ...(podeAvisar ? { avisoForaHorarioEm: admin.firestore.FieldValue.serverTimestamp() } : {})
      }, { merge: true });

      return { statusCode: 200, body: 'fora do horario - avisado' };
    }

    // ── 3. Carrega/cria a conversa ──
    const convRef = db.collection('bot_conversas').doc(telefone);
    const convSnap = await convRef.get();
    const conv = convSnap.exists ? convSnap.data() : {
      telefone, estado: 'novo', assumidoPor: null,
      pedidoRascunho: {}, pedidoId: null, criadoEm: admin.firestore.FieldValue.serverTimestamp()
    };

    // Conversa com atendente / assumida por humano → bot só escuta, não responde mais
    if (['assumido_humano', 'aguardando_atendente'].includes(conv.estado)) {
      await convRef.collection('mensagens').add({
        remetente: 'cliente', texto, timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      await convRef.set({ ultimaMensagemEm: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return { statusCode: 200, body: 'conversa encerrada, aguardando atendente' };
    }

    // Pedido anterior já fechado, mas o cliente escreveu de novo agora → reabre a conversa normalmente
    if (conv.estado === 'fechado') {
      conv.estado = 'novo';
      conv.lembreteEnviado = false;
    }

    // ── 4. Salva mensagem do cliente ──
    await convRef.collection('mensagens').add({
      remetente: 'cliente', texto, timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // ── 5. Busca histórico recente pra dar contexto ao Claude ──
    const historicoSnap = await convRef.collection('mensagens')
      .orderBy('timestamp', 'desc').limit(12).get();
    const historico = historicoSnap.docs.reverse().map(d => {
      const m = d.data();
      return { role: m.remetente === 'cliente' ? 'user' : 'assistant', content: m.texto };
    });

    // ── 5.5 Verifica se esse cliente já tem pedido recente feito por outro canal (site/cardápio) ──
    const pedidoRecenteOutroCanal = await buscarPedidoRecenteMesmoTelefone(telefone);

    // ── 6. Chama o Claude — com o cardápio real vindo do banco (nunca inventado) ──
    const menuSnap = await db.collection('menu_items').where('active', '==', true).get();
    const cardapio = menuSnap.docs.map(d => {
      const m = d.data();
      return `- ${m.name} (${m.category}): R$ ${Number(m.price).toFixed(2).replace('.', ',')}${m.description ? ' — ' + m.description : ''}`;
    }).join('\n');

    const systemPrompt = `Você é a atendente virtual da Pizza em Dobro no WhatsApp. Seu nome é só "Pizza em Dobro" mesmo, sem nome próprio.

COMO FALAR:
- Frases curtas, palavras simples e fáceis, bem simpática e educada, do jeitinho que se fala no WhatsApp (pode usar emoji com moderação, tipo 🍕 😊).
- Nunca seja formal demais nem escreva parágrafo grande. Uma pergunta por vez.
- Se o cliente escrever errado ou abreviado, entenda numa boa, sem corrigir ele.
- NUNCA use markdown nem símbolos de formatação: nada de asteriscos (*, **), nada de #, nada de colchetes, nada de "(d)" ou qualquer marcação de texto. Escreva em texto puro, exatamente como uma pessoa digitaria no WhatsApp.
- Antes de fechar o pedido ou encerrar a conversa, releia com atenção tudo que já foi conversado, pra ter certeza absoluta do que o cliente pediu, do endereço e da forma de pagamento — nunca invente nem suponha algo que não foi dito.

SEU OBJETIVO:
1. Entender o que o cliente quer (pedir pizza, tirar dúvida, saber sobre a loja).
2. Se ele quiser pedir, conduza com calma até fechar o pedido inteiro (itens, endereço se for entrega, forma de pagamento) direto aqui no WhatsApp.
3. Se ele preferir pedir pelo site, explique rapidinho como fazer (é só entrar no site da loja, escolher as pizzas, colocar endereço e pagamento).
4. Tire qualquer dúvida sobre a pizzaria usando só as informações reais abaixo — nunca invente nada que não esteja aqui.
5. Assim que souber o nome do cliente, use nas mensagens seguintes — fica mais simpático.
${cfg.lojaFechada ? '\n⚠️ ATENÇÃO — LOJA FECHADA PRA PEDIDOS NOVOS HOJE: ' + (cfg.mensagemFechado || 'Hoje não estamos aceitando pedidos novos no momento.') + ' Você pode conversar e tirar dúvida numa boa, mas NÃO feche nenhum pedido (não escreva PEDIDO_FECHADO) enquanto isso estiver ativo.\n' : ''}
${pedidoRecenteOutroCanal ? '\n⚠️ ATENÇÃO — PEDIDO JÁ FEITO POR OUTRO CANAL: esse cliente já fez um pedido de R$ ' + Number(pedidoRecenteOutroCanal.total || 0).toFixed(2).replace('.', ',') + ' há pouco tempo pelo cardápio/site (não foi por aqui pelo WhatsApp). NÃO feche um pedido novo (não escreva PEDIDO_FECHADO) a não ser que o cliente deixe bem claro que quer ADICIONAR algo a mais ou fazer um pedido totalmente separado. Se ele só perguntar do pedido, confirme que já recebemos e está sendo preparado.\n' : ''}

INFORMAÇÕES REAIS DA PIZZARIA (use pra responder dúvidas):
- Endereço da loja: ${cfg.enderecoLoja || 'não informado — se perguntarem, diga que vai confirmar com a equipe'}
- Taxa de entrega: ${cfg.taxaEntrega || 'não informado — confirme com a equipe antes de garantir valor'}
- Tempo médio de entrega: ${cfg.tempoEntrega || 'não informado'}
- Formas de pagamento aceitas: ${cfg.formasPagamento || 'Pix, dinheiro e cartão na entrega'}
- Horário de atendimento do WhatsApp: das ${cfg.horarioInicio}h às ${cfg.horarioFim}h
${cfg.observacoesLoja ? '- Outras informações: ' + cfg.observacoesLoja : ''}

CARDÁPIO ATUAL (use somente estes itens e preços — nunca invente item ou valor que não esteja aqui):
${cardapio || '(cardápio não carregado — avise que vai confirmar com a loja antes de fechar)'}
Se o cliente pedir um sabor que NÃO está nessa lista, diga com simpatia que esse sabor está em falta hoje e sugira outro parecido do cardápio.

COMBOS "2 POR X" (promoção fixa — use EXATAMENTE estas faixas e sabores, nunca invente outra combinação ou preço):
- 2 Por R$ 65,00: escolha 2 sabores DIFERENTES (uma pizza de cada) entre Mussarela, Calabresa
- 2 Por R$ 75,00: escolha 2 sabores DIFERENTES (uma pizza de cada) entre Marguerita, Palmito, Frango Catupiry, Milho, Alho Frito, Calabresa Piry
- 2 Por R$ 80,00: escolha 2 sabores DIFERENTES (uma pizza de cada) entre Portuguesa, Toscana, 4 Queijos, Franqueijo, Bauru, Bacon
- 2 Por R$ 85,00: escolha 2 sabores DIFERENTES (uma pizza de cada) entre Brócolis com Bacon, Peperone, Franqueijo Piry, Toscana Piry, Bacon, Atum, Lombo, Peito de Peru
O combo é sempre 2 sabores diferentes, nunca 2 pizzas do mesmo sabor. Se o cliente pedir os 2 iguais, explique que o combo é uma pizza de cada e pergunte o segundo sabor. Se o cliente quiser um combo, pergunte os 2 sabores (dentro da faixa certa) antes de fechar. No PEDIDO_FECHADO, esse item vai como um único item com "name" no formato "2 Por R$ 65,00 — Sabor1 + Sabor2" e "price" igual ao valor total da faixa (não divida o preço). Só ofereça combo com os sabores certos daquela faixa — nunca misture sabor de uma faixa com preço de outra.

QUANDO O PEDIDO FECHAR:
Assim que o cliente confirmar tudo (itens, endereço, pagamento), agradeça, avise que a nossa atendente vai finalizar e confirmar o pedido, e SÓ DEPOIS disso escreva, numa linha separada, o bloco:
PEDIDO_FECHADO: {"itens":[{"name":"nome exato do item no cardápio","price":0.00,"qty":1,"borda":null,"removed":[],"added":[],"isMeia":false}], "endereco":"...", "pagamento":"...", "observacoes":"..."}
IMPORTANTE sobre o formato: use SEMPRE exatamente essas chaves em inglês ("name","price","qty","borda","removed","added","isMeia") em cada item — nunca "nome"/"preco"/"quantidade" ou qualquer variação, senão o pedido não carrega certo no caixa. "price" é o preço unitário (número, sem "R$"). "borda" é o nome da borda escolhida ou null se não tiver. "removed" e "added" são listas de textos (ex: ingredientes removidos/adicionados) ou listas vazias. "isMeia" é true somente se for pizza meio a meio.
Depois desse bloco, a conversa se encerra — não continue perguntando mais nada.

${conv.nomeCliente ? `O nome do cliente já é conhecido: ${conv.nomeCliente}. Use o nome dele nas mensagens, com carinho.` : `Você AINDA NÃO SABE o nome do cliente. Logo na primeira ou segunda mensagem, pergunte com simpatia "Como você gostaria de ser chamado?" (ou algo parecido, do seu jeito). Assim que ele responder o nome, escreva numa linha separada o bloco: NOME_CLIENTE: {"nome":"..."} — e a partir daí use o nome dele nas próximas mensagens.`}

QUANDO TRANSFERIR PRA ATENDENTE:
Se o cliente pedir pra falar com uma pessoa, reclamar de algo, ou o caso for complicado demais pra você resolver, seja gentil, diga que já vai chamar a atendente, e inclua ao final: TRANSFERIR_HUMANO: true`;

    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: historico
      })
    });
    const claudeData = await claudeResp.json();
    let resposta = claudeData?.content?.[0]?.text || 'Desculpa, não entendi. Pode repetir?';

    // ── 7. Detecta pedido fechado / transferência / nome do cliente ──
    let pedidoFechado = null;
    let transferirHumano = false;
    let nomeDetectado = null;

    const matchPedido = resposta.match(/PEDIDO_FECHADO:\s*(\{[\s\S]*\})/);
    if (matchPedido) {
      try { pedidoFechado = JSON.parse(matchPedido[1]); } catch (e) { /* ignora se vier malformado */ }
      resposta = resposta.replace(matchPedido[0], '').trim();
    }
    const matchNome = resposta.match(/NOME_CLIENTE:\s*(\{[\s\S]*?\})/);
    if (matchNome) {
      try { const obj = JSON.parse(matchNome[1]); if (obj.nome) nomeDetectado = String(obj.nome).trim(); } catch (e) { /* ignora se vier malformado */ }
      resposta = resposta.replace(matchNome[0], '').trim();
    }
    if (/TRANSFERIR_HUMANO:\s*true/.test(resposta)) {
      transferirHumano = true;
      resposta = resposta.replace(/TRANSFERIR_HUMANO:\s*true/, '').trim();
    }

    // rede de segurança: tira qualquer marcação de markdown que tenha escapado, pra sair texto puro e natural
    resposta = resposta
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/`{1,3}/g, '')
      .trim();

    // ── 8. Delay artificial de digitação (proporcional ao tamanho da resposta) ──
    const delayMs = Math.min(
      cfg.delayMaxMs || 4000,
      Math.max(cfg.delayMinMs || 800, resposta.length * 40)
    );
    await new Promise(r => setTimeout(r, delayMs));

    // ── 9. Envia resposta via Evolution API ──
    await fetch(`${cfg.evolutionUrl}/message/sendText/${cfg.instanceName}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'apikey': cfg.evolutionKey },
      body: JSON.stringify({ number: telefone, text: resposta })
    });

    // ── 10. Salva resposta do bot ──
    await convRef.collection('mensagens').add({
      remetente: 'bot', texto: resposta, timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // ── 11. Atualiza estado da conversa ──
    const novoEstado = transferirHumano ? 'aguardando_atendente'
      : pedidoFechado ? 'fechado' : 'montando_pedido';
    await convRef.set({ ...conv, estado: novoEstado, ultimaMensagemEm: admin.firestore.FieldValue.serverTimestamp(), lembreteEnviado: false, nomeCliente: nomeDetectado || conv.nomeCliente || null }, { merge: true });

    // ── 12. Se fechou pedido, grava em `orders` (mesma coleção do site) ──
    // TODO: validar itens/preços contra `menu_items` antes de gravar — não confiar cegamente no Claude.
    if (pedidoFechado) {
      const numeroSequencial = await obterProximoNumeroSequencial();
      const orderRef = await db.collection('orders').add({
        client_name: pedidoFechado.nome || '',
        client_phone: telefone,
        address: pedidoFechado.endereco || '',
        payment: pedidoFechado.pagamento || '',
        items_json: pedidoFechado.itens || [],
        status: 'novo',
        origem: 'whatsapp_bot',
        whatsapp_sent: true,
        numero_sequencial: numeroSequencial,
        created_at: new Date().toISOString()
      });
      await convRef.set({ pedidoId: orderRef.id, nomeCliente: pedidoFechado.nome || conv.nomeCliente || null }, { merge: true });
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('Erro no webhook do bot:', err);
    // Antes disso o cliente ficava sem NENHUMA resposta quando dava erro no meio do caminho.
    // Agora, se der pra identificar o telefone e a config do bot, avisa que deu problema
    // em vez de simplesmente sumir.
    try {
      if (telefone && cfg && cfg.evolutionUrl && cfg.instanceName && cfg.evolutionKey) {
        await fetch(`${cfg.evolutionUrl}/message/sendText/${cfg.instanceName}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'apikey': cfg.evolutionKey },
          body: JSON.stringify({
            number: telefone,
            text: 'Opa, tive um probleminha aqui pra te responder agora. 😅 Pode mandar de novo em instantes, ou se for urgente, chama a gente direto que já te atendemos!'
          })
        });
      }
    } catch (e2) {
      console.error('Erro ao avisar o cliente sobre a falha:', e2);
    }
    return { statusCode: 500, body: 'erro' };
  }
};
