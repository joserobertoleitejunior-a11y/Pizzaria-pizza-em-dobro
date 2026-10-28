// ══════════════════════════════════════════════════════════
//  CONVERSOR DE PEDIDO — via IA (Gemini; Anthropic de reserva)
//  Recebe o texto colado do WhatsApp e devolve o pedido formatado.
//  A chave fica só aqui no servidor — nunca exposta no navegador
//  (antes ficava direto no código do site; corrigido).
// ══════════════════════════════════════════════════════════

const { admin, db } = require('./lib/firebase');
const { getSecrets } = require('./lib/secrets');
const { chamarIA } = require('./lib/ia');
const { reportError } = require('./lib/sentry');
const { exigirEquipe } = require('./lib/equipe');


exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'ok' };
  }

  // rota da equipe: sem o login (ID token + claim staff) qualquer pessoa na internet poderia usá-la
  if (!(await exigirEquipe(event))) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Login da equipe necessário.', erro: 'Login da equipe necessário.' }) };
  }

  try {
    const secrets = await getSecrets(db);
    if (!secrets.geminiKey && !secrets.anthropicKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Chave da IA não configurada. Coloque a chave no painel admin.' }) };
    }

    const payload = JSON.parse(event.body || '{}');
    const raw = String(payload.raw || '').slice(0, 6000);
    const systemPrompt = String(payload.systemPrompt || '').slice(0, 6000);
    if (!raw || !systemPrompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltou texto do pedido ou instrução.' }) };
    }

    // Gemini primeiro (chave do painel admin); Anthropic de reserva. 4000 tokens: os modelos 3.x
    // "pensam" antes de responder e isso conta no limite — com 800 a resposta (JSON) podia sair cortada.
    const data = await chamarIA(secrets, {
      max_tokens: 8000, system: systemPrompt, json: true,
      messages: [{ role: 'user', content: raw }]
    });
    if (data?.type === 'error') {
      const e = data.error || {};
      console.error('Erro da IA no conversor:', JSON.stringify(e));
      const motivo = e.gemini ? 'Gemini: ' + (e.gemini.message || e.gemini.type) + ' | reserva: ' + (e.message || e.type) : (e.message || e.type);
      return { statusCode: 500, body: JSON.stringify({ error: 'A IA não respondeu: ' + String(motivo || '').slice(0, 300) }) };
    }
    const texto = (data?.content || []).filter(b => b.type === 'text').map(b => b.text || '').join('');
    return { statusCode: 200, body: JSON.stringify({ texto }) };
  } catch (err) {
    reportError(err, 'parse-order');
    return { statusCode: 500, body: JSON.stringify({ error: 'Não foi possível processar o pedido agora.' }) };
  }
};
