// ══════════════════════════════════════════════════════════
//  WORKER DO CLOUDFLARE — Pizza em Dobro
//  • /api/<função>  → as funções de servidor (server/*.js), adaptadas do formato
//                     { httpMethod, headers, body, queryStringParameters } que elas já usam
//  • tarefa agendada (a cada 5 min) → bot-followup (lembra/encerra conversas paradas do bot)
//  • todo o resto   → arquivos estáticos (wrangler.jsonc: assets, servidos direto pela
//                     Cloudflare sem passar por aqui — "run_worker_first" só pra /api/*)
// ══════════════════════════════════════════════════════════
import adminApi from '../server/admin-api.js';
import criarPedido from '../server/criar-pedido.js';
import pedidoPublico from '../server/pedido-publico.js';
import cliente from '../server/cliente.js';
import registrarVisita from '../server/registrar-visita.js';
import staffLogin from '../server/staff-login.js';
import sendWhatsapp from '../server/send-whatsapp.js';
import parseOrder from '../server/parse-order.js';
import dashboardChat from '../server/dashboard-chat.js';
import dashboardAi from '../server/dashboard-ai.js';
import whatsappWebhook from '../server/whatsapp-webhook.js';
import botFollowup from '../server/bot-followup.js';
import sentry from '../server/lib/sentry.js';

// bot-followup fica de fora de propósito: só roda pelo agendamento, nunca por HTTP público
const ROTAS = {
  'admin-api': adminApi.handler,
  'criar-pedido': criarPedido.handler,
  'pedido-publico': pedidoPublico.handler,
  'cliente': cliente.handler,
  'registrar-visita': registrarVisita.handler,
  'staff-login': staffLogin.handler,
  'send-whatsapp': sendWhatsapp.handler,
  'parse-order': parseOrder.handler,
  'dashboard-chat': dashboardChat.handler,
  'dashboard-ai': dashboardAi.handler,
  'whatsapp-webhook': whatsappWebhook.handler
};

const LIMITE_CORPO = 1_500_000; // pedido/admin são pequenos; maior que isso é abuso

function popularEnv(env) {
  for (const [k, v] of Object.entries(env || {})) if (typeof v === 'string') process.env[k] = v;
}

function resposta(status, corpo, extra) {
  return new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(extra || {}) }
  });
}

export default {
  async fetch(request, env, ctx) {
    popularEnv(env);
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const nome = decodeURIComponent(url.pathname.slice(5)).replace(/\/+$/, '');
    const handler = Object.hasOwn(ROTAS, nome) ? ROTAS[nome] : null;
    if (!handler) return resposta(404, { error: 'Rota não encontrada.' });

    let corpo = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      corpo = await request.text();
      if (corpo.length > LIMITE_CORPO) return resposta(413, { error: 'Pedido grande demais.' });
    }
    const headers = {};
    request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    // IP vem SEMPRE da Cloudflare (não do cliente, que poderia forjar o cabeçalho) — o login da
    // equipe usa isso pra bloquear quem erra a senha várias vezes
    const ip = request.headers.get('cf-connecting-ip') || 'desconhecido';
    headers['x-nf-client-connection-ip'] = ip;
    headers['x-forwarded-for'] = ip;

    try {
      const r = await handler({
        httpMethod: request.method, headers, body: corpo,
        queryStringParameters: Object.fromEntries(url.searchParams), isBase64Encoded: false
      });
      return new Response(r.body == null ? '' : r.body, {
        status: r.statusCode || 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(r.headers || {}) }
      });
    } catch (err) {
      sentry.reportError(err, `api:${nome}`);
      return resposta(500, { error: 'Erro no servidor. Tente de novo.' });
    } finally {
      ctx.waitUntil(sentry.drenarRelatorios());
    }
  },

  async scheduled(_controle, env, ctx) {
    popularEnv(env);
    ctx.waitUntil((async () => {
      try {
        const r = await botFollowup.handler({ httpMethod: 'POST', headers: {}, body: '', queryStringParameters: {} });
        if (r && r.statusCode >= 400) console.error('bot-followup respondeu', r.statusCode, r.body);
      } catch (err) {
        sentry.reportError(err, 'cron:bot-followup');
      }
      await sentry.drenarRelatorios();
    })());
  }
};
