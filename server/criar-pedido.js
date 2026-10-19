// ══════════════════════════════════════════════════════════
//  CRIAR PEDIDO (loja) — o navegador do cliente não grava mais em
//  "orders" direto. Aqui: valida e limpa cada campo, gera o número
//  sequencial do dia (fuso de São Paulo), bloqueia pedido duplicado
//  (mesmo telefone + mesmo total em 10 min) e confere os preços com
//  o cardápio do banco. Preço divergente NÃO derruba o pedido (o
//  cliente já mandou pelo WhatsApp) — marca conferir_preco pro Caixa.
// ══════════════════════════════════════════════════════════
const { admin, db } = require('./lib/firebase');
const { json, lerCorpo, texto, numero, hojeBrasilia } = require('./lib/http');
const { usuarioDoToken } = require('./lib/equipe');
const { reportError } = require('./lib/sentry');

const TIPOS = ['entrega', 'retirada'];

function limparItens(lista) {
  if (!Array.isArray(lista) || !lista.length || lista.length > 60) return null;
  const itens = [];
  for (const i of lista) {
    if (!i || typeof i !== 'object') return null;
    const name = texto(i.name, 160);
    const price = numero(i.price, 0, 1000);
    if (!name || price === null) return null;
    itens.push({
      id: texto(i.id, 60),
      name,
      price,
      borda: /^(sem|nenhuma|n[aã]o)\b/i.test(String(i.borda || '').trim()) ? null : texto(i.borda, 60),
      removed: Array.isArray(i.removed) ? i.removed.slice(0, 20).map(r => texto(r, 60)).filter(Boolean) : []
    });
  }
  return itens;
}

async function conferirPrecos(itens) {
  const divergencias = [];
  const ids = [...new Set(itens.map(i => i.id).filter(Boolean))].slice(0, 30);
  if (ids.length) {
    const docs = await db.getAll(...ids.map(id => db.collection('menu_items').doc(id)));
    const cardapio = {};
    docs.forEach(d => { if (d.exists) cardapio[d.id] = d.data(); });
    for (const i of itens) {
      const m = i.id && cardapio[i.id];
      if (m && m.name === i.name && i.price + 0.01 < Number(m.price)) {
        divergencias.push(`${i.name}: enviado ${i.price.toFixed(2)}, cardápio ${Number(m.price).toFixed(2)}`);
      }
    }
  }
  // o total NÃO é comparado com a soma dos itens: a loja aplica desconto de promoção e soma
  // borda/acréscimos/entrega por cima — a conferência confiável é preço de cada item vs. cardápio
  return divergencias;
}

async function proximoNumero() {
  // incremento atômico no banco: pedidos simultâneos nunca recebem o mesmo número
  return db.incrementar(db.collection('contadores').doc('pedidos_' + hojeBrasilia()), 'atual', 1);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Use POST.' });
  const b = lerCorpo(event);
  if (!b) return json(400, { error: 'Pedido inválido.' });

  const pedido = {
    client_name: texto(b.name, 80),
    client_phone: texto(String(b.phone || '').replace(/\D/g, ''), 15),
    address: texto(b.address, 200),
    house_number: texto(b.num, 20),
    payment: texto(b.pay, 40),
    change_for: texto(b.change, 40),
    delivery_type: TIPOS.includes(b.type) ? b.type : null,
    total: numero(b.total, 0, 5000),
    items_json: limparItens(b.items)
  };
  if (!pedido.client_name || !pedido.delivery_type || pedido.total === null || !pedido.items_json) {
    return json(400, { error: 'Pedido incompleto.' });
  }
  if (pedido.delivery_type === 'entrega' && !pedido.address) return json(400, { error: 'Endereço obrigatório para entrega.' });

  try {
    if (pedido.client_phone) {
      const dezMin = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const recentes = await db.collection('orders').where('client_phone', '==', pedido.client_phone).limit(10).get();
      const dup = recentes.docs.find(d => {
        const o = d.data();
        return String(o.created_at || '') >= dezMin && Math.abs(Number(o.total || 0) - pedido.total) < 0.01;
      });
      if (dup) return json(200, { id: dup.id, numero_sequencial: dup.data().numero_sequencial || null, duplicado: true });
    }

    // e-mail só entra se vier de um login Google verificado — nunca do corpo da requisição
    const usuario = await usuarioDoToken(event);
    const divergencias = await conferirPrecos(pedido.items_json);
    const numero_sequencial = await proximoNumero();

    const ref = await db.collection('orders').add({
      ...pedido,
      client_email: usuario && usuario.email && usuario.email_verified ? usuario.email : null,
      client_uid: usuario ? usuario.uid : null,
      whatsapp_sent: true,
      status: 'novo',
      origem: 'loja',
      numero_sequencial,
      conferir_preco: divergencias.length > 0,
      divergencias_preco: divergencias,
      created_at: new Date().toISOString(),
      server_created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return json(200, { id: ref.id, numero_sequencial });
  } catch (err) {
    reportError(err, 'criar-pedido');
    return json(500, { error: 'Não foi possível registrar o pedido agora.' });
  }
};
