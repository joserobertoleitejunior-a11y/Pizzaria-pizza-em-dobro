// ══════════════════════════════════════════════════════════
//  LOGIN DA EQUIPE — senha única, verificada NO SERVIDOR
//  Antes, Caixa/Relatórios/Clientes/bot-config/painel não tinham
//  NENHUMA proteção — só "ninguém sabe a URL". Isso troca por senha
//  única checada aqui (nunca no navegador) que, se bater, gera um
//  token de login de verdade do Firebase (custom token). O navegador
//  troca esse token por uma sessão real via
//  firebase.auth().signInWithCustomToken(token) — a partir daí,
//  firestore.rules consegue checar request.auth.token.staff==true
//  de verdade, não só "escondendo o link no frontend".
// ══════════════════════════════════════════════════════════

const crypto = require('crypto');
const { admin, db } = require('./lib/firebase');
const { reportError } = require('./lib/sentry');
const { senhaConfere } = require('./lib/senha');

// Anti força bruta: no máximo 8 senhas erradas por IP a cada 15 min. O IP vai
// com hash (não guardamos IP de ninguém em texto puro).
const MAX_ERROS = 8;
const JANELA_MS = 15 * 60 * 1000;
function refTentativas(event) {
  const h = event.headers || {};
  const ip = h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || 'desconhecido';
  const id = crypto.createHash('sha256').update(String(ip).split(',')[0].trim()).digest('hex').slice(0, 32);
  return db.collection('seguranca_login').doc(id);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'ok' };
  }

  try {
    const senhaReal = process.env.STAFF_PASSWORD || '';
    if (!senhaReal) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Senha da equipe ainda não foi configurada (STAFF_PASSWORD nas variáveis de ambiente da Netlify).' }) };
    }

    const ref = refTentativas(event);
    const snap = await ref.get();
    const t = snap.exists ? snap.data() : { erros: 0, desde: 0 };
    const agora = Date.now();
    const dentroDaJanela = agora - (t.desde || 0) < JANELA_MS;
    if (dentroDaJanela && t.erros >= MAX_ERROS) {
      return { statusCode: 429, body: JSON.stringify({ error: 'Muitas tentativas erradas. Espere 15 minutos.' }) };
    }

    const payload = JSON.parse(event.body || '{}');
    const senha = String(payload.senha || '');
    if (!senhaConfere(senha, senhaReal)) {
      await ref.set(dentroDaJanela ? { erros: (t.erros || 0) + 1, desde: t.desde } : { erros: 1, desde: agora });
      return { statusCode: 401, body: JSON.stringify({ error: 'Senha incorreta.' }) };
    }
    if (snap.exists) await ref.delete();

    const token = await admin.auth().createCustomToken('equipe-pizza-em-dobro', { staff: true });
    return { statusCode: 200, body: JSON.stringify({ token }) };
  } catch (err) {
    reportError(err, 'staff-login');
    return { statusCode: 500, body: JSON.stringify({ error: 'Não foi possível entrar agora. Tenta de novo em instantes.' }) };
  }
};
