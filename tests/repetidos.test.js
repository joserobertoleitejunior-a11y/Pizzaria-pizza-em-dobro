const test = require('node:test');
const assert = require('node:assert/strict');
const { acharPedidoRepetido, pedidoIdentico } = require('../shared/utils.js');

const h = (hhmm) => '2026-10-31T' + hhmm + ':00-03:00';
const ped = (id, hhmm, nome, total, itens, extra) => ({ id, created_at: h(hhmm), client_name: nome, total, items_json: itens.map((n) => ({ name: n, qty: 1 })), ...(extra || {}) });

// os casos reais de 31/10 que o assistente apontou
const dia = [
  ped('a', '18:53', 'Lionet', 65, ['2 Por R$ 65,00 — Mussarela + Calabresa'], { numero_sequencial: 3 }),
  ped('b', '19:04', 'Lionet', 75.99, ['2 Por R$ 65,00 — Mussarela + Calabresa', 'Tubaína 2L'], { numero_sequencial: 4 }),
  ped('c', '21:01', 'Selma', 48.99, ['Meio a Meio: Portuguesa / Quatro Queijos'], { numero_sequencial: 17 }),
  ped('d', '21:05', 'Selma', 59.98, ['Meio a Meio: Portuguesa / Quatro Queijos', 'Tubaína 2L'], { numero_sequencial: 18 }),
  ped('e', '20:12', 'Heeh', 58.99, ['x']),
  ped('f', '20:26', 'Alex', 48.99, ['y'])
];

test('acha a repetição do mesmo cliente em até 20 min (Lionet e Selma de 31/10)', () => {
  assert.equal(acharPedidoRepetido(dia[1], dia, 20).id, 'a');
  assert.equal(acharPedidoRepetido(dia[3], dia, 20).id, 'c');
  assert.equal(acharPedidoRepetido(dia[0], dia, 20), null, 'o primeiro não é repetição de ninguém');
  assert.equal(acharPedidoRepetido(dia[5], dia, 20), null, 'clientes diferentes não contam');
});
test('fora da janela, cancelado ou nome genérico não conta como repetido', () => {
  const longe = [ped('x', '18:00', 'Ana', 40, ['z']), ped('y', '18:30', 'Ana', 40, ['z'])];
  assert.equal(acharPedidoRepetido(longe[1], longe, 20), null);
  const cancel = [ped('x', '18:00', 'Ana', 40, ['z'], { status: 'cancelado' }), ped('y', '18:05', 'Ana', 40, ['z'])];
  assert.equal(acharPedidoRepetido(cancel[1], cancel, 20), null);
  const gen = [ped('x', '18:00', 'Cliente WhatsApp', 40, ['z']), ped('y', '18:05', 'Cliente WhatsApp', 40, ['w'])];
  assert.equal(acharPedidoRepetido(gen[1], gen, 20), null);
});
test('telefone manda mais que o nome (formatos diferentes do mesmo número)', () => {
  const t = [ped('x', '18:00', 'Zé', 40, ['z'], { client_phone: '(15) 99668-8070' }), ped('y', '18:05', 'José Roberto', 52, ['z', 'Coca'], { client_phone: '15996688070' })];
  assert.equal(acharPedidoRepetido(t[1], t, 20).id, 'x');
  const outro = [ped('x', '18:00', 'Zé', 40, ['z'], { client_phone: '15996688070' }), ped('y', '18:05', 'Zé', 40, ['z'], { client_phone: '15991112222' })];
  assert.equal(acharPedidoRepetido(outro[1], outro, 20), null, 'mesmo nome, telefones diferentes = pessoas diferentes');
});
test('pedido idêntico (duplo toque) x atualização (acrescentou bebida)', () => {
  assert.equal(pedidoIdentico(dia[0], { ...dia[0], id: 'z' }), true);
  assert.equal(pedidoIdentico(dia[0], dia[1]), false);
});
