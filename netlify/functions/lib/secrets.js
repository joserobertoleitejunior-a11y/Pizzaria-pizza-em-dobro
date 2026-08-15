// ══════════════════════════════════════════════════════════
//  SEGREDOS DO BOT (Anthropic/Evolution/Gemini) — nunca no navegador
//  Antes, as 3 chaves viviam dentro de config/bot, o MESMO documento
//  que o Caixa e o painel bot-config leem direto do navegador via
//  Firestore client SDK — ou seja, qualquer um que abrisse essas
//  páginas baixava as chaves de API secretas junto com os campos
//  públicos (endereço, horário etc). Corrigido: as chaves agora
//  moram em config_secrets/bot, um documento que só o Admin SDK
//  (server, aqui) consegue ler — nunca fica exposto num fetch de
//  página. getSecrets() faz a migração sozinha, uma única vez, na
//  primeira chamada depois do deploy: copia o que achar de chave
//  em config/bot pra cá e apaga de lá, sem exigir nenhuma ação
//  manual e sem derrubar o bot no meio da migração.
// ══════════════════════════════════════════════════════════

const admin = require('firebase-admin');

const CAMPOS_SECRETOS = ['anthropicKey', 'evolutionKey', 'geminiKey'];

async function getSecrets(db) {
  const secretRef = db.collection('config_secrets').doc('bot');
  const secretSnap = await secretRef.get();
  let secrets = secretSnap.exists ? secretSnap.data() : {};

  const faltando = CAMPOS_SECRETOS.filter(c => !secrets[c]);
  if (faltando.length) {
    try {
      const legadoRef = db.collection('config').doc('bot');
      const legadoSnap = await legadoRef.get();
      const legado = legadoSnap.exists ? legadoSnap.data() : {};
      const copiar = {};
      faltando.forEach(c => { if (legado[c]) copiar[c] = legado[c]; });
      if (Object.keys(copiar).length) {
        await secretRef.set(copiar, { merge: true });
        const limpar = {};
        Object.keys(copiar).forEach(c => { limpar[c] = admin.firestore.FieldValue.delete(); });
        await legadoRef.update(limpar);
        secrets = { ...secrets, ...copiar };
      }
    } catch (e) {
      console.warn('Não foi possível migrar as chaves para config_secrets/bot automaticamente.', e);
    }
  }
  return secrets;
}

module.exports = { getSecrets, CAMPOS_SECRETOS };
