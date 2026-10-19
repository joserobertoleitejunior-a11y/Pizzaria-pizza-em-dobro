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

const { admin } = require('./lib/firebase');
const { reportError } = require('./lib/sentry');
const { senhaConfere } = require('./lib/senha');

// ⚠️ PROVISÓRIO (pedido do José): acesso fixo usuário "marco" / senha "1234", sem bloqueio
// por tentativas e sem depender de STAFF_PASSWORD. TROCAR por senha forte antes de abrir ao público.
const ACESSO_PROVISORIO = { usuario: 'marco', senha: '1234' };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'ok' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const usuario = String(payload.usuario || '').trim().toLowerCase();
    const senha = String(payload.senha || '');
    const usuarioOk = senhaConfere(usuario, ACESSO_PROVISORIO.usuario);
    const senhaOk = senhaConfere(senha, ACESSO_PROVISORIO.senha);
    if (!usuarioOk || !senhaOk) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Usuário ou senha incorretos.' }) };
    }
    const token = await admin.auth().createCustomToken('equipe-pizza-em-dobro', { staff: true });
    return { statusCode: 200, body: JSON.stringify({ token }) };
  } catch (err) {
    reportError(err, 'staff-login');
    return { statusCode: 500, body: JSON.stringify({ error: 'Não foi possível entrar agora. Tenta de novo em instantes.' }) };
  }
};
