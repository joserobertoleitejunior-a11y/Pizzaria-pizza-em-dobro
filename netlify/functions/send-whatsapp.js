// ══════════════════════════════════════════════════════════
//  ENVIO MANUAL DE WHATSAPP (mini-mensageiro do Caixa)
//  Antes, o Caixa chamava a Evolution API DIRETO do navegador,
//  usando a chave secreta que vinha junto no config/bot — ou seja,
//  a chave da Evolution API rodava no cliente. Movido pra cá: o
//  navegador só manda telefone+texto, a chave nunca sai do servidor.
// ══════════════════════════════════════════════════════════

const admin = require('firebase-admin');
const { getSecrets } = require('./lib/secrets');

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
    const payload = JSON.parse(event.body || '{}');
    const telefone = String(payload.telefone || '').trim();
    const texto = String(payload.texto || '').trim().slice(0, 4000);
    if (!telefone || !texto) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltou telefone ou texto da mensagem.' }) };
    }

    const cfgSnap = await db.collection('config').doc('bot').get();
    const cfg = cfgSnap.exists ? cfgSnap.data() : {};
    const secrets = await getSecrets(db);
    if (!cfg.evolutionUrl || !cfg.instanceName || !secrets.evolutionKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Configuração do bot incompleta (Evolution URL/instância/chave).' }) };
    }

    const resp = await fetch(`${cfg.evolutionUrl}/message/sendText/${cfg.instanceName}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: secrets.evolutionKey },
      body: JSON.stringify({ number: telefone, text: texto })
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      console.error('Evolution API recusou o envio manual:', resp.status, errBody);
      return { statusCode: 502, body: JSON.stringify({ error: 'A Evolution API recusou o envio.' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Erro ao enviar mensagem manual do Caixa:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Não foi possível enviar a mensagem agora.' }) };
  }
};
