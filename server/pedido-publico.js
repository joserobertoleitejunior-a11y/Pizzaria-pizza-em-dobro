// Página de avaliação (/cupom/?pedido=ID): devolve só o que o cupom mostra — sem
// telefone, endereço nem e-mail. A coleção "orders" não é mais legível pelo navegador.
const { db } = require('./lib/firebase');
const { json } = require('./lib/http');
const { reportError } = require('./lib/sentry');

exports.handler = async (event) => {
  const id = String((event.queryStringParameters || {}).id || '');
  if (!/^[A-Za-z0-9_-]{6,60}$/.test(id)) return json(400, { error: 'Pedido inválido.' });
  try {
    const doc = await db.collection('orders').doc(id).get();
    if (!doc.exists) return json(404, { error: 'Pedido não encontrado.' });
    const p = doc.data();
    return json(200, {
      id,
      client_name: (p.client_name || '').split(' ')[0] || null,
      payment: p.payment || null,
      delivery_type: p.delivery_type || null,
      total: Number(p.total || 0),
      items_json: (p.items_json || []).map(i => ({ name: i.name, price: Number(i.price || 0), borda: i.borda || null }))
    });
  } catch (err) {
    reportError(err, 'pedido-publico');
    return json(500, { error: 'Não foi possível carregar o pedido.' });
  }
};
