// Adaptador do Netlify: recebe /api/<rota> e chama o MESMO código de servidor que roda no
// Cloudflare (server/*.js). O Netlify já entrega { httpMethod, headers, body, ... } no formato que
// essas funções usam; aqui só escolhemos a rota e aplicamos o limite de tamanho.
const rotas = {
  'admin-api': require('../../server/admin-api').handler,
  'criar-pedido': require('../../server/criar-pedido').handler,
  'pedido-publico': require('../../server/pedido-publico').handler,
  'cliente': require('../../server/cliente').handler,
  'registrar-visita': require('../../server/registrar-visita').handler,
  'staff-login': require('../../server/staff-login').handler,
  'parse-order': require('../../server/parse-order').handler,
  'dashboard-chat': require('../../server/dashboard-chat').handler,
  'dashboard-ai': require('../../server/dashboard-ai').handler
};
const { reportError, drenarRelatorios } = require('../../server/lib/sentry');
const LIMITE_CORPO = 1_500_000;

function json(status, corpo) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(corpo) };
}

exports.handler = async (event) => {
  let caminho = '';
  try { caminho = new URL(event.rawUrl).pathname; } catch { caminho = event.path || ''; }
  const nome = decodeURIComponent(caminho.replace(/^\/(?:\.netlify\/functions\/api|api)\/?/, '')).replace(/\/+$/, '');
  const handler = Object.hasOwn(rotas, nome) ? rotas[nome] : null;
  if (!handler) return json(404, { error: 'Rota não encontrada.' });

  let corpo = event.body == null ? null : event.body;
  if (corpo && event.isBase64Encoded) corpo = Buffer.from(corpo, 'base64').toString('utf8');
  if (corpo && corpo.length > LIMITE_CORPO) return json(413, { error: 'Pedido grande demais.' });

  // IP do cliente vem do Netlify (não de cabeçalho que o cliente possa forjar)
  const headers = Object.assign({}, event.headers);
  const ip = (event.headers && (event.headers['x-nf-client-connection-ip'])) || 'desconhecido';
  headers['x-nf-client-connection-ip'] = ip;
  headers['x-forwarded-for'] = ip;

  try {
    const r = await handler({
      httpMethod: event.httpMethod, headers, body: corpo,
      queryStringParameters: event.queryStringParameters || {}, isBase64Encoded: false
    });
    return { statusCode: r.statusCode || 200, headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, r.headers || {}), body: r.body == null ? '' : r.body };
  } catch (err) {
    reportError(err, 'api:' + nome);
    return json(500, { error: 'Erro no servidor. Tente de novo.' });
  } finally {
    try { await drenarRelatorios(); } catch { /* observabilidade nunca derruba a resposta */ }
  }
};
