// A camada REST (server/lib/firestore.js) tem que se comportar como o SDK oficial naquilo que o
// projeto usa. Cada teste grava por um lado e confere pelo outro (SDK oficial ↔ REST).
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.GCLOUD_PROJECT = 'demo-pizza';
const { db: oficial } = require('./admin-teste');
const { admin, db } = require('../../server/lib/firebase');
const FieldValue = admin.firestore.FieldValue;

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-pizza/databases/(default)/documents`, { method: 'DELETE' });
});

test('tipos: texto, inteiro, decimal, booleano, nulo, lista, mapa e data fazem a viagem de ida e volta', async () => {
  const ts = new Date('2026-03-04T05:06:07.123Z');
  await db.doc('t/1').set({ s: 'olá "mundo" \\ ç', i: 8, d: 33.99, neg: -5, b: true, n: null, l: [1, 'a', { x: 2 }], m: { a: { b: 'fundo' } }, dt: ts, vazio: {}, vazioL: [] });
  const viaOficial = (await oficial.doc('t/1').get()).data();
  assert.equal(viaOficial.s, 'olá "mundo" \\ ç');
  assert.equal(viaOficial.i, 8);
  assert.equal(viaOficial.d, 33.99);
  assert.equal(viaOficial.n, null);
  assert.deepEqual(viaOficial.l, [1, 'a', { x: 2 }]);
  assert.equal(viaOficial.m.a.b, 'fundo');
  assert.equal(viaOficial.dt.toMillis(), ts.getTime());
  const viaRest = (await db.doc('t/1').get()).data();
  assert.equal(viaRest.i, 8);
  assert.equal(viaRest.d, 33.99);
  assert.equal(viaRest.dt.toMillis(), ts.getTime());
  assert.deepEqual(viaRest.l, [1, 'a', { x: 2 }]);
  assert.deepEqual(viaRest.vazio, {});
});

test('lê o que o SDK oficial gravou (inclui timestamp com toMillis, usado pelo bot-followup)', async () => {
  await oficial.doc('t/2').set({ ultimaMensagemEm: new Date(Date.now() - 6 * 60000), estado: 'novo' });
  const d = (await db.doc('t/2').get()).data();
  assert.ok(typeof d.ultimaMensagemEm.toMillis === 'function');
  assert.ok(Date.now() - d.ultimaMensagemEm.toMillis() > 5 * 60000);
});

test('documento que não existe: exists=false e data() undefined', async () => {
  const s = await db.doc('t/naoexiste').get();
  assert.equal(s.exists, false);
  assert.equal(s.data(), undefined);
});

test('id com @ . + e acento (e-mail como id de documento)', async () => {
  await db.doc('clients/ana.sousa+x@gmail.com').set({ name: 'Ana' });
  assert.equal((await oficial.doc('clients/ana.sousa+x@gmail.com').get()).data().name, 'Ana');
  assert.equal((await db.doc('clients/ana.sousa+x@gmail.com').get()).data().name, 'Ana');
});

test('set com merge:true mescla mapas aninhados sem apagar o resto', async () => {
  await db.doc('t/3').set({ a: { x: 1, y: 2 }, keep: 'sim' });
  await db.doc('t/3').set({ a: { y: 20, z: 30 } }, { merge: true });
  assert.deepEqual((await oficial.doc('t/3').get()).data(), { a: { x: 1, y: 20, z: 30 }, keep: 'sim' });
});

test('set sem merge substitui o documento inteiro', async () => {
  await db.doc('t/4').set({ a: 1, b: 2 });
  await db.doc('t/4').set({ c: 3 });
  assert.deepEqual((await oficial.doc('t/4').get()).data(), { c: 3 });
});

test('FieldValue.delete() com merge remove só aquele campo (migração de chaves secretas)', async () => {
  await db.doc('config/bot').set({ anthropicKey: 'k', endereco: 'Rua' });
  await db.doc('config/bot').update({ anthropicKey: FieldValue.delete() });
  assert.deepEqual((await oficial.doc('config/bot').get()).data(), { endereco: 'Rua' });
});

test('update falha se o documento não existe (como o SDK oficial)', async () => {
  await assert.rejects(() => db.doc('t/fantasma').update({ a: 1 }), /NOT_FOUND|404|No document/i);
});

test('update com caminho pontilhado mexe só no campo aninhado', async () => {
  await db.doc('t/5').set({ a: { x: 1, y: 2 } });
  await db.doc('t/5').update({ 'a.y': 99 });
  assert.deepEqual((await oficial.doc('t/5').get()).data(), { a: { x: 1, y: 99 } });
});

test('serverTimestamp e increment', async () => {
  await db.doc('t/6').set({ n: 1 });
  await db.doc('t/6').set({ n: FieldValue.increment(2), quando: FieldValue.serverTimestamp() }, { merge: true });
  const d = (await oficial.doc('t/6').get()).data();
  assert.equal(d.n, 3);
  assert.ok(Math.abs(d.quando.toMillis() - Date.now()) < 60000);
});

test('add() cria com id automático e devolve a referência', async () => {
  const ref = await db.collection('orders').add({ total: 10 });
  assert.match(ref.id, /^[A-Za-z0-9]{20}$/);
  assert.equal((await oficial.doc('orders/' + ref.id).get()).data().total, 10);
});

test('consultas: ==, >=, in, várias condições juntas, orderBy desc e limit', async () => {
  for (const [id, estado, n] of [['a', 'novo', 1], ['b', 'montando_pedido', 2], ['c', 'fechado', 3], ['d', 'novo', 4]]) await oficial.doc('bot_conversas/' + id).set({ estado, n });
  const em = await db.collection('bot_conversas').where('estado', 'in', ['novo', 'montando_pedido', 'aguardando_confirmacao']).get();
  assert.deepEqual(em.docs.map((d) => d.id).sort(), ['a', 'b', 'd']);
  const comp = await db.collection('bot_conversas').where('estado', '==', 'novo').where('n', '>=', 2).get();
  assert.deepEqual(comp.docs.map((d) => d.id), ['d']);
  const ord = await db.collection('bot_conversas').orderBy('n', 'desc').limit(2).get();
  assert.deepEqual(ord.docs.map((d) => d.id), ['d', 'c']);
  assert.equal((await db.collection('bot_conversas').where('estado', '==', 'nada').get()).empty, true);
});

test('subcoleção (conversa do bot): add com serverTimestamp, orderBy desc + limit, e doc.ref.collection', async () => {
  const conv = db.collection('bot_conversas').doc('5515999990000');
  await conv.set({ estado: 'novo' });
  for (const texto of ['um', 'dois', 'três']) {
    await conv.collection('mensagens').add({ remetente: 'cliente', texto, timestamp: FieldValue.serverTimestamp() });
    await new Promise((r) => setTimeout(r, 15));
  }
  const ultimas = await conv.collection('mensagens').orderBy('timestamp', 'desc').limit(2).get();
  assert.deepEqual(ultimas.docs.reverse().map((d) => d.data().texto), ['dois', 'três']);
  const lista = await db.collection('bot_conversas').where('estado', '==', 'novo').get();
  await lista.docs[0].ref.collection('mensagens').add({ remetente: 'bot', texto: 'lembrete', timestamp: FieldValue.serverTimestamp() });
  assert.equal((await oficial.collection('bot_conversas/5515999990000/mensagens').get()).size, 4);
  await lista.docs[0].ref.set({ lembreteEnviado: true }, { merge: true });
  assert.equal((await oficial.doc('bot_conversas/5515999990000').get()).data().lembreteEnviado, true);
});

test('delete() apaga o documento', async () => {
  await db.doc('t/7').set({ a: 1 });
  await db.doc('t/7').delete();
  assert.equal((await oficial.doc('t/7').get()).exists, false);
});

test('getAll devolve na ordem pedida e marca os que não existem', async () => {
  await db.doc('menu_items/1').set({ name: 'um' });
  await db.doc('menu_items/3').set({ name: 'três' });
  const r = await db.getAll(db.doc('menu_items/3'), db.doc('menu_items/2'), db.doc('menu_items/1'));
  assert.deepEqual(r.map((s) => s.exists), [true, false, true]);
  assert.equal(r[0].data().name, 'três');
});

test('transação: 10 pedidos ao mesmo tempo recebem números diferentes e seguidos (contador do dia)', async () => {
  const ref = db.doc('contadores/pedidos_2026-01-01');
  const pegar = () => db.runTransaction(async (t) => {
    const d = await t.get(ref);
    const atual = (d.exists ? d.data().atual : 0) + 1;
    t.set(ref, { atual }, { merge: true });
    return atual;
  });
  const numeros = await Promise.all(Array.from({ length: 10 }, pegar));
  assert.deepEqual(numeros.sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal((await oficial.doc('contadores/pedidos_2026-01-01').get()).data().atual, 10);
});

test('incrementar(): 30 pedidos simultâneos recebem números únicos e seguidos, e convive com o contador do Caixa (SDK oficial)', async () => {
  const ref = db.doc('contadores/pedidos_2026-02-02');
  await oficial.doc('contadores/pedidos_2026-02-02').set({ atual: 5 });
  const numeros = await Promise.all(Array.from({ length: 30 }, () => db.incrementar(ref, 'atual', 1)));
  assert.deepEqual(numeros.sort((a, b) => a - b), Array.from({ length: 30 }, (_, i) => i + 6));
  assert.equal((await oficial.doc('contadores/pedidos_2026-02-02').get()).data().atual, 35);
  assert.equal(await db.incrementar(db.doc('contadores/novo'), 'atual', 1), 1);
});

test('transação com erro no meio não grava nada', async () => {
  const ref = db.doc('t/8');
  await assert.rejects(() => db.runTransaction(async (t) => { t.set(ref, { a: 1 }); throw new Error('falhou'); }), /falhou/);
  assert.equal((await oficial.doc('t/8').get()).exists, false);
});
