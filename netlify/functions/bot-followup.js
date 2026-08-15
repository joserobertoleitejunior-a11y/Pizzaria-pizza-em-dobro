// ══════════════════════════════════════════════════════════
//  FOLLOW-UP AUTOMÁTICO — roda sozinha de tempos em tempos
//  Lembra o cliente que parou de responder e, se continuar
//  sumido, encerra a conversa educadamente.
// ══════════════════════════════════════════════════════════

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}
const db = admin.firestore();

exports.handler = async () => {
  try {
    const cfgSnap = await db.collection('config').doc('bot').get();
    const cfg = cfgSnap.exists ? cfgSnap.data() : null;
    if (!cfg || !cfg.ativo) return { statusCode: 200, body: 'bot inativo' };

    const minutosLembrete = Number(cfg.minutosLembrete) || 5;
    const minutosEncerrar = Number(cfg.minutosEncerrar) || 15;
    const agora = Date.now();

    // só olha conversas que ainda estão em andamento (não fechadas, não com humano)
    const snap = await db.collection('bot_conversas')
      .where('estado', 'in', ['novo', 'montando_pedido', 'aguardando_confirmacao'])
      .get();

    for (const doc of snap.docs) {
      const conv = doc.data();
      if (!conv.ultimaMensagemEm) continue;
      const ultima = conv.ultimaMensagemEm.toMillis ? conv.ultimaMensagemEm.toMillis() : new Date(conv.ultimaMensagemEm).getTime();
      const minutosParado = (agora - ultima) / 60000;

      // já passou do tempo de encerrar de vez
      if (minutosParado >= minutosEncerrar) {
        const msg = 'Vou deixar por aqui então! 😊 Quando quiser pedir sua pizza é só me chamar de novo. 🍕';
        await enviarMensagem(cfg, conv.telefone, msg);
        await doc.ref.collection('mensagens').add({
          remetente: 'bot', texto: msg, timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        await doc.ref.set({ estado: 'fechado' }, { merge: true });
        continue;
      }

      // já passou do tempo de lembrete, e ainda não mandou o lembrete
      if (minutosParado >= minutosLembrete && !conv.lembreteEnviado) {
        const msg = 'Oi! Ainda tá aí? 😊 Posso te ajudar a fechar seu pedido, é rapidinho! 🍕';
        await enviarMensagem(cfg, conv.telefone, msg);
        await doc.ref.collection('mensagens').add({
          remetente: 'bot', texto: msg, timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        await doc.ref.set({ lembreteEnviado: true }, { merge: true });
      }
    }

    // Observação: conversas "fechadas" (pedido concluído) não são mais reabertas por aqui.
    // Elas voltam a responder normalmente sozinhas, no próprio webhook, assim que o cliente
    // manda uma mensagem nova — isso evita reabrir e re-enviar mensagem de encerramento em loop.

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('Erro no follow-up do bot:', err);
    return { statusCode: 500, body: 'erro' };
  }
};

async function enviarMensagem(cfg, telefone, texto) {
  try {
    await fetch(`${cfg.evolutionUrl}/message/sendText/${cfg.instanceName}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'apikey': cfg.evolutionKey },
      body: JSON.stringify({ number: telefone, text: texto })
    });
  } catch (e) {
    console.error('Erro ao enviar follow-up:', e);
  }
}
