// ══════════════════════════════════════════════════════════
//  STATUS DAS CHAVES (só true/false, nunca o valor) — usado pelo
//  painel bot-config pra mostrar "chave já configurada" sem nunca
//  devolver a chave de verdade pro navegador.
// ══════════════════════════════════════════════════════════

const admin = require('firebase-admin');
const { getSecrets, CAMPOS_SECRETOS } = require('./lib/secrets');
const { reportError } = require('./lib/sentry');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}
const db = admin.firestore();

exports.handler = async () => {
  try {
    const secrets = await getSecrets(db);
    const status = {};
    CAMPOS_SECRETOS.forEach(c => { status[c] = !!secrets[c]; });
    return { statusCode: 200, body: JSON.stringify(status) };
  } catch (err) {
    reportError(err, 'secrets-status');
    return { statusCode: 500, body: JSON.stringify({ error: 'Não foi possível checar as chaves agora.' }) };
  }
};
