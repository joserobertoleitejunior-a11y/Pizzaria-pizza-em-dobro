const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { esfDistribuirPadrao } = require('../shared/utils.js');

// extrai só a função pura do arquivo do navegador
const src = fs.readFileSync(__dirname + '/../caixa/js/colar-pedido.js', 'utf8');
const trecho = src.slice(src.indexOf('function consolidarBrotos'), src.indexOf('function montarCaixaComPedidoInterpretado'));
const consolidarBrotos = new Function(trecho + '; return consolidarBrotos;')();
const par = (r) => r.map((x) => x.nome_cardapio + '+' + x.nome_cardapio_2);

test('duas brotos de sabores diferentes viram UM combo com os dois sabores', () => {
  const r = consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'Calabresa', qtd: 1 }, { tipo: 'broto', nome_cardapio: 'Mussarela', qtd: 1 }]);
  assert.deepEqual(par(r), ['Calabresa+Mussarela']);
});
test('2 brotos do mesmo sabor = 1 combo; 4 brotos = 2 combos', () => {
  assert.deepEqual(par(consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'Calabresa', qtd: 2 }])), ['Calabresa+Calabresa']);
  assert.equal(consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'A', qtd: 2 }, { tipo: 'broto', nome_cardapio: 'B', qtd: 2 }]).length, 2);
});
test('par já completo da IA e outros itens são preservados', () => {
  const r = consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'A', nome_cardapio_2: 'B', qtd: 1 }, { tipo: 'normal', nome_cardapio: 'Kuat 2L', qtd: 1 }]);
  assert.equal(r.length, 2); assert.equal(r[1].tipo, 'normal');
});
test('quantidade ímpar de brotos avisa', () => {
  assert.equal(consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'A', qtd: 3 }]).brotoSobra, true);
});
test('esfihas sem sabor usam os sabores padrão do site', () => {
  const d = esfDistribuirPadrao(10);
  assert.equal(Object.values(d).reduce((a, b) => a + b, 0), 10);
  assert.equal(d.Carne, 2); assert.equal(d.Mista, 1);
  assert.equal(Object.values(esfDistribuirPadrao(30)).every((v) => v === 5), true);
  assert.equal(esfDistribuirPadrao(10, { Carne: 5 }).Carne, 6); // completa o que faltou
});

test('broto doce ou sem sabor não entra no combo de R$ 50', () => {
  const valido = (n) => /calabresa|mussarela/i.test(n);
  const r = consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'Pizza Doce Brigadeiro', qtd: 1 }, { tipo: 'broto', nome_cardapio: null, qtd: 1 }], valido);
  assert.equal(r.filter((x) => x.tipo === 'broto').length, 0);
  assert.equal(r.filter((x) => x.tipo === 'normal').length, 2);
  assert.match(r[0].observacao, /BROTO/);
  const r2 = consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'Calabresa', qtd: 1 }, { tipo: 'broto', nome_cardapio: 'Mussarela', qtd: 1 }, { tipo: 'broto', nome_cardapio: 'Doce X', qtd: 1 }], valido);
  assert.equal(r2.filter((x) => x.tipo === 'broto').length, 1); // calabresa+mussarela = 1 combo
});
