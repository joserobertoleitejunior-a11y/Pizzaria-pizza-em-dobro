// Testes das regras do Firestore — rodam no emulador local (npm run test:regras).
// Cada caso simula quem está chamando: visitante anônimo, cliente logado com Google
// e equipe (claim staff), e confere que só o permitido passa.
const { test, before, after, beforeEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

let env;
const agora = new Date().toISOString();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pizza',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8') }
  });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('orders/pedidoA').set({ client_name: 'Ana', client_email: 'ana@gmail.com', client_phone: '15999990000', address: 'Rua X', total: 40, status: 'novo', created_at: agora });
    await db.doc('orders/pedidoB').set({ client_name: 'Bia', client_email: 'bia@gmail.com', total: 50, status: 'novo', created_at: agora });
    await db.doc('menu_items/2').set({ id: '2', slug_id: 2, name: 'Calabresa', price: 33.99, category: 'p', active: true });
    await db.doc('config/bot').set({ enderecoLoja: 'Rua da Pizzaria' });
    await db.doc('config_secrets/bot').set({ anthropicKey: 'segredo' });
    await db.doc('feedbacks/f1').set({ name: 'Ana', stars: 5, comment: 'Ótima', likes: 3, created_at: agora });
    await db.doc('feedback_comments/c1').set({ feedback_id: 'f1', author: 'Ana', author_uid: 'uid-ana', comment: 'oi', created_at: agora });
    await db.doc('motoboys/m1').set({ nome: 'João' });
    await db.doc('clients/ana@gmail.com').set({ email: 'ana@gmail.com', name: 'Ana', admin_obs: 'cliente fiel' });
  });
});

const anonimo = () => env.unauthenticatedContext().firestore();
const cliente = (email = 'ana@gmail.com', uid = 'uid-ana') => env.authenticatedContext(uid, { email, email_verified: true }).firestore();
const equipe = () => env.authenticatedContext('equipe-pizza-em-dobro', { staff: true }).firestore();

// ── Público ──
test('visitante lê cardápio e config pública', async () => {
  await assertSucceeds(anonimo().doc('menu_items/2').get());
  await assertSucceeds(anonimo().doc('config/bot').get());
});
test('visitante NÃO altera preço do cardápio', async () => {
  await assertFails(anonimo().doc('menu_items/2').update({ price: 0.01 }));
  await assertFails(cliente().doc('menu_items/2').update({ price: 0.01 }));
});
test('visitante NÃO altera config', async () => {
  await assertFails(anonimo().doc('config/bot').set({ enderecoLoja: 'hack' }));
});
test('ninguém pelo navegador lê as chaves de API — nem a equipe', async () => {
  await assertFails(anonimo().doc('config_secrets/bot').get());
  await assertFails(equipe().doc('config_secrets/bot').get());
  await assertFails(equipe().doc('config_secrets/bot').set({ anthropicKey: 'x' }));
});

// ── Pedidos ──
test('visitante NÃO lista, lê, cria nem apaga pedidos', async () => {
  await assertFails(anonimo().collection('orders').get());
  await assertFails(anonimo().doc('orders/pedidoA').get());
  await assertFails(anonimo().collection('orders').add({ total: 1 }));
  await assertFails(anonimo().doc('orders/pedidoA').delete());
});
test('cliente Google lê só os próprios pedidos', async () => {
  await assertSucceeds(cliente().collection('orders').where('client_email', '==', 'ana@gmail.com').get());
  await assertSucceeds(cliente().doc('orders/pedidoA').get());
  await assertFails(cliente().doc('orders/pedidoB').get());
  await assertFails(cliente().collection('orders').get());
  await assertFails(cliente().doc('orders/pedidoA').update({ status: 'cancelado' }));
  const naoVerificado = env.authenticatedContext('uid-x', { email: 'ana@gmail.com', email_verified: false }).firestore();
  await assertFails(naoVerificado.doc('orders/pedidoA').get());
});
test('equipe lê e atualiza pedidos', async () => {
  await assertSucceeds(equipe().collection('orders').get());
  await assertSucceeds(equipe().doc('orders/pedidoA').update({ status: 'confirmado' }));
});

// ── Clientes ──
test('cliente grava o próprio perfil, sem tocar nas anotações da equipe', async () => {
  await assertSucceeds(cliente().doc('clients/ana@gmail.com').update({ last_visit: agora, name: 'Ana Souza' }));
  await assertFails(cliente().doc('clients/ana@gmail.com').update({ admin_obs: 'apaguei' }));
  await assertFails(cliente().doc('clients/bia@gmail.com').set({ email: 'bia@gmail.com', name: 'x' }));
  await assertFails(anonimo().doc('clients/ana@gmail.com').get());
  await assertSucceeds(cliente('nova@gmail.com', 'uid-nova').doc('clients/nova@gmail.com').set({ email: 'nova@gmail.com', name: 'Nova', via_google: true, last_visit: agora }));
});

// ── Avaliações e depoimentos ──
test('avaliação do cupom só para pedido que existe, nota 1-5, sem HTML', async () => {
  const ok = { pedido_id: 'pedidoA', client_name: 'Ana', nota: 5, comentario: 'top', created_at: agora };
  await assertSucceeds(anonimo().collection('avaliacoes').add(ok));
  await assertFails(anonimo().collection('avaliacoes').add({ ...ok, pedido_id: 'naoexiste' }));
  await assertFails(anonimo().collection('avaliacoes').add({ ...ok, nota: 9 }));
  await assertFails(anonimo().collection('avaliacoes').add({ ...ok, comentario: '<script>alert(1)</script>' }));
  await assertFails(anonimo().collection('avaliacoes').add({ ...ok, extra: 'campo' }));
  await assertFails(anonimo().collection('avaliacoes').get());
});
test('depoimento: cria válido, bloqueia HTML e campo extra', async () => {
  const ok = { name: 'Carlos', stars: 4, comment: 'Muito bom', fb_photo: null, via_facebook: false, pizza_photo: null, created_at: agora };
  await assertSucceeds(anonimo().collection('feedbacks').add(ok));
  await assertFails(anonimo().collection('feedbacks').add({ ...ok, name: '<img src=x onerror=alert(1)>' }));
  await assertFails(anonimo().collection('feedbacks').add({ ...ok, stars: 6 }));
  await assertFails(anonimo().collection('feedbacks').add({ ...ok, likes: 999 }));
});
test('curtida só soma 1 e não mexe em mais nada', async () => {
  await assertSucceeds(anonimo().doc('feedbacks/f1').update({ likes: 4, updated_at: agora }));
  await assertFails(anonimo().doc('feedbacks/f1').update({ likes: 500 }));
  await assertFails(anonimo().doc('feedbacks/f1').update({ comment: 'trocado' }));
  await assertFails(anonimo().doc('feedbacks/f1').delete());
  await assertSucceeds(equipe().doc('feedbacks/f1').delete());
});
test('comentário: autor edita o próprio texto; outros não', async () => {
  await assertSucceeds(cliente().doc('feedback_comments/c1').update({ comment: 'editado', updated_at: agora }));
  await assertFails(cliente('bia@gmail.com', 'uid-bia').doc('feedback_comments/c1').update({ comment: 'hack' }));
  await assertFails(anonimo().doc('feedback_comments/c1').update({ comment: 'hack' }));
  await assertFails(anonimo().collection('feedback_comments').add({ feedback_id: 'f1', author: 'X', author_uid: 'uid-ana', comment: 'finge ser a Ana', created_at: agora }));
  await assertSucceeds(anonimo().collection('feedback_comments').add({ feedback_id: 'f1', author: 'X', author_uid: null, comment: 'oi', created_at: agora }));
});

// ── Só equipe ──
test('motoboys, contadores, conversas do bot e visitas: só equipe', async () => {
  await assertFails(anonimo().collection('motoboys').get());
  await assertFails(cliente().collection('motoboys').get());
  await assertSucceeds(equipe().collection('motoboys').get());
  await assertFails(anonimo().doc('contadores/pedidos_2026-01-01').set({ atual: 1 }));
  await assertFails(anonimo().collection('bot_conversas').get());
  await assertFails(anonimo().doc('visits/2026-01-01').set({ count: 999999 }));
  await assertFails(equipe().doc('visits/2026-01-01').set({ count: 1 }));
});
test('auditoria e backups de pedido excluído não são graváveis pelo navegador', async () => {
  await assertFails(equipe().collection('auditoria').add({ acao: 'falsa' }));
  await assertSucceeds(equipe().collection('auditoria').get());
  await assertFails(equipe().collection('pedidos_excluidos').get());
  await assertFails(anonimo().collection('seguranca_login').get());
});
test('coleção não listada fica bloqueada', async () => {
  await assertFails(equipe().collection('qualquer_coisa').add({ a: 1 }));
});
