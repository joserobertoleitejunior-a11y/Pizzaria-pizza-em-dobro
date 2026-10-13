// Contador de visitas da loja: 1 documento por dia (id = data de São Paulo), incremento
// atômico no servidor. O navegador não escreve mais em "visits" (antes podia sobrescrever
// o contador com qualquer número).
const { admin, db } = require('./lib/firebase');
const { json, hojeBrasilia } = require('./lib/http');
const { reportError } = require('./lib/sentry');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Use POST.' });
  const hoje = hojeBrasilia();
  try {
    await db.collection('visits').doc(hoje).set({
      date: hoje,
      count: admin.firestore.FieldValue.increment(1),
      updated_at: new Date().toISOString()
    }, { merge: true });
    return json(200, { ok: true });
  } catch (err) {
    reportError(err, 'registrar-visita');
    return json(500, { error: 'falhou' });
  }
};
