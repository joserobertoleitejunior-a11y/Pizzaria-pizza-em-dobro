// Comparação de senha resistente a timing attack — separado num módulo próprio
// pra dar pra testar sem precisar inicializar o Firebase Admin SDK (staff-login.js
// inicializa o app assim que é importado, o que quebraria um teste unitário simples).
const crypto = require('crypto');

function senhaConfere(digitada, real) {
  const a = Buffer.from(String(digitada || ''));
  const b = Buffer.from(String(real || ''));
  // tamanho igual é pré-requisito do timingSafeEqual — preenche o menor pra nunca
  // vazar o tamanho da senha certa por early-return, e ainda assim nunca "acerta" por acaso
  if (a.length !== b.length) {
    crypto.timingSafeEqual(a, a); // trabalho equivalente, só pra não vazar tempo por tamanho
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

module.exports = { senhaConfere };
