// Testes das functions do backend contra os emuladores de Firestore + Auth
// (npm run test:regras). Chama cada handler como a Netlify chamaria.
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.GCLOUD_PROJECT = 'demo-pizza';
process.env.STAFF_PASSWORD = 'senha-de-teste-123';
const { admin, db } = require('./admin-teste');
const criarPedido = require('../../server/criar-pedido').handler;
const pedidoPublico = require('../../server/pedido-publico').handler;
const registrarVisita = require('../../server/registrar-visita').handler;
const adminApi = require('../../server/admin-api').handler;
const staffLogin = require('../../server/staff-login').handler;

async function idToken(uid, claims) {
  const custom = await admin.auth().createCustomToken(uid, claims);
  const r = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: custom, returnSecureToken: true })
  });
  return (await r.json()).idToken;
}
const post = (body, token, headers = {}) => ({ httpMethod: 'POST', body: JSON.stringify(body), headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers } });
const corpo = (r) => JSON.parse(r.body);

let tokenEquipe, tokenCliente, tokenNaoVerificado;
before(async () => {
  tokenEquipe = await idToken('equipe-pizza-em-dobro', { staff: true });
  await admin.auth().createUser({ uid: 'uid-cliente', email: 'ana@gmail.com', emailVerified: true });
  await admin.auth().createUser({ uid: 'uid-naoverificado', email: 'bia@gmail.com', emailVerified: false });
  tokenCliente = await idToken('uid-cliente');
  tokenNaoVerificado = await idToken('uid-naoverificado');
});
beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-pizza/databases/(default)/documents`, { method: 'DELETE' });
  await db.doc('menu_items/2').set({ id: '2', slug_id: 2, name: 'Calabresa', price: 33.99, category: 'p', active: true });
});

const pedidoBase = () => ({
  name: 'Ana Souza', phone: '(15) 99999-0000', address: 'Rua A', num: '10', pay: 'Pix', type: 'entrega', total: 41.99,
  items: [{ id: '2', name: 'Calabresa', price: 33.99, borda: null, removed: [] }]
});

test('criar-pedido: grava, numera em sequência e marca origem', async () => {
  const r1 = await criarPedido(post(pedidoBase()));
  assert.equal(r1.statusCode, 200);
  const r2 = await criarPedido(post({ ...pedidoBase(), phone: '15888887777' }));
  assert.equal(corpo(r1).numero_sequencial, 1);
  assert.equal(corpo(r2).numero_sequencial, 2);
  const doc = (await db.doc('orders/' + corpo(r1).id).get()).data();
  assert.equal(doc.client_phone, '15999990000');
  assert.equal(doc.status, 'novo');
  assert.equal(doc.origem, 'loja');
  assert.equal(doc.conferir_preco, false);
});
test('criar-pedido: bloqueia duplicata (mesmo telefone e total em 10 min)', async () => {
  const r1 = corpo(await criarPedido(post(pedidoBase())));
  const r2 = corpo(await criarPedido(post(pedidoBase())));
  assert.equal(r2.duplicado, true);
  assert.equal(r2.id, r1.id);
  assert.equal((await db.collection('orders').get()).size, 1);
});
test('criar-pedido: tira HTML e ignora e-mail mandado no corpo', async () => {
  const r = corpo(await criarPedido(post({ ...pedidoBase(), name: '<script>x</script>Ana" onmouseover="x`\\', address: "Rua D'Ávila", email: 'outra@gmail.com' })));
  const doc = (await db.doc('orders/' + r.id).get()).data();
  assert.ok(!/[<>"`\\]/.test(doc.client_name));
  assert.equal(doc.address, "Rua D'Ávila");
  assert.equal(doc.client_email, null);
});
test('criar-pedido: e-mail vem do login Google verificado', async () => {
  const r = corpo(await criarPedido(post(pedidoBase(), tokenCliente)));
  assert.equal((await db.doc('orders/' + r.id).get()).data().client_email, 'ana@gmail.com');
  const r2 = corpo(await criarPedido(post({ ...pedidoBase(), phone: '15777776666' }, tokenNaoVerificado)));
  assert.equal((await db.doc('orders/' + r2.id).get()).data().client_email, null);
});
test('criar-pedido: preço abaixo do cardápio é marcado para conferência', async () => {
  const b = pedidoBase(); b.items[0].price = 1; b.total = 9;
  const r = corpo(await criarPedido(post(b)));
  const doc = (await db.doc('orders/' + r.id).get()).data();
  assert.equal(doc.conferir_preco, true);
  assert.ok(doc.divergencias_preco.length >= 1);
});
test('criar-pedido: recusa pedido incompleto', async () => {
  assert.equal((await criarPedido(post({ ...pedidoBase(), address: '' }))).statusCode, 400);
  assert.equal((await criarPedido(post({ ...pedidoBase(), items: [] }))).statusCode, 400);
  assert.equal((await criarPedido(post({ ...pedidoBase(), total: -5 }))).statusCode, 400);
  assert.equal((await criarPedido({ httpMethod: 'POST', body: 'lixo{' })).statusCode, 400);
});
test('pedido-publico: mostra só primeiro nome, sem telefone nem endereço', async () => {
  const { id } = corpo(await criarPedido(post(pedidoBase())));
  const r = corpo(await pedidoPublico({ queryStringParameters: { id } }));
  assert.equal(r.client_name, 'Ana');
  assert.equal(r.client_phone, undefined);
  assert.equal(r.address, undefined);
  assert.equal((await pedidoPublico({ queryStringParameters: { id: '../x' } })).statusCode, 400);
});
test('registrar-visita: soma no documento do dia', async () => {
  await registrarVisita({ httpMethod: 'POST' });
  await registrarVisita({ httpMethod: 'POST' });
  const snap = await db.collection('visits').get();
  assert.equal(snap.size, 1);
  assert.equal(snap.docs[0].data().count, 2);
});

test('admin-api: sem login, ou com login de cliente, é recusado', async () => {
  assert.equal((await adminApi(post({ acao: 'resumo' }))).statusCode, 401);
  assert.equal((await adminApi(post({ acao: 'resumo' }, tokenCliente))).statusCode, 401);
  assert.equal((await adminApi(post({ acao: 'resumo' }, 'token-falso'))).statusCode, 401);
});
test('admin-api: ação desconhecida ou nome de método interno é recusado', async () => {
  assert.equal((await adminApi(post({ acao: 'constructor' }, tokenEquipe))).statusCode, 400);
  assert.equal((await adminApi(post({ acao: 'apagarTudo' }, tokenEquipe))).statusCode, 400);
});
test('admin-api: cardápio valida e registra auditoria', async () => {
  const ruim = await adminApi(post({ acao: 'cardapio.salvar', dados: { slug_id: 50, name: 'X', price: 10, category: 'hack' } }, tokenEquipe));
  assert.equal(ruim.statusCode, 400);
  const ok = await adminApi(post({ acao: 'cardapio.salvar', dados: { slug_id: 50, name: 'Baiana', description: 'Molho, calabresa', price: 39.99, category: 's' } }, tokenEquipe));
  assert.equal(ok.statusCode, 200);
  assert.equal((await db.doc('menu_items/50').get()).data().price, 39.99);
  const aud = await db.collection('auditoria').get();
  assert.equal(aud.docs[0].data().acao, 'cardapio.salvar');
  const lista = corpo(await adminApi(post({ acao: 'cardapio.listar' }, tokenEquipe))).resultado;
  assert.equal(lista.length, 2);
});
test('admin-api: status de pedido só aceita valores conhecidos; excluir guarda cópia', async () => {
  const { id } = corpo(await criarPedido(post(pedidoBase())));
  assert.equal((await adminApi(post({ acao: 'pedidos.status', dados: { id, status: 'pago_hack' } }, tokenEquipe))).statusCode, 400);
  assert.equal((await adminApi(post({ acao: 'pedidos.status', dados: { id, status: 'confirmado' } }, tokenEquipe))).statusCode, 200);
  const resumo = corpo(await adminApi(post({ acao: 'resumo' }, tokenEquipe))).resultado;
  assert.equal(resumo.pedidosHoje, 1);
  assert.equal(resumo.pedidosAbertos, 1);
  await adminApi(post({ acao: 'pedidos.excluir', dados: { id } }, tokenEquipe));
  assert.equal((await db.doc('orders/' + id).get()).exists, false);
  assert.equal((await db.doc('pedidos_excluidos/' + id).get()).exists, true);
});
test('admin-api: chaves de API são gravadas mas nunca devolvidas', async () => {
  await adminApi(post({ acao: 'segredos.salvar', dados: { anthropicKey: 'sk-ant-123' } }, tokenEquipe));
  const r = await adminApi(post({ acao: 'segredos.status' }, tokenEquipe));
  assert.deepEqual(corpo(r).resultado, { anthropicKey: true, evolutionKey: false, geminiKey: false });
  assert.ok(!r.body.includes('sk-ant-123'));
});

test('staff-login PROVISÓRIO: marco/1234 entra; usuário ou senha errados não', async () => {
  assert.equal((await staffLogin(post({ usuario: 'marco', senha: '1234' }))).statusCode, 200);
  assert.equal((await staffLogin(post({ usuario: 'Marco ', senha: '1234' }))).statusCode, 200);
  assert.equal((await staffLogin(post({ usuario: 'marco', senha: 'errada' }))).statusCode, 401);
  assert.equal((await staffLogin(post({ usuario: 'outro', senha: '1234' }))).statusCode, 401);
  assert.equal((await staffLogin(post({ senha: '1234' }))).statusCode, 401);
});
