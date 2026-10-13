// Teste de ponta a ponta do Worker DE VERDADE (workerd local, o mesmo motor do Cloudflare) ligado
// aos emuladores do Firebase. Roda com `npm run test:worker`.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const RAIZ = path.join(__dirname, '../..');
const PORTA = 8791;
const BASE = `http://127.0.0.1:${PORTA}`;
let worker;
let idTokenEquipe;

const post = (rota, corpo, headers = {}) => fetch(`${BASE}/api/${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) });

before(async () => {
  const vars = {
    FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
    FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    GCLOUD_PROJECT: 'demo-pizza',
    STAFF_PASSWORD: 'senha-de-teste-123',
    WEBHOOK_SECRET: 'segredo-do-webhook'
  };
  const args = ['wrangler', 'dev', '--port', String(PORTA), '--ip', '127.0.0.1', '--log-level', 'error', '--test-scheduled'];
  for (const [k, v] of Object.entries(vars)) args.push('--var', `${k}:${v}`);
  worker = spawn('npx', args, { cwd: RAIZ, detached: true, stdio: 'ignore' });
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(`${BASE}/robots.txt`)).ok) return; } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('O Worker local não subiu em 90s.');
});
after(() => { try { process.kill(-worker.pid, 'SIGKILL'); } catch { /* já saiu */ } });

test('site estático é servido e tem cabeçalhos de segurança', async () => {
  const r = await fetch(`${BASE}/`);
  assert.equal(r.status, 200);
  assert.match(await r.text(), /PIZZA EM DOBRO/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await fetch(`${BASE}/admin/`)).status, 200);
  assert.match((await fetch(`${BASE}/admin/`)).headers.get('x-robots-tag') || '', /noindex/);
});

test('NADA interno é publicado: código do servidor, regras do banco, testes, docs, dependências', async () => {
  for (const p of ['/server/admin-api.js', '/server/lib/firestore.js', '/firestore.rules', '/firebase.json', '/PROJECT_MAP.md', '/PADROES-AGENCIA.md',
    '/package.json', '/wrangler.jsonc', '/tests/regras/backend.test.js', '/worker/index.js', '/scripts/build-cf.js', '/.env.example', '/node_modules/wrangler/package.json',
    '/assets/fogo-fundo.mp4', '/assets/cardapio/atum.jpg']) {
    const r = await fetch(BASE + p);
    assert.equal(r.status, 404, `${p} não pode estar público (veio ${r.status})`);
  }
});

test('rota inexistente, bot-followup por HTTP e método errado', async () => {
  assert.equal((await post('nao-existe', {})).status, 404);
  assert.equal((await post('bot-followup', {})).status, 404);
  assert.equal((await post('constructor', {})).status, 404);
  assert.equal((await fetch(`${BASE}/api/criar-pedido`)).status, 405); // GET não cria nada
});

test('corpo gigante é recusado (413)', async () => {
  const r = await post('criar-pedido', 'x'.repeat(2_000_000));
  assert.equal(r.status, 413);
});

test('pedido da loja: grava, numera e a visita é contada', async () => {
  const pedido = { name: 'Ana Souza', phone: '(15) 99999-0000', address: 'Rua A', num: '10', pay: 'Pix', type: 'entrega', total: 41.99, items: [{ id: '2', name: 'Calabresa', price: 33.99 }] };
  const r = await post('criar-pedido', pedido);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.ok(j.id && j.numero_sequencial >= 1);
  const dup = await (await post('criar-pedido', pedido)).json();
  assert.equal(dup.duplicado, true);
  assert.equal((await post('registrar-visita', {})).status, 200);
  const publico = await (await fetch(`${BASE}/api/pedido-publico?id=${j.id}`)).json();
  assert.equal(publico.client_name, 'Ana');
  assert.equal(publico.client_phone, undefined);
});

test('rotas da equipe exigem login: admin-api, send-whatsapp, parse-order, dashboard-chat, dashboard-ai', async () => {
  for (const rota of ['admin-api', 'send-whatsapp', 'parse-order', 'dashboard-chat', 'dashboard-ai']) {
    assert.equal((await post(rota, { acao: 'resumo' })).status, 401, rota);
    assert.equal((await post(rota, { acao: 'resumo' }, { Authorization: 'Bearer lixo.lixo.lixo' })).status, 401, rota + ' (token falso)');
  }
});

test('login da equipe: senha errada recusa, certa devolve token que o admin-api aceita', async () => {
  assert.equal((await post('staff-login', { senha: 'errada' })).status, 401);
  const ok = await post('staff-login', { senha: 'senha-de-teste-123' });
  assert.equal(ok.status, 200);
  const { token } = await ok.json();
  const troca = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, returnSecureToken: true })
  });
  idTokenEquipe = (await troca.json()).idToken;
  assert.ok(idTokenEquipe);
  const resumo = await post('admin-api', { acao: 'resumo' }, { Authorization: 'Bearer ' + idTokenEquipe });
  assert.equal(resumo.status, 200);
  const dados = (await resumo.json()).resultado;
  assert.equal(dados.pedidosHoje, 1);
  assert.ok(dados.visitasHoje >= 1);
});

test('admin-api pelo Worker: salvar item do cardápio e ler de volta (e auditoria)', async () => {
  const h = { Authorization: 'Bearer ' + idTokenEquipe };
  const salvo = await post('admin-api', { acao: 'cardapio.salvar', dados: { slug_id: 77, name: 'Baiana', description: 'Calabresa e pimenta', price: 39.99, category: 's' } }, h);
  assert.equal(salvo.status, 200);
  const lista = (await (await post('admin-api', { acao: 'cardapio.listar' }, h)).json()).resultado;
  assert.ok(lista.some((i) => i.name === 'Baiana' && i.price === 39.99));
  const aud = (await (await post('admin-api', { acao: 'auditoria.listar' }, h)).json()).resultado;
  assert.equal(aud[0].acao, 'cardapio.salvar');
});

test('webhook do WhatsApp: sem token ou com token errado é recusado; com token passa', async () => {
  assert.equal((await post('whatsapp-webhook', {})).status, 401);
  assert.equal((await fetch(`${BASE}/api/whatsapp-webhook?token=errado`, { method: 'POST', body: '{}' })).status, 401);
  const ok = await fetch(`${BASE}/api/whatsapp-webhook?token=segredo-do-webhook`, { method: 'POST', body: '{}' });
  assert.equal(ok.status, 200); // payload sem mensagem → "ignorado"
});

test('bloqueio de senha por IP não é furado forjando cabeçalhos de IP', async () => {
  let ultimo;
  for (let i = 0; i < 10; i++) {
    ultimo = await post('staff-login', { senha: 'chute' + i }, { 'x-forwarded-for': `10.0.0.${i}`, 'x-nf-client-connection-ip': `10.9.9.${i}` });
  }
  assert.equal(ultimo.status, 429);
  const certaMasBloqueada = await post('staff-login', { senha: 'senha-de-teste-123' }, { 'x-forwarded-for': '1.2.3.4' });
  assert.equal(certaMasBloqueada.status, 429);
});

test('tarefa agendada (bot-followup) roda sem erro', async () => {
  const r = await fetch(`${BASE}/cdn-cgi/handler/scheduled`);
  assert.equal(r.status, 200);
});
