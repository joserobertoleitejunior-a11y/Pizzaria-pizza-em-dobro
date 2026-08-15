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

const admin = require('firebase-admin');
const { reportError } = require('./lib/sentry');
const { senhaConfere } = require('./lib/senha');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
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

    const payload = JSON.parse(event.body || '{}');
    const senha = String(payload.senha || '');
    if (!senhaConfere(senha, senhaReal)) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Senha incorreta.' }) };
    }

    const token = await admin.auth().createCustomToken('equipe-pizza-em-dobro', { staff: true });
    return { statusCode: 200, body: JSON.stringify({ token }) };
  } catch (err) {
    reportError(err, 'staff-login');
    return { statusCode: 500, body: JSON.stringify({ error: 'Não foi possível entrar agora. Tenta de novo em instantes.' }) };
  }
};
