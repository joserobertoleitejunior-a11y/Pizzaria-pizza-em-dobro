// ══════════════════════════════════════════════════════════
//  CONVERSOR DE PEDIDO — via Anthropic (Claude)
//  Recebe o texto colado do WhatsApp e devolve o pedido formatado.
//  A chave fica só aqui no servidor — nunca exposta no navegador
//  (antes ficava direto no código do site; corrigido).
// ══════════════════════════════════════════════════════════

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}
const db = admin.firestore();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'ok' };
  }

  try {
    const cfgSnap = await db.collection('config').doc('bot').get();
    const cfg = cfgSnap.exists ? cfgSnap.data() : null;
    if (!cfg || !cfg.anthropicKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Chave da Anthropic não configurada no painel do bot.' }) };
    }

    const payload = JSON.parse(event.body || '{}');
    const raw = String(payload.raw || '').slice(0, 6000);
    const systemPrompt = String(payload.systemPrompt || '').slice(0, 6000);
    if (!raw || !systemPrompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltou texto do pedido ou instrução.' }) };
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: raw }]
      })
    });
    const data = await resp.json();
    if (data.type === 'error') {
      console.error('Erro da API da Anthropic:', JSON.stringify(data.error));
      return { statusCode: 500, body: JSON.stringify({ error: data.error?.message || 'Erro da API da Anthropic.' }) };
    }
    const texto = (data?.content || []).map(b => b.text || '').join('');
    return { statusCode: 200, body: JSON.stringify({ texto }) };
  } catch (err) {
    console.error('Erro no conversor (Anthropic):', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Não foi possível processar o pedido agora.' }) };
  }
};
