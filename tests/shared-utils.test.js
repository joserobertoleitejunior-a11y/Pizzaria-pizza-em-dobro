// Testes das funções puras de shared/utils.js — regra de negócio crítica
// (combo, categoria de pagamento, ranking de sabores). Roda com `node --test`,
// sem dependência nova (padrão da agência: sem build step desnecessário).
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  fmt,
  categoriaPagamento,
  _normalizarCategoriaCardapio,
  COMBOS_DEFAULT,
  resolverFaixaCombo,
  decomporSaboresItem,
  pizzasFisicasPorItem,
  limiteDiaBrasilia,
} = require('../shared/utils.js');

test('fmt formata em real brasileiro', () => {
  assert.equal(fmt(65), 'R$ 65,00');
  assert.equal(fmt(9.5), 'R$ 9,50');
  assert.equal(fmt(null), 'R$ 0,00');
});

test('categoriaPagamento agrupa nas 4 categorias padrão', () => {
  assert.equal(categoriaPagamento('Cartão de Crédito'), 'Cartão de Crédito');
  assert.equal(categoriaPagamento('debito'), 'Cartão de Débito');
  assert.equal(categoriaPagamento('pix'), 'Pix');
  assert.equal(categoriaPagamento('Dinheiro'), 'Dinheiro');
  assert.equal(categoriaPagamento(''), 'Não informado');
});

test('_normalizarCategoriaCardapio aceita código e palavra em português', () => {
  assert.equal(_normalizarCategoriaCardapio('p'), 'p');
  assert.equal(_normalizarCategoriaCardapio('doces'), 'dw');
  assert.equal(_normalizarCategoriaCardapio('combo'), 'co');
  assert.equal(_normalizarCategoriaCardapio('categoria-inexistente'), 'p'); // nunca deixa item sumir
});

test('resolverFaixaCombo resolve sozinho quando os 2 sabores só existem numa faixa', () => {
  const c = resolverFaixaCombo('Mussarela', 'Calabresa', null);
  assert.equal(c.id, 'combo65');
});

test('resolverFaixaCombo NUNCA adivinha quando o sabor existe em mais de uma faixa (Bacon: 80 e 85)', () => {
  assert.equal(resolverFaixaCombo('Bacon', 'Bacon', null), null); // mesmo sabor nos 2 lados
  const semFaixa = resolverFaixaCombo('Bacon', 'Peperone', null); // Peperone só existe em 85 → resolve
  assert.equal(semFaixa.id, 'combo85');
});

test('resolverFaixaCombo usa a faixa explícita quando ela bate com os 2 sabores', () => {
  const c = resolverFaixaCombo('Portuguesa', 'Toscana', 80);
  assert.equal(c.id, 'combo80');
});

test('resolverFaixaCombo ignora faixa explícita que não bate e cai no fallback único', () => {
  const c = resolverFaixaCombo('Portuguesa', 'Toscana', 65); // 65 não tem esses sabores
  assert.equal(c.id, 'combo80');
});

test('COMBOS_DEFAULT continua com as 4 faixas (contrato usado pelo site/Caixa/bot)', () => {
  assert.equal(COMBOS_DEFAULT.length, 4);
  assert.deepEqual(COMBOS_DEFAULT.map(c => c.preco), [65, 75, 80, 85]);
});

test('decomporSaboresItem separa combo nos 2 sabores reais', () => {
  assert.deepEqual(
    decomporSaboresItem('2 Por R$ 65,00 — Mussarela + Calabresa'),
    ['Mussarela', 'Calabresa']
  );
});

test('decomporSaboresItem separa meio a meio nos 2 sabores reais', () => {
  assert.deepEqual(
    decomporSaboresItem('Meio a Meio: Toscana / Frango Catupiry'),
    ['Toscana', 'Frango Catupiry']
  );
});

test('decomporSaboresItem devolve item normal como está', () => {
  assert.deepEqual(decomporSaboresItem('Toscana'), ['Toscana']);
  assert.deepEqual(decomporSaboresItem(''), []);
  assert.deepEqual(decomporSaboresItem(null), []);
});

test('pizzasFisicasPorItem: combo conta 2 pizzas, meio a meio e normal contam 1', () => {
  assert.equal(pizzasFisicasPorItem('2 Por R$ 65,00 — Mussarela + Calabresa'), 2);
  assert.equal(pizzasFisicasPorItem('Meio a Meio: Toscana / Frango Catupiry'), 1);
  assert.equal(pizzasFisicasPorItem('Toscana'), 1);
});

test('limiteDiaBrasilia: pedido da véspera às 21h-23h59 NUNCA entra em "hoje" (bug real corrigido)', () => {
  // comparação de STRING (o que o Firestore faz de verdade) contra o valor real gravado
  // por new Date().toISOString() — antes o limite era construído como "AAAA-MM-DDT00:00:00-03:00"
  // e comparado direto, o que incluía pedidos da véspera feitos entre 21h e 23h59 (Brasília)
  const pedidoVespera2130 = new Date('2026-08-14T21:30:00-03:00').toISOString();
  const pedidoHoje1810 = new Date('2026-08-15T18:10:00-03:00').toISOString();
  const limiteHoje = limiteDiaBrasilia('2026-08-15');

  assert.equal(pedidoVespera2130 >= limiteHoje, false, 'pedido da véspera não pode contar como hoje');
  assert.equal(pedidoHoje1810 >= limiteHoje, true, 'pedido de hoje precisa contar como hoje');
});

test('limiteDiaBrasilia: fim do dia inclui até 23:59:59.999 de Brasília', () => {
  const fimDoDia = limiteDiaBrasilia('2026-08-15', true);
  const pedido2359 = new Date('2026-08-15T23:59:58-03:00').toISOString();
  const pedidoProximoDia = new Date('2026-08-16T00:00:01-03:00').toISOString();
  assert.equal(pedido2359 <= fimDoDia, true);
  assert.equal(pedidoProximoDia <= fimDoDia, false);
});
