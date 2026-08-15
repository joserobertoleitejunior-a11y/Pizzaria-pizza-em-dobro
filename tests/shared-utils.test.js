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
