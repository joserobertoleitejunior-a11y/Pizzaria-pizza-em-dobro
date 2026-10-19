// ══════════════════════════════════════════════════════════
//  CADASTRO DO CLIENTE (loja) — acesso só com nome + número de WhatsApp,
//  sem senha e sem Google. Grava/atualiza clients/<DDD+número> pra equipe
//  ver quem é cliente. NÃO devolve nada de outras pessoas (nem pedidos):
//  o histórico do cliente fica no próprio aparelho dele.
// ══════════════════════════════════════════════════════════
const { db } = require('./lib/firebase');
const { json, lerCorpo, texto } = require('./lib/http');
const { reportError } = require('./lib/sentry');

// "(15) 99705-8390", "+55 15 997058390" → "15997058390"; null se não parecer celular/fixo BR
function normalizarTelefone(v) {
  let d = String(v || '').replace(/\D+/g, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  if (!/^[1-9][1-9](9\d{8}|[2-5]\d{7})$/.test(d)) return null;
  return d;
}

exports.normalizarTelefone = normalizarTelefone;
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Use POST.' });
  const d = lerCorpo(event);
  if (!d) return json(400, { error: 'Pedido inválido.' });
  const nome = texto(d.nome, 60);
  const tel = normalizarTelefone(d.telefone);
  if (!nome || nome.length < 2) return json(400, { error: 'Digite seu nome.' });
  if (!tel) return json(400, { error: 'Digite o WhatsApp com DDD. Ex.: (15) 99705-8390' });
  try {
    const ref = db.collection('clients').doc(tel);
    const atual = await ref.get();
    const agora = new Date().toISOString();
    const dados = { name: nome, phone: tel, last_visit: agora, updated_at: agora };
    if (!atual.exists) dados.created_at = agora;
    await ref.set(dados, { merge: true });
    return json(200, { ok: true, nome, telefone: tel });
  } catch (err) {
    reportError(err, 'cliente');
    return json(500, { error: 'Não foi possível entrar agora. Tente de novo.' });
  }
};
