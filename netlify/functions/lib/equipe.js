// Confere NO SERVIDOR quem está chamando: o navegador manda o ID token do Firebase
// (Authorization: Bearer ...) e aqui o Admin SDK valida assinatura, validade e o claim
// "staff" que só o staff-login.js emite. Nada de confiar em flag vinda do navegador.
const { admin } = require('./firebase');

function tokenDoCabecalho(event) {
  const h = event.headers || {};
  const bruto = h.authorization || h.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(bruto);
  return m ? m[1] : null;
}

async function usuarioDoToken(event) {
  const token = tokenDoCabecalho(event);
  if (!token) return null;
  try { return await admin.auth().verifyIdToken(token); } catch { return null; }
}

async function exigirEquipe(event) {
  const u = await usuarioDoToken(event);
  return u && u.staff === true ? u : null;
}

module.exports = { usuarioDoToken, exigirEquipe };
