// ══════════════════════════════════════════════════════════
//  AUTENTICAÇÃO COM O GOOGLE — sem firebase-admin
//  O SDK firebase-admin não roda no Cloudflare Workers (precisa de gRPC/Node
//  inteiro). Aqui só WebCrypto + fetch, que funcionam em Workers e no Node 20+:
//   • getAccessToken()   — token OAuth da conta de serviço (pro Firestore REST)
//   • verifyIdToken()    — confere o login do usuário (assinatura, validade, projeto)
//   • createCustomToken()— gera o token que o navegador troca por sessão da equipe
//  Nos emuladores do Firebase (FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST)
//  os tokens não são assinados — só vale em teste; em produção essas variáveis
//  não existem.
// ══════════════════════════════════════════════════════════

const enc = new TextEncoder();

function b64url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : enc.encode(String(bytes));
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlParaBytes(str) {
  const b = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlParaJson(str) {
  return JSON.parse(new TextDecoder().decode(b64urlParaBytes(str)));
}
function pemParaDer(pem) {
  const b = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

const emuladorAuth = () => !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
const emuladorFirestore = () => !!process.env.FIRESTORE_EMULATOR_HOST;

let _saBruto = null, _sa = null, _chave = null;
function contaDeServico() {
  const bruto = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!bruto) throw new Error('FIREBASE_SERVICE_ACCOUNT não configurada.');
  if (bruto !== _saBruto) {
    _sa = JSON.parse(bruto);
    _saBruto = bruto;
    _chave = null;
  }
  return _sa;
}
function projectId() {
  if (emuladorAuth() || emuladorFirestore()) return process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'demo-pizza';
  return contaDeServico().project_id;
}

async function chavePrivada() {
  const sa = contaDeServico();
  if (!_chave) {
    _chave = await crypto.subtle.importKey('pkcs8', pemParaDer(sa.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  }
  return _chave;
}

async function assinarJwt(payload) {
  const cabecalho = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = b64url(JSON.stringify(payload));
  const dados = `${cabecalho}.${corpo}`;
  const assinatura = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await chavePrivada(), enc.encode(dados));
  return `${dados}.${b64url(new Uint8Array(assinatura))}`;
}

// ── Token de acesso (Firestore REST) ──
let _acesso = null, _acessoEmVoo = null;
async function getAccessToken() {
  if (_acesso && _acesso.exp - Date.now() > 120000) return _acesso.token;
  if (_acessoEmVoo) return _acessoEmVoo;
  _acessoEmVoo = (async () => {
    const sa = contaDeServico();
    const agora = Math.floor(Date.now() / 1000);
    const assertion = await assinarJwt({
      iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.access_token) throw new Error('Não foi possível autenticar no Google: ' + (j.error_description || j.error || res.status));
    _acesso = { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
    return _acesso.token;
  })().finally(() => { _acessoEmVoo = null; });
  return _acessoEmVoo;
}

// ── Verificação do login (ID token) ──
const URL_JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let _jwks = null;
async function chavesPublicas(forcar) {
  if (!forcar && _jwks && _jwks.exp > Date.now()) return _jwks.chaves;
  const res = await fetch(URL_JWKS);
  if (!res.ok) throw new Error('Não foi possível buscar as chaves públicas do Google.');
  const { keys } = await res.json();
  const chaves = {};
  for (const k of keys || []) chaves[k.kid] = k;
  _jwks = { chaves, exp: Date.now() + 60 * 60 * 1000 };
  return chaves;
}

async function verifyIdToken(token) {
  const partes = String(token || '').split('.');
  if (partes.length !== 3) throw new Error('Token inválido.');
  const cabecalho = b64urlParaJson(partes[0]);
  const payload = b64urlParaJson(partes[1]);
  const agora = Math.floor(Date.now() / 1000);

  if (emuladorAuth()) {
    // emulador: token sem assinatura (alg "none") — só confere projeto e validade
    if (cabecalho.alg !== 'none' && cabecalho.alg !== 'RS256') throw new Error('Token inválido.');
  } else {
    if (cabecalho.alg !== 'RS256' || !cabecalho.kid) throw new Error('Token inválido.');
    let jwk = (await chavesPublicas(false))[cabecalho.kid];
    if (!jwk) jwk = (await chavesPublicas(true))[cabecalho.kid];
    if (!jwk) throw new Error('Token com chave desconhecida.');
    const chave = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', chave, b64urlParaBytes(partes[2]), enc.encode(`${partes[0]}.${partes[1]}`));
    if (!ok) throw new Error('Assinatura do token inválida.');
  }
  const pid = projectId();
  if (payload.aud !== pid) throw new Error('Token de outro projeto.');
  if (payload.iss !== `https://securetoken.google.com/${pid}`) throw new Error('Emissor do token inválido.');
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Token sem usuário.');
  if (!(payload.exp > agora)) throw new Error('Token expirado.');
  if (payload.iat > agora + 300) throw new Error('Token emitido no futuro.');
  return { ...payload, uid: payload.sub };
}

// ── Token de login da equipe (custom token) ──
async function createCustomToken(uid, claims) {
  const agora = Math.floor(Date.now() / 1000);
  if (emuladorAuth()) {
    const cab = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const corpo = b64url(JSON.stringify({
      iss: 'firebase-auth-emulator@example.com', sub: 'firebase-auth-emulator@example.com',
      aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
      iat: agora, exp: agora + 3600, uid, claims: claims || {}
    }));
    return `${cab}.${corpo}.`;
  }
  const sa = contaDeServico();
  return assinarJwt({
    iss: sa.client_email, sub: sa.client_email,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: agora, exp: agora + 3600, uid, claims: claims || {}
  });
}

module.exports = { getAccessToken, verifyIdToken, createCustomToken, projectId, emuladorFirestore, b64url, b64urlParaJson };
