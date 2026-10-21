const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { COMBOS_DEFAULT } = require('../shared/utils.js');

// funções puras do Conversor (caixa/js/colar-pedido.js)
const src = fs.readFileSync(__dirname + '/../caixa/js/colar-pedido.js', 'utf8');
const trecho = src.slice(src.indexOf('function _normNome'), src.indexOf('function montarCaixaComPedidoInterpretado'));
const { resolverComboConversor, combosDeAvulsas } = new Function('COMBOS_DEFAULT', 'DEFAULT_MENU', 'BORDAS_DEFAULT', 'ACRESCIMOS_DEFAULT', 'ESFIHA_SABORES',
  trecho + '; return { resolverComboConversor, combosDeAvulsas };')(COMBOS_DEFAULT, [], [], [], []);

test('combo: nomes do cardápio e com erro de digitação casam com os sabores do combo', () => {
  assert.equal(resolverComboConversor('Quatro Queijos', 'Portuguesa').combo.preco, 80);
  assert.equal(resolverComboConversor('4 queijos', 'bauru').combo.preco, 80);
  assert.equal(resolverComboConversor('brocolis com bacon', 'Atum').combo.preco, 85);
  assert.equal(resolverComboConversor('calabreza', 'mussarela').combo.preco, 65);
  assert.equal(resolverComboConversor('frango catupiry', 'MILHO').combo.preco, 75);
});
test('combo: mesmo sabor nas duas pizzas vale', () => {
  const r = resolverComboConversor('Calabresa', 'Calabresa');
  assert.equal(r.combo.preco, 65); assert.equal(r.s1, 'Calabresa'); assert.equal(r.s2, 'Calabresa');
});
test('combo: faixa falada pelo cliente manda; sabor em 2 faixas fica com a mais barata', () => {
  assert.equal(resolverComboConversor('Bacon', 'Toscana Piry', 85).combo.preco, 85);
  assert.equal(resolverComboConversor('Bacon', 'Bacon').combo.preco, 80);
});
test('combo: sabores de faixas diferentes → faixa da pizza mais cara, com aviso', () => {
  const r = resolverComboConversor('Calabresa', 'Frango Catupiry');
  assert.equal(r.combo.preco, 75); assert.match(r.aviso, /faixas diferentes/);
});
test('combo: sabor que não é de combo não vira combo', () => {
  assert.equal(resolverComboConversor('Baiana', 'Calabresa'), null);
});
test('cliente pediu combo mas a IA devolveu 2 pizzas avulsas → vira 1 combo', () => {
  const r = combosDeAvulsas([{ tipo: 'normal', nome_cardapio: 'Calabresa', qtd: 1 }, { tipo: 'normal', nome_cardapio: 'Mussarela', qtd: 1 }, { tipo: 'normal', nome_cardapio: 'Coca-Cola 2L', qtd: 1 }],
    'quero o combo de 65, uma calabresa e uma mussarela e uma coca');
  assert.equal(r.filter(i => i.tipo === 'combo').length, 1);
  assert.equal(r.find(i => i.tipo === 'combo').combo_faixa, 65);
  assert.ok(r.some(i => i.nome_cardapio === 'Coca-Cola 2L'));
  const r2 = combosDeAvulsas([{ tipo: 'normal', nome_cardapio: 'Calabresa', qtd: 2 }], '2 por 65 de calabresa');
  assert.equal(r2.length, 1); assert.equal(r2[0].nome_cardapio_2, 'Calabresa');
});
test('sem falar em combo, pizzas avulsas continuam avulsas (e combo de esfiha/broto não conta)', () => {
  const itens = [{ tipo: 'normal', nome_cardapio: 'Calabresa', qtd: 1 }, { tipo: 'normal', nome_cardapio: 'Mussarela', qtd: 1 }];
  assert.equal(combosDeAvulsas(itens, 'uma calabresa e uma mussarela').filter(i => i.tipo === 'combo').length, 0);
  assert.equal(combosDeAvulsas(itens, 'combo de 10 esfihas, uma calabresa e uma mussarela').filter(i => i.tipo === 'combo').length, 0);
});
